from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.services.catalog.models import Service, DiscountCode
from app.utils.decorators import admin_required, role_required
from app.utils.cache import cache_get, cache_set, cache_delete, cache_delete_pattern, REDIS_LONG_TTL
from app.utils.db_router import get_read_model_query
from .service import get_services_query, get_categories_query, get_discounts_query, get_discount_by_code_query, create_service as svc_create_service, update_service as svc_update_service, delete_service as svc_delete_service
from datetime import datetime, timezone

services_bp = Blueprint('services', __name__)


@services_bp.route('/', methods=['GET'])
def get_services():
    try:
        cache_key = f"services:all:{request.args.get('category','')}:{request.args.get('min_price','')}:{request.args.get('max_price','')}:{request.args.get('search','')}"
        cached = cache_get(cache_key)
        if cached is not None:
            return jsonify(cached), 200

        category = request.args.get('category')
        min_price = request.args.get('min_price')
        max_price = request.args.get('max_price')
        search = request.args.get('search')
        
        services = get_services_query(category, min_price, max_price, search)
        
        result = jsonify({
            'success': True,
            'data': {
                'services': [service.to_dict() for service in services],
                'count': len(services)
            }
        }), 200

        response = result[0]
        cache_set(cache_key, {
            'success': True,
            'data': {
                'services': [service.to_dict() for service in services],
                'count': len(services)
            }
        }, REDIS_LONG_TTL)

        return result
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get services',
            'error': str(e)
        }), 500


@services_bp.route('/<int:service_id>', methods=['GET'])
def get_service(service_id):
    try:
        cache_key = f"services:{service_id}"
        cached = cache_get(cache_key)
        if cached is not None:
            return jsonify(cached), 200

        service = get_read_model_query(Service).get(service_id)
        
        if not service or not service.is_active:
            return jsonify({
                'success': False,
                'message': 'Service not found'
            }), 404
        
        result = {
            'success': True,
            'data': {
                'service': service.to_dict()
            }
        }

        cache_set(cache_key, result, REDIS_LONG_TTL)

        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get service',
            'error': str(e)
        }), 500


@services_bp.route('/categories', methods=['GET'])
def get_categories():
    try:
        cache_key = "services:categories"
        cached = cache_get(cache_key)
        if cached is not None:
            return jsonify(cached), 200

        categories = get_categories_query()

        result = jsonify({
            'success': True,
            'data': {
                'categories': categories,
                'count': len(categories)
            }
        }), 200

        cache_set(cache_key, {
            'success': True,
            'data': {
                'categories': categories,
                'count': len(categories)
            }
        }, REDIS_LONG_TTL)

        return result
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get categories',
            'error': str(e)
        }), 500


@services_bp.route('/discounts', methods=['GET'])
def get_discounts():
    try:
        cache_key = "services:discounts"
        cached = cache_get(cache_key)
        if cached is not None:
            return jsonify(cached), 200

        discounts = get_discounts_query()

        result = {
            'success': True,
            'data': {
                'discounts': [discount.to_dict() for discount in discounts],
                'count': len(discounts)
            }
        }

        cache_set(cache_key, result, REDIS_LONG_TTL)

        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get discounts',
            'error': str(e)
        }), 500


@services_bp.route('/discounts/<code>', methods=['GET'])
def get_discount(code):
    try:
        cache_key = f"services:discount:{code.upper()}"
        cached = cache_get(cache_key)
        if cached is not None:
            return jsonify(cached), 200

        discount = get_discount_by_code_query(code)

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

        current_date = datetime.now(timezone.utc)

        if discount.start_date and discount.start_date > current_date:
            return jsonify({
                'success': False,
                'message': 'Discount code not yet active'
            }), 400

        if discount.end_date and discount.end_date < current_date:
            return jsonify({
                'success': False,
                'message': 'Discount code has expired'
            }), 400

        if discount.used_count >= discount.max_uses:
            return jsonify({
                'success': False,
                'message': 'Discount code has reached maximum uses'
            }), 400

        result = {
            'success': True,
            'data': {
                'discount': discount.to_dict()
            }
        }

        cache_set(cache_key, result, REDIS_LONG_TTL)

        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get discount code',
            'error': str(e)
        }), 500


@services_bp.route('/admin/services', methods=['POST'])
@jwt_required()
@admin_required
def create_service():
    try:
        data = request.get_json()
        
        if not all(key in data for key in ['name', 'price', 'duration', 'category']):
            return jsonify({
                'success': False,
                'message': 'Missing required fields'
            }), 400
        
        service = svc_create_service(data)
        
        cache_delete_pattern("services:*")
        
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
@admin_required
def update_service(service_id):
    try:
        data = request.get_json()
        service = svc_update_service(service_id, data)
        
        cache_delete_pattern("services:*")
        
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
@admin_required
def delete_service(service_id):
    try:
        svc_delete_service(service_id)
        cache_delete_pattern("services:*")
        
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