import { useState, useEffect } from 'react';
import { Search, Edit, Trash2, Phone, Mail, MapPin, Star } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { api } from '@/services/api';

interface ConciergeRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  rating: number;
  totalServices: number;
  status: string;
  specialties: string[];
}

export function ConciergeManager() {
  const [concierges, setConcierges] = useState<ConciergeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchConcierges();
  }, []);

  const fetchConcierges = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getAllEmployeesAdmin();
      if (response.success && response.data) {
        const mapped = (response.data.employees || []).map((item: any) => ({
          id: item.employee?.employee_id || String(item.id),
          name: item.name,
          email: item.email,
          phone: item.phone || '',
          location: item.employee?.location || '',
          rating: item.employee?.rating || 0,
          totalServices: item.employee?.total_services || 0,
          status: item.employee?.status || 'active',
          specialties: item.employee?.specialties || [],
        }));
        setConcierges(mapped);
      }
    } catch (err) {
      setError('Failed to load concierge staff');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Concierge Staff</h1>
          <p className="text-slate-600">Loading staff data...</p>
        </div>
        <Card>
          <CardContent className="py-8">
            <div className="animate-pulse space-y-4">
              <div className="h-10 bg-slate-200 rounded"></div>
              <div className="h-10 bg-slate-200 rounded"></div>
              <div className="h-10 bg-slate-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Concierge Staff</h1>
          <p className="text-red-600">{error}</p>
          <Button onClick={fetchConcierges} className="mt-4">Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Concierge Staff</h1>
          <p className="text-slate-600">Manage your concierge team members</p>
        </div>
        <Button onClick={fetchConcierges}>
          <Search className="h-4 w-4 mr-2" />
          Refresh
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
            <div className="text-2xl font-bold">{concierges.length}</div>
            <p className="text-sm text-slate-600">Total Concierges</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {concierges.filter(c => c.status === 'active').length}
            </div>
            <p className="text-sm text-slate-600">Active Now</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">-</div>
            <p className="text-sm text-slate-600">Services in Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {concierges.length > 0
                ? (concierges.reduce((sum, c) => sum + c.rating, 0) / concierges.length).toFixed(1)
                : '0.0'}
            </div>
            <p className="text-sm text-slate-600">Avg. Rating</p>
          </CardContent>
        </Card>
      </div>

      {/* Concierge Grid */}
      {filteredConcierges.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-slate-500">No concierge staff found</p>
          </CardContent>
        </Card>
      ) : (
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
                  {concierge.phone && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone className="h-4 w-4" />
                      <span>{concierge.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-slate-600">
                    <MapPin className="h-4 w-4" />
                    <span>{concierge.location || 'Not specified'}</span>
                  </div>
                </div>

                <div className="pt-4 border-t space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Rating</span>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold">{concierge.rating.toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Total Services</span>
                    <span className="font-semibold">{concierge.totalServices}</span>
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
      )}
    </div>
  );
}
