from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app import db
from app.services.catalog.models import Service
from app.services.appointments.models import Appointment
from app.services.partners.models import ServicePartner
from app.utils.decorators import admin_required, role_required, get_current_user
from app.utils.cache import cache_get, cache_set, cache_delete_pattern, REDIS_LONG_TTL, REDIS_SHORT_TTL
from .service import (
    get_all_partners_query,
    get_partner_by_id,
    create_partner as svc_create_partner,
    get_all_partners_admin_query,
    get_partner_admin_by_id,
    update_partner as svc_update_partner,
    delete_partner as svc_delete_partner,
    activate_partner as svc_activate_partner,
    update_partner_services as svc_update_partner_services,
    update_partner_rating as svc_update_partner_rating,
    get_partners_statistics as svc_get_partners_statistics,
)
from datetime import datetime, timezone

partners_bp = Blueprint('partners', __name__)


@partners_bp.route('/', methods=['GET'])
@jwt_required()
@role_required('admin', 'employee', 'customer')
def get_all_partners():
    try:
        service_type = request.args.get('service')
        location = request.args.get('location')
        min_rating = request.args.get('min_rating')
        search = request.args.get('search')
        
        cache_key = f"partners:all:{service_type or 'all'}:{location or 'all'}:{min_rating or 'all'}:{search or 'all'}"
        cached = cache_get(cache_key)
        if cached is not None:
            return jsonify(cached), 200
        
        result = get_all_partners_query(service_type, location, min_rating, search)
        
        cache_set(cache_key, result, REDIS_LONG_TTL)
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get service partners',
            'error': str(e)
        }), 500


@partners_bp.route('/<int:partner_id>', methods=['GET'])
@jwt_required()
@role_required('admin', 'employee', 'customer')
def get_partner(partner_id):
    try:
        cache_key = f"partners:{partner_id}"
        cached = cache_get(cache_key)
        if cached is not None:
            return jsonify(cached), 200

        partner = get_partner_by_id(partner_id)

        result = {
            'success': True,
            'data': {
                'partner': partner.to_dict()
            }
        }

        cache_set(cache_key, result, REDIS_LONG_TTL)

        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get service partner',
            'error': str(e)
        }), 500


@partners_bp.route('/admin', methods=['POST'])
@jwt_required()
@admin_required
def create_partner():
    try:
        data = request.get_json()
        
        required_fields = ['name', 'contact_name', 'phone']
        if not all(key in data for key in required_fields):
            return jsonify({
                'success': False,
                'message': 'Missing required fields',
                'required': required_fields
            }), 400
        
        partner = svc_create_partner(data)
        cache_delete_pattern("partners:*")
        
        return jsonify({
            'success': True,
            'message': 'Service partner created successfully',
            'data': {
                'partner': partner.to_dict()
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to create service partner',
            'error': str(e)
        }), 500


@partners_bp.route('/admin', methods=['GET'])
@jwt_required()
@admin_required
def get_all_partners_admin():
    try:
        is_active = request.args.get('is_active')
        search = request.args.get('search')

        cache_key = f"partners:admin:{is_active or 'all'}:{search or 'all'}"
        cached = cache_get(cache_key)
        if cached is not None:
            return jsonify(cached), 200

        result = get_all_partners_admin_query(is_active, search)

        cache_set(cache_key, result, REDIS_SHORT_TTL)

        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get service partners',
            'error': str(e)
        }), 500


@partners_bp.route('/admin/<int:partner_id>', methods=['GET'])
@jwt_required()
@admin_required
def get_partner_admin(partner_id):
    try:
        cache_key = f"partners:admin_detail:{partner_id}"
        cached = cache_get(cache_key)
        if cached is not None:
            return jsonify(cached), 200

        data = get_partner_admin_by_id(partner_id)

        result = {
            'success': True,
            'data': data
        }

        cache_set(cache_key, result, REDIS_SHORT_TTL)

        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get service partner',
            'error': str(e)
        }), 500


@partners_bp.route('/admin/<int:partner_id>', methods=['PUT'])
@jwt_required()
@admin_required
def update_partner(partner_id):
    try:
        data = request.get_json()
        partner = svc_update_partner(partner_id, data)
        cache_delete_pattern("partners:*")
        
        return jsonify({
            'success': True,
            'message': 'Service partner updated successfully',
            'data': {
                'partner': partner.to_dict()
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to update service partner',
            'error': str(e)
        }), 500


@partners_bp.route('/admin/<int:partner_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_partner(partner_id):
    try:
        svc_delete_partner(partner_id)
        cache_delete_pattern("partners:*")
        
        return jsonify({
            'success': True,
            'message': 'Service partner deactivated successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to deactivate service partner',
            'error': str(e)
        }), 500


@partners_bp.route('/admin/<int:partner_id>/activate', methods=['PUT'])
@jwt_required()
@admin_required
def activate_partner(partner_id):
    try:
        partner = svc_activate_partner(partner_id)
        cache_delete_pattern("partners:*")
        
        return jsonify({
            'success': True,
            'message': 'Service partner activated successfully',
            'data': {
                'partner': partner.to_dict()
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to activate service partner',
            'error': str(e)
        }), 500


@partners_bp.route('/admin/<int:partner_id>/services', methods=['PUT'])
@jwt_required()
@admin_required
def update_partner_services(partner_id):
    try:
        data = request.get_json()
        
        if 'services' not in data:
            return jsonify({
                'success': False,
                'message': 'Services list is required'
            }), 400
        
        svc_update_partner_services(partner_id, data['services'])
        cache_delete_pattern("partners:*")
        
        return jsonify({
            'success': True,
            'message': 'Partner services updated successfully',
            'data': {
                'services': ServicePartner.query.get(partner_id).services_offered
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to update partner services',
            'error': str(e)
        }), 500


@partners_bp.route('/admin/<int:partner_id>/rating', methods=['PUT'])
@jwt_required()
@admin_required
def update_partner_rating(partner_id):
    try:
        data = request.get_json()
        
        if 'rating' not in data:
            return jsonify({
                'success': False,
                'message': 'Rating is required'
            }), 400
        
        partner = svc_update_partner_rating(partner_id, data)
        cache_delete_pattern("partners:*")
        
        return jsonify({
            'success': True,
            'message': 'Partner rating updated successfully',
            'data': {
                'rating': float(partner.rating)
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to update partner rating',
            'error': str(e)
        }), 500


@partners_bp.route('/admin/statistics', methods=['GET'])
@jwt_required()
@admin_required
def get_partners_statistics():
    try:
        cache_key = "partners:statistics"
        cached = cache_get(cache_key)
        if cached is not None:
            return jsonify(cached), 200

        result = svc_get_partners_statistics()

        cache_set(cache_key, result, REDIS_SHORT_TTL)

        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get statistics',
            'error': str(e)
        }), 500