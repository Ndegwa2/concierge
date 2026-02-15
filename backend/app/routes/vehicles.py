from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Vehicle, User

vehicles_bp = Blueprint('vehicles', __name__)

@vehicles_bp.route('/', methods=['GET'])
@jwt_required()
def get_vehicles():
    """Get user's vehicles"""
    try:
        current_user = get_jwt_identity()
        
        if current_user['role'] == 'admin':
            # Admin gets all vehicles
            vehicles = Vehicle.query.all()
        else:
            # Regular user gets their own vehicles
            vehicles = Vehicle.query.filter_by(user_id=current_user['id']).all()
        
        return jsonify({
            'success': True,
            'data': {
                'vehicles': [vehicle.to_dict() for vehicle in vehicles],
                'count': len(vehicles)
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get vehicles',
            'error': str(e)
        }), 500

@vehicles_bp.route('/<int:vehicle_id>', methods=['GET'])
@jwt_required()
def get_vehicle(vehicle_id):
    """Get a single vehicle"""
    try:
        current_user = get_jwt_identity()
        vehicle = Vehicle.query.get(vehicle_id)
        
        if not vehicle:
            return jsonify({
                'success': False,
                'message': 'Vehicle not found'
            }), 404
        
        # Check access
        if current_user['role'] != 'admin' and vehicle.user_id != current_user['id']:
            return jsonify({
                'success': False,
                'message': 'Unauthorized access'
            }), 403
        
        return jsonify({
            'success': True,
            'data': {
                'vehicle': vehicle.to_dict()
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get vehicle',
            'error': str(e)
        }), 500

@vehicles_bp.route('/', methods=['POST'])
@jwt_required()
def create_vehicle():
    """Create a new vehicle"""
    try:
        current_user = get_jwt_identity()
        data = request.get_json()
        
        # Validate input
        if not all(key in data for key in ['make', 'model']):
            return jsonify({
                'success': False,
                'message': 'Missing required fields'
            }), 400
        
        vehicle = Vehicle()
        vehicle.user_id = current_user['id']
        vehicle.make = data['make']
        vehicle.model = data['model']
        vehicle.year = data.get('year')
        vehicle.color = data.get('color')
        vehicle.license_plate = data.get('license_plate')
        vehicle.vin = data.get('vin')
        vehicle.odometer = data.get('odometer')
        vehicle.is_active = data.get('is_active', True)
        
        db.session.add(vehicle)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Vehicle created successfully',
            'data': {
                'vehicle': vehicle.to_dict()
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to create vehicle',
            'error': str(e)
        }), 500

@vehicles_bp.route('/<int:vehicle_id>', methods=['PUT'])
@jwt_required()
def update_vehicle(vehicle_id):
    """Update a vehicle"""
    try:
        current_user = get_jwt_identity()
        vehicle = Vehicle.query.get(vehicle_id)
        
        if not vehicle:
            return jsonify({
                'success': False,
                'message': 'Vehicle not found'
            }), 404
        
        # Check access
        if current_user['role'] != 'admin' and vehicle.user_id != current_user['id']:
            return jsonify({
                'success': False,
                'message': 'Unauthorized access'
            }), 403
        
        data = request.get_json()
        
        if 'make' in data:
            vehicle.make = data['make']
        
        if 'model' in data:
            vehicle.model = data['model']
        
        if 'year' in data:
            vehicle.year = data['year']
        
        if 'color' in data:
            vehicle.color = data['color']
        
        if 'license_plate' in data:
            vehicle.license_plate = data['license_plate']
        
        if 'vin' in data:
            vehicle.vin = data['vin']
        
        if 'odometer' in data:
            vehicle.odometer = data['odometer']
        
        if 'is_active' in data:
            vehicle.is_active = data['is_active']
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Vehicle updated successfully',
            'data': {
                'vehicle': vehicle.to_dict()
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to update vehicle',
            'error': str(e)
        }), 500

@vehicles_bp.route('/<int:vehicle_id>', methods=['DELETE'])
@jwt_required()
def delete_vehicle(vehicle_id):
    """Delete a vehicle"""
    try:
        current_user = get_jwt_identity()
        vehicle = Vehicle.query.get(vehicle_id)
        
        if not vehicle:
            return jsonify({
                'success': False,
                'message': 'Vehicle not found'
            }), 404
        
        # Check access
        if current_user['role'] != 'admin' and vehicle.user_id != current_user['id']:
            return jsonify({
                'success': False,
                'message': 'Unauthorized access'
            }), 403
        
        db.session.delete(vehicle)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Vehicle deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to delete vehicle',
            'error': str(e)
        }), 500