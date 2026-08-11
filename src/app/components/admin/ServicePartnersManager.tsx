import { useState, useEffect } from 'react';
import { Search, Star, MapPin, Phone, Mail } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { api } from '@/services/api';
import type { ServicePartner } from '@/services/api';

export function ServicePartnersManager() {
  const [partners, setPartners] = useState<ServicePartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getAllPartnersAdmin();
      if (response.success && response.data) {
        setPartners(response.data.partners || []);
      }
    } catch (err) {
      setError('Failed to load service partners');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPartners = partners.filter(partner =>
    partner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    partner.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (partner.address?.city || '').toLowerCase().includes(searchQuery.toLowerCase())
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Service Partners</h1>
          <p className="text-slate-600">Loading partners...</p>
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
          <h1 className="text-3xl font-bold mb-2">Service Partners</h1>
          <p className="text-red-600">{error}</p>
          <Button onClick={fetchPartners} className="mt-4">Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Service Partners</h1>
          <p className="text-slate-600">Manage your network of trusted service providers</p>
        </div>
        <Button onClick={fetchPartners}>
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
            <div className="text-2xl font-bold">
              {partners.filter(p => p.is_active).length}
            </div>
            <p className="text-sm text-slate-600">Active Partners</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {partners.length > 0
                ? (partners.reduce((sum, p) => sum + (p.rating || 0), 0) / partners.length).toFixed(1)
                : '0.0'}
            </div>
            <p className="text-sm text-slate-600">Avg. Rating</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {partners.reduce((sum, p) => sum + (p.total_services || 0), 0).toLocaleString()}
            </div>
            <p className="text-sm text-slate-600">Total Services</p>
          </CardContent>
        </Card>
      </div>

      {/* Partners Grid */}
      {filteredPartners.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-slate-500">No service partners found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {filteredPartners.map((partner) => (
            <Card key={partner.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{partner.name}</CardTitle>
                    <CardDescription>{partner.contact_name || 'No contact name'}</CardDescription>
                  </div>
                  <Badge className={getPricingColor('Standard')}>
                    Standard
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {partner.address?.street || ''}
                      {partner.address?.city ? `, ${partner.address.city}` : ''}
                    </span>
                  </div>
                  {partner.phone && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone className="h-4 w-4" />
                      <span>{partner.phone}</span>
                    </div>
                  )}
                  {partner.email && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Mail className="h-4 w-4" />
                      <span>{partner.email}</span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Rating</span>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold">{partner.rating.toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Total Services</span>
                    <span className="font-semibold">{partner.total_services}</span>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-slate-600 mb-2">Services Offered</p>
                  <div className="flex flex-wrap gap-2">
                    {(partner.services_offered || []).map((specialty, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
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
      )}
    </div>
  );
}
