from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.services.auth.models import User
from app.services.vehicles.models import Vehicle
from app.utils.decorators import get_current_user
from app.utils.cache import cache_get, cache_set, cache_delete_pattern, REDIS_SHORT_TTL
from .service import get_vehicles_query, get_vehicle_by_id, create_vehicle as svc_create_vehicle, update_vehicle as svc_update_vehicle, delete_vehicle as svc_delete_vehicle

vehicles_bp = Blueprint('vehicles', __name__)


@vehicles_bp.route('/', methods=['GET'])
@jwt_required()
def get_vehicles():
    try:
        current_user = get_current_user()

        cache_key = f"vehicles:{current_user['id']}"
        cached = cache_get(cache_key)
        if cached is not None:
            return jsonify(cached), 200

        vehicles = get_vehicles_query(current_user)
        
        result = {
            'success': True,
            'data': {
                'vehicles': [vehicle.to_dict() for vehicle in vehicles],
                'count': len(vehicles)
            }
        }

        cache_set(cache_key, result, REDIS_SHORT_TTL)
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get vehicles',
            'error': str(e)
        }), 500


@vehicles_bp.route('/<int:vehicle_id>', methods=['GET'])
@jwt_required()
def get_vehicle(vehicle_id):
    try:
        current_user = get_current_user()
        vehicle = get_vehicle_by_id(vehicle_id, current_user)
        
        return jsonify({
            'success': True,
            'data': {
                'vehicle': vehicle.to_dict()
            }
        }), 200
        
    except ValueError as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 404 if 'not found' in str(e) else 403
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get vehicle',
            'error': str(e)
        }), 500


@vehicles_bp.route('/', methods=['POST'])
@jwt_required()
def create_vehicle():
    try:
        current_user = get_current_user()
        data = request.get_json()
        
        if not all(key in data for key in ['make', 'model']):
            return jsonify({
                'success': False,
                'message': 'Missing required fields'
            }), 400
        
        vehicle = svc_create_vehicle(current_user['id'], data)
        cache_delete_pattern("vehicles:*")
        
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
    try:
        current_user = get_current_user()
        data = request.get_json()
        
        vehicle = svc_update_vehicle(vehicle_id, current_user, data)
        cache_delete_pattern("vehicles:*")
        
        return jsonify({
            'success': True,
            'message': 'Vehicle updated successfully',
            'data': {
                'vehicle': vehicle.to_dict()
            }
        }), 200
        
    except ValueError as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 404 if 'not found' in str(e) else 403
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
    try:
        current_user = get_current_user()
        svc_delete_vehicle(vehicle_id, current_user)
        cache_delete_pattern("vehicles:*")
        
        return jsonify({
            'success': True,
            'message': 'Vehicle deleted successfully'
        }), 200
        
    except ValueError as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 404 if 'not found' in str(e) else 403
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to delete vehicle',
            'error': str(e)
        }), 500