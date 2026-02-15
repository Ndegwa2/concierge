from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS
import os

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()

def create_app(config_class=None):
    app = Flask(__name__)
    
    # Configuration
    if config_class is None:
        app.config.from_mapping(
            SECRET_KEY=os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production'),
            SQLALCHEMY_DATABASE_URI=os.environ.get('DATABASE_URL', 
                'sqlite:///' + os.path.join(os.path.abspath(os.path.dirname(__file__)), '../../autoconcierge.db')),
            SQLALCHEMY_TRACK_MODIFICATIONS=False,
            JWT_SECRET_KEY=os.environ.get('JWT_SECRET_KEY', 'dev-jwt-secret-key-change-in-production')
        )
    else:
        app.config.from_object(config_class)
    
    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    CORS(app)
    
    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.services import services_bp
    from app.routes.appointments import appointments_bp
    from app.routes.vehicles import vehicles_bp
    from app.routes.admin import admin_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(services_bp, url_prefix='/api/services')
    app.register_blueprint(appointments_bp, url_prefix='/api/appointments')
    app.register_blueprint(vehicles_bp, url_prefix='/api/vehicles')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    
    # Create database tables if they don't exist
    with app.app_context():
        db.create_all()
        from app.utils.db_initializer import initialize_database
        initialize_database()
    
    # Health check endpoint
    @app.route('/api/health')
    def health_check():
        return {
            'status': 'healthy',
            'timestamp': os.environ.get('CURRENT_TIMESTAMP', 'Unknown'),
            'service': 'AutoConcierge Backend'
        }, 200
    
    return app