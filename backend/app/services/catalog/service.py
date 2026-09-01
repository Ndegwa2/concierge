from app import db
from app.services.catalog.models import Service, DiscountCode
from app.utils.db_router import get_read_model_query
from datetime import datetime, timezone


def get_services_query(category=None, min_price=None, max_price=None, search=None):
    query = get_read_model_query(Service).filter_by(is_active=True)
    
    if category:
        query = query.filter(Service.category == category)
    
    if min_price:
        query = query.filter(Service.price >= float(min_price))
    
    if max_price:
        query = query.filter(Service.price <= float(max_price))
    
    if search:
        query = query.filter(Service.name.ilike(f'%{search}%') | Service.description.ilike(f'%{search}%'))
    
    return query.all()


def get_categories_query():
    query = get_read_model_query(Service).filter_by(is_active=True)
    categories = query.with_entities(Service.category).distinct().all()
    categories_list = [category[0] for category in categories if category[0]]
    return categories_list


def get_discounts_query():
    current_date = datetime.now(timezone.utc)
    query = get_read_model_query(DiscountCode).filter(
        DiscountCode.is_active == True,
        DiscountCode.start_date <= current_date,
        DiscountCode.end_date >= current_date,
        DiscountCode.used_count < DiscountCode.max_uses
    )
    return query.all()


def get_discount_by_code_query(code):
    query = get_read_model_query(DiscountCode)
    return query.filter_by(code=code.upper()).first()


def create_service(data):
    service = Service()
    service.name = data['name']
    service.description = data.get('description', '')
    service.price = data['price']
    service.duration = data['duration']
    service.category = data['category']
    service.is_active = data.get('is_active', True)
    
    db.session.add(service)
    db.session.commit()
    return service


def update_service(service_id, data=None):
    service = Service.query.get(service_id)
    
    if not service:
        raise ValueError('Service not found')
    
    if data is None:
        data = {}
    
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
    return service


def delete_service(service_id):
    service = Service.query.get(service_id)
    
    if not service:
        raise ValueError('Service not found')
    
    db.session.delete(service)
    db.session.commit()


def _is_http_request():
    try:
        from flask import request
        return True
    except RuntimeError:
        return False