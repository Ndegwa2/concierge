"""
Service Partner Routes for AutoConcierge

This module handles service partner management endpoints.
Service Partners are external businesses like garages, car washes, etc.
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app import db
from app.models import ServicePartner, Service, Appointment
from app.utils.decorators import admin_required, role_required, get_current_user
from datetime import datetime

partners_bp = Blueprint('partners', __name__)


# ============================================================
# PUBLIC ENDPOINTS - Service Partner Information
# ============================================================

@partners_bp.route('/', methods=['GET'])
@jwt_required()
@role_required('admin', 'employee', 'customer')
def get_all_partners():
    """Get all active service partners"""
    try:
        # Query parameters
        service_type = request.args.get('service')
        location = request.args.get('location')
        min_rating = request.args.get('min_rating')
        search = request.args.get('search')
        
        # Build query
        query = ServicePartner.query.filter_by(is_active=True)
        
        if service_type:
            # Filter by service offered (JSON array search)
            query = query.filter(
                ServicePartner.services_offered.contains(f'"{service_type}"')
            )
        
        if location:
            query = query.filter(
                db.or_(
                    ServicePartner.address['city'].astext.ilike(f'%{location}%'),
                    ServicePartner.address['street'].astext.ilike(f'%{location}%')
                )
            )
        
        if min_rating:
            query = query.filter(ServicePartner.rating >= float(min_rating))
        
        if search:
            query = query.filter(
                db.or_(
                    ServicePartner.name.ilike(f'%{search}%'),
                    ServicePartner.contact_name.ilike(f'%{search}%')
                )
            )
        
        partners = query.order_by(ServicePartner.rating.desc()).all()
        
        return jsonify({
            'success': True,
            'data': {
                'partners': [partner.to_dict() for partner in partners],
                'count': len(partners)
            }
        }), 200
        
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
    """Get a single service partner by ID"""
    try:
        partner = ServicePartner.query.get(partner_id)
        
        if not partner:
            return jsonify({
                'success': False,
                'message': 'Service partner not found'
            }), 404
        
        return jsonify({
            'success': True,
            'data': {
                'partner': partner.to_dict()
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get service partner',
            'error': str(e)
        }), 500


# ============================================================
# ADMIN ENDPOINTS - Service Partner Management
# ============================================================

@partners_bp.route('/admin', methods=['POST'])
@jwt_required()
@admin_required
def create_partner():
    """Create a new service partner (admin only)"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'contact_name', 'phone']
        if not all(key in data for key in required_fields):
            return jsonify({
                'success': False,
                'message': 'Missing required fields',
                'required': required_fields
            }), 400
        
        # Check if partner with same name exists
        if ServicePartner.query.filter_by(name=data['name']).first():
            return jsonify({
                'success': False,
                'message': 'Service partner with this name already exists'
            }), 409
        
        # Create partner
        partner = ServicePartner()
        partner.name = data['name']
        partner.contact_name = data['contact_name']
        partner.email = data.get('email', '')
        partner.phone = data['phone']
        partner.address = data.get('address', {
            'street': '',
            'city': 'Nairobi',
            'state': 'Nairobi',
            'zipCode': '00100',
            'country': 'Kenya'
        })
        partner.services_offered = data.get('services_offered', [])
        partner.rating = data.get('rating', 0.0)
        partner.is_active = data.get('is_active', True)
        
        db.session.add(partner)
        db.session.commit()
        
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
    """Get all service partners including inactive (admin only)"""
    try:
        # Query parameters
        is_active = request.args.get('is_active')
        search = request.args.get('search')
        
        query = ServicePartner.query
        
        if is_active is not None:
            is_active_bool = is_active.lower() == 'true'
            query = query.filter_by(is_active=is_active_bool)
        
        if search:
            query = query.filter(
                db.or_(
                    ServicePartner.name.ilike(f'%{search}%'),
                    ServicePartner.contact_name.ilike(f'%{search}%'),
                    ServicePartner.email.ilike(f'%{search}%')
                )
            )
        
        partners = query.order_by(ServicePartner.created_at.desc()).all()
        
        return jsonify({
            'success': True,
            'data': {
                'partners': [partner.to_dict() for partner in partners],
                'count': len(partners)
            }
        }), 200
        
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
    """Get a single service partner by ID (admin only)"""
    try:
        partner = ServicePartner.query.get(partner_id)
        
        if not partner:
            return jsonify({
                'success': False,
                'message': 'Service partner not found'
            }), 404
        
        # Get statistics
        total_appointments = Appointment.query.filter_by(partner_id=partner_id).count()
        completed_appointments = Appointment.query.filter_by(
            partner_id=partner_id,
            status='completed'
        ).count()
        
        return jsonify({
            'success': True,
            'data': {
                'partner': partner.to_dict(),
                'statistics': {
                    'total_appointments': total_appointments,
                    'completed_appointments': completed_appointments
                }
            }
        }), 200
        
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
    """Update a service partner (admin only)"""
    try:
        partner = ServicePartner.query.get(partner_id)
        
        if not partner:
            return jsonify({
                'success': False,
                'message': 'Service partner not found'
            }), 404
        
        data = request.get_json()
        
        # Update fields
        if 'name' in data:
            # Check if name is taken by another partner
            existing = ServicePartner.query.filter_by(name=data['name']).first()
            if existing and existing.id != partner_id:
                return jsonify({
                    'success': False,
                    'message': 'Service partner name already in use'
                }), 409
            partner.name = data['name']
        
        if 'contact_name' in data:
            partner.contact_name = data['contact_name']
        
        if 'email' in data:
            partner.email = data['email']
        
        if 'phone' in data:
            partner.phone = data['phone']
        
        if 'address' in data:
            partner.address = data['address']
        
        if 'services_offered' in data:
            partner.services_offered = data['services_offered']
        
        if 'rating' in data:
            partner.rating = data['rating']
        
        if 'is_active' in data:
            partner.is_active = data['is_active']
        
        db.session.commit()
        
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
    """Delete a service partner (admin only) - Soft delete"""
    try:
        partner = ServicePartner.query.get(partner_id)
        
        if not partner:
            return jsonify({
                'success': False,
                'message': 'Service partner not found'
            }), 404
        
        # Soft delete - mark as inactive
        partner.is_active = False
        db.session.commit()
        
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
    """Activate a deactivated service partner (admin only)"""
    try:
        partner = ServicePartner.query.get(partner_id)
        
        if not partner:
            return jsonify({
                'success': False,
                'message': 'Service partner not found'
            }), 404
        
        partner.is_active = True
        db.session.commit()
        
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
    """Update services offered by a partner (admin only)"""
    try:
        partner = ServicePartner.query.get(partner_id)
        
        if not partner:
            return jsonify({
                'success': False,
                'message': 'Service partner not found'
            }), 404
        
        data = request.get_json()
        
        if 'services' not in data:
            return jsonify({
                'success': False,
                'message': 'Services list is required'
            }), 400
        
        partner.services_offered = data['services']
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Partner services updated successfully',
            'data': {
                'services': partner.services_offered
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
    """Update partner rating (admin only)"""
    try:
        partner = ServicePartner.query.get(partner_id)
        
        if not partner:
            return jsonify({
                'success': False,
                'message': 'Service partner not found'
            }), 404
        
        data = request.get_json()
        
        if 'rating' not in data:
            return jsonify({
                'success': False,
                'message': 'Rating is required'
            }), 400
        
        rating = float(data['rating'])
        if rating < 0 or rating > 5:
            return jsonify({
                'success': False,
                'message': 'Rating must be between 0 and 5'
            }), 400
        
        partner.rating = rating
        db.session.commit()
        
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


# ============================================================
# STATISTICS ENDPOINTS
# ============================================================

@partners_bp.route('/admin/statistics', methods=['GET'])
@jwt_required()
@admin_required
def get_partners_statistics():
    """Get service partners statistics (admin only)"""
    try:
        total_partners = ServicePartner.query.count()
        active_partners = ServicePartner.query.filter_by(is_active=True).count()
        inactive_partners = total_partners - active_partners
        
        # Top rated partners
        top_partners = ServicePartner.query.filter_by(is_active=True).order_by(
            ServicePartner.rating.desc()
        ).limit(5).all()
        
        # Partners by service type
        all_partners = ServicePartner.query.filter_by(is_active=True).all()
        service_counts = {}
        for partner in all_partners:
            for service in (partner.services_offered or []):
                service_counts[service] = service_counts.get(service, 0) + 1
        
        return jsonify({
            'success': True,
            'data': {
                'total_partners': total_partners,
                'active_partners': active_partners,
                'inactive_partners': inactive_partners,
                'top_partners': [p.to_dict() for p in top_partners],
                'services_distribution': service_counts
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get statistics',
            'error': str(e)
        }), 500