from flask import Flask, request, g, jsonify, redirect
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_compress import Compress
from flask_wtf.csrf import CSRFProtect
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import os
import uuid
from datetime import datetime, timedelta

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
compress = Compress()
csrf = CSRFProtect()

# Rate limiter using Redis in production, memory fallback for dev
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri=os.environ.get('RATELIMIT_STORAGE_URI', os.environ.get('REDIS_URL', 'memory://'))
)

# Token blacklist table for persistent logout
class TokenBlocklist(db.Model):
    __tablename__ = 'token_blocklist'
    id = db.Column(db.Integer, primary_key=True)
    jti = db.Column(db.String(36), nullable=False, index=True, unique=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)

def create_app(config_class=None):
    app = Flask(__name__)
    
    # Configuration
    if config_class is None:
        app.config.from_mapping(
                SECRET_KEY=os.environ.get('SECRET_KEY'),
                SQLALCHEMY_DATABASE_URI=os.environ.get('DATABASE_URL'),
                SQLALCHEMY_TRACK_MODIFICATIONS=False,
                JWT_SECRET_KEY=os.environ.get('JWT_SECRET_KEY'),
                JWT_TOKEN_LOCATION=['headers', 'json'],
                JWT_REFRESH_JSON_KEY='refresh_token',
                # Access tokens expire after 30 minutes (short-lived)
                JWT_ACCESS_TOKEN_EXPIRES=timedelta(minutes=int(os.environ.get('JWT_ACCESS_EXPIRES_MINUTES', 30))),
                # Refresh tokens expire after 7 days by default (configurable)
                JWT_REFRESH_TOKEN_EXPIRES=timedelta(days=int(os.environ.get('JWT_REFRESH_EXPIRES_DAYS', 7)))
            )
    else:
        app.config.from_object(config_class)

    # Verify required secrets are set for non-development environments
    if os.environ.get('FLASK_ENV') != 'development' and \
       (not app.config.get('SECRET_KEY') or not app.config.get('JWT_SECRET_KEY')):
        raise RuntimeError(
            "SECRET_KEY and JWT_SECRET_KEY environment variables must be set "
            "outside of development mode."
        )
    
    # Verify encryption key is set in production
    if not os.environ.get('ENCRYPTION_KEY'):
        raise RuntimeError(
            "ENCRYPTION_KEY environment variable must be set in production. "
            "Generate with: python -c 'import base64; print(base64.urlsafe_b64encode(os.urandom(32)).decode())'"
        )

    # HTTPS enforcement in production
    app.config['ENFORCE_HTTPS'] = os.environ.get('ENFORCE_HTTPS', 'False').lower() == 'true'
    app.config['ENVIRONMENT'] = os.environ.get('FLASK_ENV', 'development')
    app.config['BEHIND_PROXY'] = os.environ.get('BEHIND_PROXY', 'True').lower() == 'true'

    if app.config.get('BEHIND_PROXY'):
        from werkzeug.middleware.proxy_fix import ProxyFix
        # Trust X-Forwarded-Proto/For/Host from the upstream proxy (e.g. Render)
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

    # Connection pooling options
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
        'pool_size': 20,
        'max_overflow': 0,
        'pool_timeout': 30,
        'pool_recycle': 1800,
    }

    # Read replica configuration
    read_replica_url = os.environ.get('DATABASE_READ_URL')
    if read_replica_url:
        app.config['SQLALCHEMY_BINDS'] = {
            'read_replica': read_replica_url
        }
    
    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    # Initialize Redis cache client (with in-memory fallback on connection failure)
    from app.utils.cache import init_redis
    init_redis(app)

    # Initialize Celery
    from app.celery import make_celery
    celery = make_celery(app)
    app.extensions['celery'] = celery

    # CORS - restrict to configured origins (never wide open in production)
    cors_origin = os.environ.get('CORS_ORIGIN', os.environ.get('CORS_ORIGINS', ''))
    cors_origins = [o.strip() for o in cors_origin.split(',') if o.strip()] if cors_origin else []
    if not cors_origins:
        cors_origins = ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173']
    CORS(app, resources={r"/api/*": {"origins": cors_origins}}, supports_credentials=True,
         allow_headers=['Content-Type', 'Authorization'], methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
    csrf.init_app(app)
    
    # JWT default error handlers
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({
            'success': False,
            'message': 'Token has expired',
            'error': 'token_expired'
        }), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(err_str):
        return jsonify({
            'success': False,
            'message': err_str,
            'error': 'invalid_token'
        }), 401

    @jwt.unauthorized_loader
    def missing_token_callback(err_str):
        return jsonify({
            'success': False,
            'message': err_str,
            'error': 'authorization_required'
        }), 401

    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        return jsonify({
            'success': False,
            'message': 'Token has been revoked',
            'error': 'token_revoked'
        }), 401

    @jwt.needs_fresh_token_loader
    def fresh_token_required_callback(jwt_header, jwt_payload):
        return jsonify({
            'success': False,
            'message': 'Fresh token required',
            'error': 'fresh_token_required'
        }), 401

    # Request size limit (10MB)
    app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10MB
    
    # Rate limiting setup
    limiter.init_app(app)
    
    # JWT configuration with token blocklist callback (Redis-backed)
    from app.utils.cache import is_jti_revoked
    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        jti = jwt_payload["jti"]
        return is_jti_revoked(jti)
    
    # Email configuration
    app.config['MAIL_SERVER'] = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
    app.config['MAIL_PORT'] = int(os.environ.get('MAIL_PORT', 587))
    app.config['MAIL_USE_TLS'] = os.environ.get('MAIL_USE_TLS', 'True').lower() == 'true'
    app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME')
    app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD')
    app.config['MAIL_DEFAULT_SENDER'] = os.environ.get('MAIL_DEFAULT_SENDER') or os.environ.get('MAIL_USERNAME')

    # Register blueprints
    from app.services.auth import auth_bp
    from app.services.catalog import services_bp
    from app.services.appointments import appointments_bp
    from app.services.invoices import invoices_bp
    from app.services.vehicles import vehicles_bp
    from app.services.admin import admin_bp
    from app.services.employees import employees_bp
    from app.services.notifications import notifications_bp
    from app.services.partners import partners_bp
    from app.services.monitoring import monitoring_bp
    from app.services.fleets import fleets_bp
    from app.services.ai_chat import ai_chat_bp
    from app.services.payments import payments_bp
    from app.services.workflow import workflow_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    csrf.exempt(auth_bp)  # JWT-based API: no session cookies, CSRF not needed for auth endpoints
    app.register_blueprint(services_bp, url_prefix='/api/services')
    csrf.exempt(services_bp)  # JWT-based API
    app.register_blueprint(appointments_bp, url_prefix='/api/appointments')
    csrf.exempt(appointments_bp)  # JWT-based API
    app.register_blueprint(invoices_bp, url_prefix='/api/appointments')
    csrf.exempt(invoices_bp)  # JWT-based API
    app.register_blueprint(vehicles_bp, url_prefix='/api/vehicles')
    csrf.exempt(vehicles_bp)  # JWT-based API
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    csrf.exempt(admin_bp)  # JWT-based API
    app.register_blueprint(employees_bp, url_prefix='/api/employees')
    csrf.exempt(employees_bp)  # JWT-based API: no session cookies, CSRF not needed for employee endpoints
    app.register_blueprint(notifications_bp, url_prefix='/api/notifications')
    csrf.exempt(notifications_bp)  # JWT-based API
    app.register_blueprint(partners_bp, url_prefix='/api/partners')
    csrf.exempt(partners_bp)  # JWT-based API
    app.register_blueprint(monitoring_bp, url_prefix='/api/monitoring')
    app.register_blueprint(fleets_bp, url_prefix='/api/fleets')
    csrf.exempt(fleets_bp)  # JWT-based API
    app.register_blueprint(ai_chat_bp, url_prefix='/api/ai-chat')
    csrf.exempt(ai_chat_bp)  # JWT-based API
    app.register_blueprint(payments_bp, url_prefix='/api/payments')
    csrf.exempt(payments_bp)  # JWT-based API
    app.register_blueprint(workflow_bp, url_prefix='/api/workflow')
    csrf.exempt(workflow_bp)  # JWT-based API

    from app.services.notifications.scheduler import start_scheduler
    start_scheduler(app)
    
    # Create database tables if they don't exist
    with app.app_context():
        db.create_all()
        from app.utils.db_initializer import initialize_database
        initialize_database()
    
    @app.before_request
    def before_request():
        """Generate request ID for tracking"""
        g.request_id = str(uuid.uuid4())

    @app.before_request
    def enforce_https():
        """Redirect HTTP to HTTPS in production."""
        if app.config.get('ENFORCE_HTTPS') and request.url.startswith('http://'):
            return redirect(request.url.replace('http://', 'https://', 1), code=301)
        return None

    @app.before_request
    def set_rls_context():
        """Set PostgreSQL session variables for Row-Level Security policies."""
        if request.method == 'OPTIONS':
            return None

        try:
            from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity, get_jwt
            verify_jwt_in_request(optional=True)
            identity = get_jwt_identity()
            claims = get_jwt() if identity else {}
            if identity:
                user_id = identity
                role = claims.get('role', 'customer')
                db.session.execute(
                    db.text("SET LOCAL request.user_id = :user_id"),
                    {'user_id': user_id}
                )
                db.session.execute(
                    db.text("SET LOCAL request.user_role = :role"),
                    {'role': role}
                )
                db.session.execute(
                    db.text("SET LOCAL request.audit_enabled = 'on'")
                )
                db.session.execute(
                    db.text("SET LOCAL request.ip_address = :ip"),
                    {'ip': request.remote_addr or 'unknown'}
                )
                db.session.execute(
                    db.text("SET LOCAL request.user_agent = :ua"),
                    {'ua': request.headers.get('User-Agent', '')[:255]}
                )
        except Exception:
            pass

    @app.after_request
    def after_request(response):
        """Add security headers and request ID to response headers"""
        response.headers['X-Request-ID'] = g.get('request_id', 'unknown')
        # Security headers
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        # Never cache authenticated responses by default
        response.headers['Cache-Control'] = 'no-store' if request.path.startswith('/api') and \
            any(h.startswith('Bearer') for h in request.headers.get('Authorization', '').split()) else response.headers.get('Cache-Control', '')
        return response
    
    # Health check endpoint
    @app.route('/api/health')
    def health_check():
        return {
            'status': 'healthy',
            'timestamp': os.environ.get('CURRENT_TIMESTAMP', 'Unknown'),
            'service': 'AutoConcierge Backend',
            'request_id': g.get('request_id', 'unknown')
        }, 200
    
    return app
