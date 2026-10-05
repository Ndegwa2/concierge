from flask import Flask, request, g, jsonify, redirect
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_compress import Compress
from flask_wtf.csrf import CSRFProtect
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from sqlalchemy.pool import Pool
import os
import logging
import uuid
from datetime import datetime, timedelta, timezone

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
compress = Compress()
csrf = CSRFProtect()

logger = logging.getLogger(__name__)

# Rate limiter using Redis in production, memory fallback for dev
_is_dev = os.environ.get('FLASK_ENV') == 'development'
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"] if not _is_dev else ["1000 per day", "1000 per hour"],
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

    # Match both "/api/x" and "/api/x/" instead of answering a 308 redirect.
    # Endpoints declared as route('/') (e.g. /api/notifications/) redirect any
    # client that omits the trailing slash, and the redirect Location is built
    # from the Host this process sees - behind a dev proxy that rewrites Host
    # (Vite changeOrigin) that is the backend origin, so the browser treats the
    # redirect as cross-origin and drops the Authorization header. The retried
    # request then arrives unauthenticated and answers 401, which the SPA reads
    # as "session expired" and uses to sign the user out immediately after
    # login. Must be set before blueprints are registered because Werkzeug
    # binds this flag into each rule when it is added to the map.
    app.url_map.strict_slashes = False
    
    # Configuration
    if config_class is None:
        app.config.from_mapping(
                SECRET_KEY=os.environ.get('SECRET_KEY'),
                SQLALCHEMY_DATABASE_URI=os.environ.get('DATABASE_URL'),
                SQLALCHEMY_TRACK_MODIFICATIONS=False,
                JWT_SECRET_KEY=os.environ.get('JWT_SECRET_KEY'),
                MAX_CONTENT_LENGTH=int(os.environ.get('MAX_CONTENT_LENGTH', str(100 * 1024 * 1024))),
                PROOF_OF_WORK_UPLOAD_FOLDER=os.environ.get('PROOF_OF_WORK_UPLOAD_FOLDER') or os.path.join(os.getcwd(), 'uploads', 'proof_of_work'),
                CHAT_IMAGE_UPLOAD_FOLDER=os.environ.get('CHAT_IMAGE_UPLOAD_FOLDER') or os.path.join(os.getcwd(), 'uploads', 'chat_images'),
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
    # Row-Level Security context propagation is opt-in: it is only correct when
    # the app connects as a NON-superuser role with RLS policies installed
    # (see backend/postgresql_setup.sql). Connecting as a table owner or
    # superuser silently bypasses every policy, so claiming RLS without these
    # prerequisites is worse than not claiming it at all.
    app.config['ENABLE_RLS'] = os.environ.get('ENABLE_RLS', 'False').lower() == 'true'

    if app.config.get('BEHIND_PROXY'):
        from werkzeug.middleware.proxy_fix import ProxyFix
        # Trust X-Forwarded-Proto/For/Host from the upstream proxy (e.g. Render)
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

    # Connection pooling options.
    # Size this against *total* connections, not per worker:
    #     workers * (pool_size + max_overflow) <= database connection cap
    # Render's smallest Postgres plans allow ~20-25 connections in total, so
    # the defaults below are deliberately conservative. Raising them without
    # raising the plan (or fronting the DB with PgBouncer) will manifest as
    # "too many clients already" under load.
    # SQLite (tests) uses a pool class that rejects these options, so only apply
    # them to real server-backed databases.
    database_uri = app.config.get('SQLALCHEMY_DATABASE_URI') or ''
    if database_uri.startswith('sqlite'):
        app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {'pool_pre_ping': True}
    else:
        app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
            'pool_size': int(os.environ.get('DB_POOL_SIZE', 5)),
            'max_overflow': int(os.environ.get('DB_MAX_OVERFLOW', 2)),
            'pool_timeout': int(os.environ.get('DB_POOL_TIMEOUT', 30)),
            'pool_recycle': int(os.environ.get('DB_POOL_RECYCLE', 1800)),
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

    # Request size limit — configured above from MAX_CONTENT_LENGTH (env,
    # default 100MB) to allow video proof-of-work uploads.

    # Rate limiting setup
    limiter.init_app(app)
    
    # JWT configuration with token blocklist callback (Redis-backed).
    # Checks the per-token blocklist *and* the per-user revocation marker, so a
    # password/email change or "log out everywhere" also kills refresh tokens
    # that this server never saw (a per-jti blocklist alone cannot).
    from app.utils.cache import is_token_revoked
    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        return is_token_revoked(
            jwt_payload.get('jti'),
            user_id=jwt_payload.get('sub'),
            issued_at=jwt_payload.get('iat'),
        )
    
    # Email configuration
    app.config['MAIL_SERVER'] = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
    app.config['MAIL_PORT'] = int(os.environ.get('MAIL_PORT', 587))
    app.config['MAIL_USE_TLS'] = os.environ.get('MAIL_USE_TLS', 'True').lower() == 'true'
    app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME')
    app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD')
    app.config['MAIL_DEFAULT_SENDER'] = os.environ.get('MAIL_DEFAULT_SENDER') or os.environ.get('MAIL_USERNAME')

    app.config['ONBOARDING_LEAD_NAME'] = os.environ.get('ONBOARDING_LEAD_NAME', 'AutoConcierge Operations Team')
    app.config['ONBOARDING_LEAD_PHONE'] = os.environ.get('ONBOARDING_LEAD_PHONE', 'Please reply to this email')
    app.config['ONBOARDING_LEAD_EMAIL'] = os.environ.get('ONBOARDING_LEAD_EMAIL') or app.config['MAIL_DEFAULT_SENDER'] or app.config['MAIL_USERNAME'] or 'AutoConcierge Support'
    app.config['ONBOARDING_LEAD_WHATSAPP'] = os.environ.get('ONBOARDING_LEAD_WHATSAPP', '')
    app.config['ONBOARDING_SIGNATORY_NAME'] = os.environ.get('ONBOARDING_SIGNATORY_NAME', 'AutoConcierge Team')
    app.config['ONBOARDING_SIGNATORY_TITLE'] = os.environ.get('ONBOARDING_SIGNATORY_TITLE', 'Concierge Operations')
    app.config['ONBOARDING_SIGNATORY_PHONE'] = os.environ.get('ONBOARDING_SIGNATORY_PHONE') or app.config['ONBOARDING_LEAD_PHONE']
    app.config['ONBOARDING_SIGNATORY_EMAIL'] = os.environ.get('ONBOARDING_SIGNATORY_EMAIL') or app.config['ONBOARDING_LEAD_EMAIL']
    app.config['ONBOARDING_WEBSITE'] = os.environ.get('ONBOARDING_WEBSITE', '')
    app.config['ONBOARDING_OPERATING_HOURS'] = os.environ.get('ONBOARDING_OPERATING_HOURS', 'Please contact your dedicated concierge lead for current operating hours.')
    app.config['ONBOARDING_EMERGENCY_CONTACT'] = os.environ.get('ONBOARDING_EMERGENCY_CONTACT', 'Contact your dedicated concierge lead or reply to this email for urgent assistance.')
    app.config['WELCOME_PACK_DIR'] = os.environ.get('WELCOME_PACK_DIR') or os.path.join(app.root_path, 'uploads', 'onboarding')
    app.config['WELCOME_PACK_FILENAME'] = os.environ.get('WELCOME_PACK_FILENAME', '')
    app.config['WELCOME_PACK_PATH'] = os.environ.get('WELCOME_PACK_PATH', '')

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
    from app.services.proof_of_work import proof_of_work_bp
    from app.services.documents import documents_bp
    from app.services.pdf import pdf_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(services_bp, url_prefix='/api/services')
    app.register_blueprint(appointments_bp, url_prefix='/api/appointments')
    app.register_blueprint(invoices_bp, url_prefix='/api/appointments')
    app.register_blueprint(vehicles_bp, url_prefix='/api/vehicles')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(employees_bp, url_prefix='/api/employees')
    app.register_blueprint(notifications_bp, url_prefix='/api/notifications')
    app.register_blueprint(partners_bp, url_prefix='/api/partners')
    app.register_blueprint(monitoring_bp, url_prefix='/api/monitoring')
    app.register_blueprint(fleets_bp, url_prefix='/api/fleets')
    app.register_blueprint(ai_chat_bp, url_prefix='/api/ai-chat')
    app.register_blueprint(payments_bp, url_prefix='/api/payments')
    app.register_blueprint(workflow_bp, url_prefix='/api/workflow')
    app.register_blueprint(proof_of_work_bp, url_prefix='/api')
    app.register_blueprint(documents_bp, url_prefix='/api/documents')
    app.register_blueprint(pdf_bp, url_prefix='/api/pdf')

    # CSRF protection strategy:
    # All API endpoints use JWT Bearer tokens sent via the Authorization header.
    # Browsers do NOT automatically include the Authorization header in
    # cross-site requests, so CSRF attacks are not applicable here.
    # CSRFProtect remains initialized for any future form-based (non-JWT)
    # endpoints, but is globally exempted since this is a pure JWT Bearer API.
    csrf.exempt(auth_bp)  # Login/register endpoints: no JWT yet, but use POST body (not cookies)
    csrf.exempt(services_bp)
    csrf.exempt(appointments_bp)
    csrf.exempt(invoices_bp)
    csrf.exempt(vehicles_bp)
    csrf.exempt(admin_bp)
    csrf.exempt(employees_bp)
    csrf.exempt(notifications_bp)
    csrf.exempt(partners_bp)
    csrf.exempt(fleets_bp)
    csrf.exempt(ai_chat_bp)
    csrf.exempt(payments_bp)
    csrf.exempt(workflow_bp)
    csrf.exempt(proof_of_work_bp)
    csrf.exempt(pdf_bp)
    # Documents are a pure JWT Bearer API (no cookies), so CSRF does not apply;
    # the blueprint was previously missing from the exempt list and every
    # POST/PUT returned a blank 400 "CSRF token missing" before authz ran.
    csrf.exempt(documents_bp)

    from app.services.notifications.scheduler import start_scheduler
    start_scheduler(app)

    # Database schema is owned by Alembic (`flask db upgrade`, already run by
    # docker-entrypoint.sh and by the Render build command). The factory used to
    # call db.create_all() + initialize_database() on every process start, which
    # masked migration drift, issued DDL from web/celery/beat workers and could
    # seed demo accounts into an empty production database. Explicit CLI
    # commands now own that work (`flask init-db`, `flask seed-demo-data`).
    # AUTO_INIT_DB=true restores the permissive behaviour for throwaway runs.
    from app.cli import register_cli
    register_cli(app)
    if os.environ.get('AUTO_INIT_DB', 'false').lower() == 'true':
        with app.app_context():
            from app.cli import init_db_impl
            init_db_impl(seed_demo=os.environ.get('AUTO_SEED_DEMO', 'false').lower() == 'true')

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
        """Publish request identity for PostgreSQL Row-Level Security policies.

        Only runs when ``ENABLE_RLS=true``. Failures are logged instead of being
        swallowed: a silent failure here looks identical to "RLS is protecting
        me" while every policy is in fact a no-op.
        """
        if not app.config.get('ENABLE_RLS'):
            return None
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
        except Exception as exc:
            # Most likely causes: the connection has autocommit semantics that
            # drop SET LOCAL, or the DB role cannot set custom GUCs. Either way
            # RLS is NOT active for this request - say so loudly.
            logger.warning('RLS context could not be set for %s: %s', request.path, exc)

    @app.after_request
    def after_request(response):
        """Add security headers and request ID to response headers"""
        response.headers['X-Request-ID'] = g.get('request_id', 'unknown')
        # Security headers
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response.headers['Permissions-Policy'] = 'geolocation=(), camera=(), microphone=()'
        # HSTS: only meaningful when the browser actually reached us over TLS
        # (directly or through a proxy that terminates it).
        if request.is_secure or app.config.get('ENFORCE_HTTPS') or app.config.get('BEHIND_PROXY'):
            response.headers.setdefault(
                'Strict-Transport-Security',
                'max-age=63072000; includeSubDomains; preload'
            )
        # Authenticated API responses must never be stored by intermediaries.
        if request.path.startswith('/api') and request.headers.get('Authorization'):
            response.headers['Cache-Control'] = 'no-store'
        elif request.path.startswith('/api'):
            response.headers.setdefault('Cache-Control', 'no-store')
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
    
    @app.route('/api/health/db', methods=['GET'])
    def db_health_check():
        """Liveness/readiness probe.

        Pool internals (size, checked-out, overflow) are operational details;
        they are only returned to an authenticated administrator so the endpoint
        cannot be used for reconnaissance.
        """
        try:
            db.session.execute(db.text('SELECT 1'))
        except Exception as e:
            logger.error(str(e), exc_info=True)
            return jsonify({
                'success': False,
                'status': 'unhealthy',
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'request_id': g.get('request_id', 'unknown')
            }), 503

        payload = {
            'success': True,
            'status': 'healthy',
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'request_id': g.get('request_id', 'unknown')
        }

        if _is_admin_request():
            pool_info = {}
            try:
                pool = db.engine.pool
                # ``QueuePool`` (and its bases) expose size/checkedin/
                # checkedout/overflow, but the *stubs* only declare these on
                # the ``QueuePool`` subclass -- ``db.engine.pool`` is typed as
                # the generic ``Pool`` base, whose stubs do not list them, so a
                # direct attribute access is a static type error and pyright
                # cannot narrow on a ``hasattr`` guard. Route the lookup through
                # ``getattr`` and only invoke the value when it is callable so
                # the runtime safety of the original hasattr checks is kept.
                def _pool_stat(name: str) -> object:
                    fn = getattr(pool, name, None)
                    return fn() if callable(fn) else 'unknown'
                pool_info['pool_size'] = _pool_stat('size')
                pool_info['checkedin'] = _pool_stat('checkedin')
                pool_info['checkedout'] = _pool_stat('checkedout')
                pool_info['overflow'] = _pool_stat('overflow')
            except Exception:
                pool_info['pool_details'] = 'unavailable'
            payload['database'] = pool_info

        return jsonify(payload), 200

    return app


def _is_admin_request() -> bool:
    """True when the current request carries an admin JWT (never raises)."""
    try:
        from flask_jwt_extended import verify_jwt_in_request, get_jwt
        verify_jwt_in_request()
        return get_jwt().get('role') in ('admin', 'super_admin')
    except Exception:
        return False
