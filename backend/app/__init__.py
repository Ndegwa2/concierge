from flask import Flask, request, g
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
                SECRET_KEY=os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production'),
                SQLALCHEMY_DATABASE_URI=os.environ.get('DATABASE_URL'),
                SQLALCHEMY_TRACK_MODIFICATIONS=False,
                JWT_SECRET_KEY=os.environ.get('JWT_SECRET_KEY', 'dev-jwt-secret-key-change-in-production')
            )
    else:
        app.config.from_object(config_class)

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
    CORS(app)
    csrf.init_app(app)
    
    # Request size limit (10MB)
    app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10MB
    
    # Rate limiting setup
    limiter = Limiter(
        key_func=get_remote_address,
        app=app,
        default_limits=["200 per day", "50 per hour"],
        storage_uri="memory://"  # Use Redis in production
    )
    
    # JWT configuration with token blocklist callback
    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        jti = jwt_payload["jti"]
        # Check if token is in blocklist and not expired
        return db.session.query(TokenBlocklist.id).filter_by(jti=jti).filter(
            TokenBlocklist.expires_at > datetime.utcnow()
        ).scalar() is not None
    
    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.services import services_bp
    from app.routes.appointments import appointments_bp
    from app.routes.vehicles import vehicles_bp
    from app.routes.admin import admin_bp
    from app.routes.employees import employees_bp
    from app.routes.partners import partners_bp
    from app.routes.monitoring import monitoring_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(services_bp, url_prefix='/api/services')
    app.register_blueprint(appointments_bp, url_prefix='/api/appointments')
    app.register_blueprint(vehicles_bp, url_prefix='/api/vehicles')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(employees_bp, url_prefix='/api/employees')
    app.register_blueprint(partners_bp, url_prefix='/api/partners')
    app.register_blueprint(monitoring_bp, url_prefix='/api/monitoring')
    
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
