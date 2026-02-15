import { useState } from 'react';
import { Search, Plus, Edit, Trash2, Phone, Mail, MapPin, Star } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';

export function ConciergeManager() {
  const [searchQuery, setSearchQuery] = useState('');

  const concierges = [
    {
      id: 'C-001',
      name: 'Michael Chen',
      email: 'michael.chen@autoconcierge.com',
      phone: '+1 555-1001',
      location: 'Downtown District',
      rating: 4.9,
      totalServices: 156,
      activeServices: 3,
      status: 'active',
      specialties: ['Luxury Vehicles', 'Detailing']
    },
    {
      id: 'C-002',
      name: 'Emily Rodriguez',
      email: 'emily.r@autoconcierge.com',
      phone: '+1 555-1002',
      location: 'Westside Area',
      rating: 4.8,
      totalServices: 142,
      activeServices: 2,
      status: 'active',
      specialties: ['Maintenance', 'Inspections']
    },
    {
      id: 'C-003',
      name: 'David Park',
      email: 'david.park@autoconcierge.com',
      phone: '+1 555-1003',
      location: 'Eastside Area',
      rating: 4.9,
      totalServices: 138,
      activeServices: 4,
      status: 'active',
      specialties: ['Repairs', 'Diagnostics']
    },
    {
      id: 'C-004',
      name: 'Sarah Kim',
      email: 'sarah.kim@autoconcierge.com',
      phone: '+1 555-1004',
      location: 'Central District',
      rating: 4.7,
      totalServices: 125,
      activeServices: 1,
      status: 'active',
      specialties: ['Car Wash', 'Quick Service']
    },
    {
      id: 'C-005',
      name: 'James Wilson',
      email: 'james.w@autoconcierge.com',
      phone: '+1 555-1005',
      location: 'Northside Area',
      rating: 4.6,
      totalServices: 98,
      activeServices: 0,
      status: 'off-duty',
      specialties: ['Fleet Service', 'Corporate']
    }
  ];

  const filteredConcierges = concierges.filter(concierge =>
    concierge.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    concierge.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    concierge.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('');
  };

  const getStatusColor = (status: string) => {
    return status === 'active' 
      ? 'bg-green-100 text-green-800 border-green-200' 
      : 'bg-slate-100 text-slate-800 border-slate-200';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Concierge Staff</h1>
          <p className="text-slate-600">Manage your concierge team members</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Concierge
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by name, ID, or location..."
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
            <div className="text-2xl font-bold">5</div>
            <p className="text-sm text-slate-600">Total Concierges</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">4</div>
            <p className="text-sm text-slate-600">Active Now</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">10</div>
            <p className="text-sm text-slate-600">Services in Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">4.8</div>
            <p className="text-sm text-slate-600">Avg. Rating</p>
          </CardContent>
        </Card>
      </div>

      {/* Concierge Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {filteredConcierges.map((concierge) => (
          <Card key={concierge.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-slate-900 text-white">
                      {getInitials(concierge.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{concierge.name}</CardTitle>
                    <p className="text-sm text-slate-500">{concierge.id}</p>
                  </div>
                </div>
                <Badge className={getStatusColor(concierge.status)}>
                  {concierge.status === 'active' ? 'Active' : 'Off Duty'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="h-4 w-4" />
                  <span>{concierge.email}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="h-4 w-4" />
                  <span>{concierge.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin className="h-4 w-4" />
                  <span>{concierge.location}</span>
                </div>
              </div>

              <div className="pt-4 border-t space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Rating</span>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{concierge.rating}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Total Services</span>
                  <span className="font-semibold">{concierge.totalServices}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Active Services</span>
                  <span className="font-semibold">{concierge.activeServices}</span>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-slate-600 mb-2">Specialties</p>
                <div className="flex flex-wrap gap-2">
                  {concierge.specialties.map((specialty) => (
                    <Badge key={specialty} variant="outline" className="text-xs">
                      {specialty}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button variant="outline" size="sm">
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
