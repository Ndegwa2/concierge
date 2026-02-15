from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app import db
from app.models import User, Admin
from datetime import timedelta

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user"""
    try:
        data = request.get_json()
        
        # Validate input
        if not all(key in data for key in ['name', 'email', 'password']):
            return jsonify({
                'success': False,
                'message': 'Missing required fields'
            }), 400
        
        # Check if user already exists
        if User.query.filter_by(email=data['email']).first():
            return jsonify({
                'success': False,
                'message': 'Email already registered'
            }), 409
        
        # Create new user
        user = User()
        user.name = data['name']
        user.email = data['email']
        user.set_password(data['password'])
        
        if 'phone' in data:
            user.phone = data['phone']
        
        if 'address' in data:
            user.address = data['address']
        
        db.session.add(user)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'User registered successfully',
            'data': {
                'user': user.to_dict()
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Registration failed',
            'error': str(e)
        }), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """User login"""
    try:
        data = request.get_json()
        
        # Validate input
        if not all(key in data for key in ['email', 'password']):
            return jsonify({
                'success': False,
                'message': 'Missing required fields'
            }), 400
        
        # Find user by email
        user = User.query.filter_by(email=data['email']).first()
        
        # Check if user exists and password is correct
        if not user or not user.check_password(data['password']):
            return jsonify({
                'success': False,
                'message': 'Invalid email or password'
            }), 401
        
        # Create access token with 24 hour expiration
        access_token = create_access_token(
            identity={
                'id': user.id,
                'email': user.email,
                'role': user.role
            },
            expires_delta=timedelta(hours=24)
        )
        
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'data': {
                'access_token': access_token,
                'user': user.to_dict()
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Login failed',
            'error': str(e)
        }), 500

@auth_bp.route('/admin/login', methods=['POST'])
def admin_login():
    """Admin login"""
    try:
        data = request.get_json()
        
        # Validate input
        if not all(key in data for key in ['email', 'password']):
            return jsonify({
                'success': False,
                'message': 'Missing required fields'
            }), 400
        
        # Find admin by email
        admin = Admin.query.filter_by(email=data['email']).first()
        
        # Check if admin exists and password is correct
        if not admin or not admin.check_password(data['password']):
            return jsonify({
                'success': False,
                'message': 'Invalid admin credentials'
            }), 401
        
        # Create access token with 24 hour expiration
        access_token = create_access_token(
            identity={
                'id': admin.id,
                'email': admin.email,
                'role': admin.role
            },
            expires_delta=timedelta(hours=24)
        )
        
        return jsonify({
            'success': True,
            'message': 'Admin login successful',
            'data': {
                'access_token': access_token,
                'admin': admin.to_dict()
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Login failed',
            'error': str(e)
        }), 500

@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    """Get user profile"""
    try:
        current_user = get_jwt_identity()
        
        if current_user['role'] == 'admin':
            user = Admin.query.get(current_user['id'])
        else:
            user = User.query.get(current_user['id'])
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        return jsonify({
            'success': True,
            'data': {
                'user': user.to_dict()
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get profile',
            'error': str(e)
        }), 500

@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    """Update user profile"""
    try:
        current_user = get_jwt_identity()
        data = request.get_json()
        
        if current_user['role'] == 'admin':
            user = Admin.query.get(current_user['id'])
        else:
            user = User.query.get(current_user['id'])
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        if 'name' in data:
            user.name = data['name']
        
        if 'email' in data:
            user.email = data['email']
        
        if 'phone' in data:
            user.phone = data['phone']
        
        if 'address' in data:
            user.address = data['address']
        
        if 'password' in data:
            user.set_password(data['password'])
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Profile updated successfully',
            'data': {
                'user': user.to_dict()
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to update profile',
            'error': str(e)
        }), 500