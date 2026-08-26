from app import db
from app.services.catalog.models import Service
from app.services.appointments.models import Appointment
from app.services.partners.models import ServicePartner
from datetime import datetime, timezone


def get_all_partners_query(service_type=None, location=None, min_rating=None, search=None):
    query = ServicePartner.query.filter_by(is_active=True)
    
    if service_type:
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
    
    return {
        'success': True,
        'data': {
            'partners': [partner.to_dict() for partner in partners],
            'count': len(partners)
        }
    }


def get_partner_by_id(partner_id):
    partner = ServicePartner.query.get(partner_id)
    
    if not partner:
        raise ValueError('Service partner not found')
    
    return partner


def create_partner(data):
    required_fields = ['name', 'contact_name', 'phone']
    if not all(key in data for key in required_fields):
        raise ValueError('Missing required fields')
    
    if ServicePartner.query.filter_by(name=data['name']).first():
        raise ValueError('Service partner with this name already exists')
    
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
    return partner


def get_all_partners_admin_query(is_active=None, search=None):
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
    
    return {
        'success': True,
        'data': {
            'partners': [partner.to_dict() for partner in partners],
            'count': len(partners)
        }
    }


def get_partner_admin_by_id(partner_id):
    partner = ServicePartner.query.get(partner_id)
    
    if not partner:
        raise ValueError('Service partner not found')
    
    total_appointments = Appointment.query.filter_by(partner_id=partner_id).count()
    completed_appointments = Appointment.query.filter_by(
        partner_id=partner_id,
        status='completed'
    ).count()
    
    return {
        'partner': partner.to_dict(),
        'statistics': {
            'total_appointments': total_appointments,
            'completed_appointments': completed_appointments
        }
    }


def update_partner(partner_id, data):
    partner = ServicePartner.query.get(partner_id)
    
    if not partner:
        raise ValueError('Service partner not found')
    
    if 'name' in data:
        existing = ServicePartner.query.filter_by(name=data['name']).first()
        if existing and existing.id != partner_id:
            raise ValueError('Service partner name already in use')
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
    return partner


def delete_partner(partner_id):
    partner = ServicePartner.query.get(partner_id)
    
    if not partner:
        raise ValueError('Service partner not found')
    
    partner.is_active = False
    db.session.commit()


def activate_partner(partner_id):
    partner = ServicePartner.query.get(partner_id)
    
    if not partner:
        raise ValueError('Service partner not found')
    
    partner.is_active = True
    db.session.commit()
    return partner


def update_partner_services(partner_id, services):
    partner = ServicePartner.query.get(partner_id)
    
    if not partner:
        raise ValueError('Service partner not found')
    
    partner.services_offered = services
    db.session.commit()


def update_partner_rating(partner_id, data):
    partner = ServicePartner.query.get(partner_id)
    
    if not partner:
        raise ValueError('Service partner not found')
    
    if 'rating' not in data:
        raise ValueError('Rating is required')
    
    rating = float(data['rating'])
    if rating < 0 or rating > 5:
        raise ValueError('Rating must be between 0 and 5')
    
    partner.rating = rating
    db.session.commit()
    return partner


def get_partners_statistics():
    total_partners = ServicePartner.query.count()
    active_partners = ServicePartner.query.filter_by(is_active=True).count()
    inactive_partners = total_partners - active_partners
    
    top_partners = ServicePartner.query.filter_by(is_active=True).order_by(
        ServicePartner.rating.desc()
    ).limit(5).all()
    
    all_partners = ServicePartner.query.filter_by(is_active=True).all()
    service_counts = {}
    for partner in all_partners:
        for service in (partner.services_offered or []):
            service_counts[service] = service_counts.get(service, 0) + 1
    
    return {
        'success': True,
        'data': {
            'total_partners': total_partners,
            'active_partners': active_partners,
            'inactive_partners': inactive_partners,
            'top_partners': [p.to_dict() for p in top_partners],
            'services_distribution': service_counts
        }
    }