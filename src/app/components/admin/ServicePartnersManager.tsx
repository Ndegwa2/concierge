import { useState } from 'react';
import { Search, Plus, Star, MapPin, Phone, Mail } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';

export function ServicePartnersManager() {
  const [searchQuery, setSearchQuery] = useState('');

  const partners = [
    {
      id: 'SP-001',
      name: 'Premium Auto Spa',
      type: 'Car Wash & Detailing',
      location: 'Downtown, 456 Main Street',
      phone: '+1 555-2001',
      email: 'info@premiumautospa.com',
      rating: 4.8,
      totalServices: 234,
      activeContracts: 3,
      pricing: 'Standard',
      specialties: ['Premium Wash', 'Full Detailing', 'Paint Protection']
    },
    {
      id: 'SP-002',
      name: 'Precision Mechanics',
      type: 'Full Service Garage',
      location: 'Westside, 789 Oak Avenue',
      phone: '+1 555-2002',
      email: 'service@precisionmech.com',
      rating: 4.9,
      totalServices: 456,
      activeContracts: 5,
      pricing: 'Premium',
      specialties: ['Oil Change', 'Brake Service', 'Engine Diagnostics', 'Transmission']
    },
    {
      id: 'SP-003',
      name: 'Quick Lube Express',
      type: 'Oil Change Specialist',
      location: 'Eastside, 321 Pine Road',
      phone: '+1 555-2003',
      email: 'contact@quicklube.com',
      rating: 4.6,
      totalServices: 567,
      activeContracts: 4,
      pricing: 'Budget',
      specialties: ['Oil Change', 'Filter Replacement', 'Fluid Checks']
    },
    {
      id: 'SP-004',
      name: 'Elite Auto Care',
      type: 'Luxury Vehicle Service',
      location: 'Central, 654 Maple Avenue',
      phone: '+1 555-2004',
      email: 'concierge@eliteauto.com',
      rating: 4.9,
      totalServices: 189,
      activeContracts: 6,
      pricing: 'Premium',
      specialties: ['Luxury Brands', 'Exotic Cars', 'Full Service', 'Detailing']
    },
    {
      id: 'SP-005',
      name: 'Tire Masters Pro',
      type: 'Tire & Wheel Specialist',
      location: 'Northside, 987 Cedar Lane',
      phone: '+1 555-2005',
      email: 'service@tiremasters.com',
      rating: 4.7,
      totalServices: 345,
      activeContracts: 3,
      pricing: 'Standard',
      specialties: ['Tire Rotation', 'Alignment', 'Balancing', 'New Tires']
    },
    {
      id: 'SP-006',
      name: 'City Auto Inspection',
      type: 'Vehicle Inspection',
      location: 'Southside, 147 Elm Street',
      phone: '+1 555-2006',
      email: 'inspections@cityauto.com',
      rating: 4.8,
      totalServices: 423,
      activeContracts: 2,
      pricing: 'Standard',
      specialties: ['Safety Inspection', 'Emissions', 'Pre-Purchase', 'Diagnostics']
    }
  ];

  const filteredPartners = partners.filter(partner =>
    partner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    partner.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    partner.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPricingColor = (pricing: string) => {
    switch (pricing) {
      case 'Budget':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Standard':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Premium':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Service Partners</h1>
          <p className="text-slate-600">Manage your network of trusted service providers</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Partner
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by name, type, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{partners.length}</div>
            <p className="text-sm text-slate-600">Total Partners</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">23</div>
            <p className="text-sm text-slate-600">Active Contracts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">4.8</div>
            <p className="text-sm text-slate-600">Avg. Rating</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">2,214</div>
            <p className="text-sm text-slate-600">Total Services</p>
          </CardContent>
        </Card>
      </div>

      {/* Partners Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {filteredPartners.map((partner) => (
          <Card key={partner.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{partner.name}</CardTitle>
                  <CardDescription>{partner.type}</CardDescription>
                </div>
                <Badge className={getPricingColor(partner.pricing)}>
                  {partner.pricing}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin className="h-4 w-4" />
                  <span>{partner.location}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="h-4 w-4" />
                  <span>{partner.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="h-4 w-4" />
                  <span>{partner.email}</span>
                </div>
              </div>

              <div className="pt-4 border-t space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Rating</span>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{partner.rating}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Total Services</span>
                  <span className="font-semibold">{partner.totalServices}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Active Contracts</span>
                  <span className="font-semibold">{partner.activeContracts}</span>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-slate-600 mb-2">Specialties</p>
                <div className="flex flex-wrap gap-2">
                  {partner.specialties.map((specialty) => (
                    <Badge key={specialty} variant="outline" className="text-xs">
                      {specialty}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1" size="sm">
                  View Details
                </Button>
                <Button variant="outline" size="sm">
                  Contact
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
