from app import db
from app.services.vehicles.models import Vehicle


def get_vehicles_query(current_user):
    if current_user['role'] == 'admin':
        vehicles = Vehicle.query.all()
    else:
        vehicles = Vehicle.query.filter_by(user_id=current_user['id']).all()
    return vehicles


def get_vehicle_by_id(vehicle_id, current_user):
    vehicle = Vehicle.query.get(vehicle_id)
    
    if not vehicle:
        raise ValueError('Vehicle not found')
    
    if current_user['role'] != 'admin' and vehicle.user_id != current_user['id']:
        raise ValueError('Unauthorized access')
    
    return vehicle


def create_vehicle(user_id, data):
    vehicle = Vehicle()
    vehicle.user_id = user_id
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
    return vehicle


def update_vehicle(vehicle_id, current_user, data):
    vehicle = Vehicle.query.get(vehicle_id)
    
    if not vehicle:
        raise ValueError('Vehicle not found')
    
    if current_user['role'] != 'admin' and vehicle.user_id != current_user['id']:
        raise ValueError('Unauthorized access')
    
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
    return vehicle


def delete_vehicle(vehicle_id, current_user):
    vehicle = Vehicle.query.get(vehicle_id)
    
    if not vehicle:
        raise ValueError('Vehicle not found')
    
    if current_user['role'] != 'admin' and vehicle.user_id != current_user['id']:
        raise ValueError('Unauthorized access')
    
    db.session.delete(vehicle)
    db.session.commit()