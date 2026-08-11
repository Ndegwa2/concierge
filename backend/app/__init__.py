from flask import Flask, request, g, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_compress import Compress
from flask_wtf.csrf import CSRFProtect
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from sqlalchemy import func
import os
import uuid
from datetime import datetime, timedelta, timezone

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
compress = Compress()
csrf = CSRFProtect()
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri=os.environ.get("RATELIMIT_STORAGE_URI", "memory://"),
)

# Token blacklist table for persistent logout
class TokenBlocklist(db.Model):
    __tablename__ = 'token_blocklist'
    id = db.Column(db.BigInteger, primary_key=True)
    jti = db.Column(db.String(36), nullable=False, index=True, unique=True)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False, index=True)

def create_app(config_class=None):
    app = Flask(__name__)
    
    # Configuration
    if config_class is None:
        app.config.from_mapping(
                SECRET_KEY=os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production'),
                SQLALCHEMY_DATABASE_URI=os.environ.get('DATABASE_URL'),
                SQLALCHEMY_TRACK_MODIFICATIONS=False,
                JWT_SECRET_KEY=os.environ.get('JWT_SECRET_KEY', 'dev-jwt-secret-key-change-in-production'),
                JWT_ACCESS_TOKEN_EXPIRES=int(os.environ.get('JWT_ACCESS_TOKEN_EXPIRES', 86400)),
                JWT_REFRESH_TOKEN_EXPIRES=int(os.environ.get('JWT_REFRESH_TOKEN_EXPIRES', 2592000)),
                JWT_TOKEN_LOCATION=['headers', 'json'],
                JWT_REFRESH_JSON_KEY='refresh_token',
                JWT_VERIFY_SUB=False
            )
    else:
        app.config.from_object(config_class)

    # Connection pooling options
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
        'pool_size': 20,
        'max_overflow': 0,
        'pool_timeout': 30,
        'pool_recycle': 1800,
        'pool_pre_ping': True,
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
    CORS(app)
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
    
    # JWT configuration with token blocklist callback
    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        jti = jwt_payload["jti"]
        # Check if token is in blocklist and not expired
        return db.session.query(TokenBlocklist.id).filter_by(jti=jti).filter(
            TokenBlocklist.expires_at > datetime.now(timezone.utc)
        ).scalar() is not None
    
    # Email configuration
    app.config['MAIL_SERVER'] = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
    app.config['MAIL_PORT'] = int(os.environ.get('MAIL_PORT', 587))
    app.config['MAIL_USE_TLS'] = os.environ.get('MAIL_USE_TLS', 'True').lower() == 'true'
    app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME')
    app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD')
    app.config['MAIL_DEFAULT_SENDER'] = os.environ.get('MAIL_DEFAULT_SENDER') or os.environ.get('MAIL_USERNAME')
    
    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.services import services_bp
    from app.routes.appointments import appointments_bp
    from app.routes.invoices import invoices_bp
    from app.routes.vehicles import vehicles_bp
    from app.routes.admin import admin_bp
    from app.routes.employees import employees_bp
    from app.routes.partners import partners_bp
    from app.routes.monitoring import monitoring_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    csrf.exempt(auth_bp)  # JWT-based API: no session cookies, CSRF not needed for auth endpoints
    app.register_blueprint(services_bp, url_prefix='/api/services')
    app.register_blueprint(appointments_bp, url_prefix='/api/appointments')
    app.register_blueprint(invoices_bp, url_prefix='/api/invoices')
    app.register_blueprint(vehicles_bp, url_prefix='/api/vehicles')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(employees_bp, url_prefix='/api/employees')
    app.register_blueprint(partners_bp, url_prefix='/api/partners')
    app.register_blueprint(monitoring_bp, url_prefix='/api/monitoring')

    # JWT-based API: CSRF protection not needed for any API blueprint
    for bp in [services_bp, appointments_bp, invoices_bp, vehicles_bp,
               admin_bp, employees_bp, partners_bp, monitoring_bp]:
        csrf.exempt(bp)
    
    # Create database tables if they don't exist
    with app.app_context():
        db.create_all()
        from app.utils.db_initializer import initialize_database
        initialize_database()
    
    @app.before_request
    def before_request():
        """Generate request ID for tracking"""
        g.request_id = str(uuid.uuid4())
    
    @app.after_request
    def after_request(response):
        """Add request ID to response headers"""
        response.headers['X-Request-ID'] = g.get('request_id', 'unknown')
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
