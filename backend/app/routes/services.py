from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Service, DiscountCode
from datetime import datetime

services_bp = Blueprint('services', __name__)

@services_bp.route('/', methods=['GET'])
def get_services():
    """Get all active services"""
    try:
        # Get query parameters
        category = request.args.get('category')
        min_price = request.args.get('min_price')
        max_price = request.args.get('max_price')
        search = request.args.get('search')
        
        # Build query
        query = Service.query.filter_by(is_active=True)
        
        if category:
            query = query.filter(Service.category == category)
        
        if min_price:
            query = query.filter(Service.price >= float(min_price))
        
        if max_price:
            query = query.filter(Service.price <= float(max_price))
        
        if search:
            query = query.filter(Service.name.ilike(f'%{search}%') | Service.description.ilike(f'%{search}%'))
        
        # Get services
        services = query.all()
        
        return jsonify({
            'success': True,
            'data': {
                'services': [service.to_dict() for service in services],
                'count': len(services)
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get services',
            'error': str(e)
        }), 500

@services_bp.route('/<int:service_id>', methods=['GET'])
def get_service(service_id):
    """Get a single service by ID"""
    try:
        service = Service.query.get(service_id)
        
        if not service or not service.is_active:
            return jsonify({
                'success': False,
                'message': 'Service not found'
            }), 404
        
        return jsonify({
            'success': True,
            'data': {
                'service': service.to_dict()
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get service',
            'error': str(e)
        }), 500

@services_bp.route('/categories', methods=['GET'])
def get_categories():
    """Get all service categories"""
    try:
        categories = db.session.query(Service.category).filter_by(is_active=True).distinct().all()
        categories_list = [category[0] for category in categories if category[0]]
        
        return jsonify({
            'success': True,
            'data': {
                'categories': categories_list,
                'count': len(categories_list)
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get categories',
            'error': str(e)
        }), 500

@services_bp.route('/discounts', methods=['GET'])
def get_discounts():
    """Get active discount codes"""
    try:
        current_date = datetime.utcnow()
        discounts = DiscountCode.query.filter(
            DiscountCode.is_active == True,
            DiscountCode.start_date <= current_date,
            DiscountCode.end_date >= current_date,
            DiscountCode.used_count < DiscountCode.max_uses
        ).all()
        
        return jsonify({
            'success': True,
            'data': {
                'discounts': [discount.to_dict() for discount in discounts],
                'count': len(discounts)
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get discounts',
            'error': str(e)
        }), 500

@services_bp.route('/discounts/<code>', methods=['GET'])
def get_discount(code):
    """Get discount code details"""
    try:
        current_date = datetime.utcnow()
        discount = DiscountCode.query.filter_by(code=code.upper()).first()
        
        if not discount:
            return jsonify({
                'success': False,
                'message': 'Discount code not found'
            }), 404
        
        if not discount.is_active:
            return jsonify({
                'success': False,
                'message': 'Discount code is inactive'
            }), 400
        
        if discount.start_date > current_date:
            return jsonify({
                'success': False,
                'message': 'Discount code not yet active'
            }), 400
        
        if discount.end_date < current_date:
            return jsonify({
                'success': False,
                'message': 'Discount code has expired'
            }), 400
        
        if discount.used_count >= discount.max_uses:
            return jsonify({
                'success': False,
                'message': 'Discount code has reached maximum uses'
            }), 400
        
        return jsonify({
            'success': True,
            'data': {
                'discount': discount.to_dict()
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get discount code',
            'error': str(e)
        }), 500

@services_bp.route('/admin/services', methods=['POST'])
@jwt_required()
def create_service():
    """Create a new service (admin only)"""
    try:
        current_user = get_jwt_identity()
        
        if current_user['role'] != 'admin':
            return jsonify({
                'success': False,
                'message': 'Unauthorized access'
            }), 403
        
        data = request.get_json()
        
        # Validate input
        if not all(key in data for key in ['name', 'price', 'duration', 'category']):
            return jsonify({
                'success': False,
                'message': 'Missing required fields'
            }), 400
        
        service = Service()
        service.name = data['name']
        service.description = data.get('description', '')
        service.price = data['price']
        service.duration = data['duration']
        service.category = data['category']
        service.is_active = data.get('is_active', True)
        
        db.session.add(service)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Service created successfully',
            'data': {
                'service': service.to_dict()
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to create service',
            'error': str(e)
        }), 500

@services_bp.route('/admin/services/<int:service_id>', methods=['PUT'])
@jwt_required()
def update_service(service_id):
    """Update a service (admin only)"""
    try:
        current_user = get_jwt_identity()
        
        if current_user['role'] != 'admin':
            return jsonify({
                'success': False,
                'message': 'Unauthorized access'
            }), 403
        
        service = Service.query.get(service_id)
        
        if not service:
            return jsonify({
                'success': False,
                'message': 'Service not found'
            }), 404
        
        data = request.get_json()
        
        if 'name' in data:
            service.name = data['name']
        
        if 'description' in data:
            service.description = data['description']
        
        if 'price' in data:
            service.price = data['price']
        
        if 'duration' in data:
            service.duration = data['duration']
        
        if 'category' in data:
            service.category = data['category']
        
        if 'is_active' in data:
            service.is_active = data['is_active']
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Service updated successfully',
            'data': {
                'service': service.to_dict()
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to update service',
            'error': str(e)
        }), 500

@services_bp.route('/admin/services/<int:service_id>', methods=['DELETE'])
@jwt_required()
def delete_service(service_id):
    """Delete a service (admin only)"""
    try:
        current_user = get_jwt_identity()
        
        if current_user['role'] != 'admin':
            return jsonify({
                'success': False,
                'message': 'Unauthorized access'
            }), 403
        
        service = Service.query.get(service_id)
        
        if not service:
            return jsonify({
                'success': False,
                'message': 'Service not found'
            }), 404
        
        db.session.delete(service)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Service deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to delete service',
            'error': str(e)
        }), 500