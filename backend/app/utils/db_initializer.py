from app import db
from app.models import (User, Service, Vehicle, Admin, DiscountCode)
from datetime import datetime

def initialize_database():
    """Initialize database with sample data if it doesn't exist"""
    
    # Check if we have any services
    if Service.query.count() == 0:
        print("Initializing database with sample data...")
        
        # Create sample services
        services = [
            Service(
                name='Preventive Maintenance & Inspections',
                description='Routine vehicle health checks and preventive maintenance coordination',
                price=99.99,
                duration=120,
                category='maintenance'
            ),
            Service(
                name='Repair Coordination',
                description='Vehicle delivery to and collection from approved garages',
                price=149.99,
                duration=180,
                category='repair'
            ),
            Service(
                name='Car Wash & Detailing',
                description='Premium detailing services including interior, exterior, and engine bay',
                price=79.99,
                duration=90,
                category='detailing'
            ),
            Service(
                name='Pick-Up & Drop-Off',
                description='Door-to-door vehicle collection and return with GPS tracking',
                price=49.99,
                duration=60,
                category='convenience'
            ),
            Service(
                name='Convenience & Lifestyle Support',
                description='Fuel refilling, tyre checks, battery checks, and roadside assistance',
                price=39.99,
                duration=45,
                category='convenience'
            ),
            Service(
                name='Corporate & Fleet Concierge',
                description='Fleet maintenance scheduling and multi-vehicle service coordination',
                price=299.99,
                duration=240,
                category='corporate'
            )
        ]
        db.session.add_all(services)
        
        # Create sample admin
        admin = Admin()
        admin.name = 'Admin User'
        admin.email = 'admin@autoconcierge.com'
        admin.set_password('admin123')
        db.session.add(admin)
        
        # Create sample users
        users = []
        
        user1 = User()
        user1.name = 'John Doe'
        user1.email = 'john@example.com'
        user1.set_password('password123')
        user1.phone = '+1234567890'
        user1.address = '123 Main St, City'
        users.append(user1)
        
        user2 = User()
        user2.name = 'Jane Smith'
        user2.email = 'jane@example.com'
        user2.set_password('password123')
        user2.phone = '+0987654321'
        user2.address = '456 Oak Ave, Town'
        users.append(user2)
        
        user3 = User()
        user3.name = 'Mike Johnson'
        user3.email = 'mike@example.com'
        user3.set_password('password123')
        user3.phone = '+1122334455'
        user3.address = '789 Pine Rd, Village'
        users.append(user3)
        
        db.session.add_all(users)
        
        # Create sample vehicles
        vehicles = [
            Vehicle(
                user_id=1,
                make='Toyota',
                model='Camry',
                year=2022,
                color='Silver',
                license_plate='ABC123',
                vin='1FTNE2CM1KFB93215',
                odometer=15000
            ),
            Vehicle(
                user_id=1,
                make='Honda',
                model='Accord',
                year=2021,
                color='Black',
                license_plate='XYZ789',
                vin='JHMCG56826C042398',
                odometer=22000
            ),
            Vehicle(
                user_id=2,
                make='Ford',
                model='Escape',
                year=2023,
                color='Blue',
                license_plate='DEF456',
                vin='3FAHP0JA8DR229876',
                odometer=8000
            ),
            Vehicle(
                user_id=3,
                make='BMW',
                model='X5',
                year=2020,
                color='White',
                license_plate='GHI789',
                vin='WBAXH3C50L5304215',
                odometer=35000
            )
        ]
        db.session.add_all(vehicles)
        
        # Create sample discount codes
        discounts = [
            DiscountCode(
                code='WELCOME10',
                discount_type='percentage',
                value=10.00,
                minimum_spend=50.00,
                max_uses=100,
                used_count=0,
                start_date=datetime(2024, 1, 1),
                end_date=datetime(2024, 12, 31),
                is_active=True
            ),
            DiscountCode(
                code='FIRSTORDER20',
                discount_type='percentage',
                value=20.00,
                minimum_spend=100.00,
                max_uses=50,
                used_count=0,
                start_date=datetime(2024, 1, 1),
                end_date=datetime(2024, 12, 31),
                is_active=True
            ),
            DiscountCode(
                code='SUMMER50',
                discount_type='fixed',
                value=50.00,
                minimum_spend=200.00,
                max_uses=20,
                used_count=0,
                start_date=datetime(2024, 6, 1),
                end_date=datetime(2024, 8, 31),
                is_active=True
            )
        ]
        db.session.add_all(discounts)
        
        db.session.commit()
        print("Sample data successfully inserted into the database")
    else:
        print("Database already contains data, skipping initialization")