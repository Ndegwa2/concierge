import { useState, useEffect } from 'react';
import { Search, Eye, Mail, Phone, Car, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Label } from '@/app/components/ui/label';
import { toast } from 'sonner';
import { adminApi, vehiclesApi } from '@/services/api';
import type { User, Vehicle } from '@/services/api';

interface CustomerRow extends User {
  vehicles?: Vehicle[];
  total_services?: number;
  total_spent?: number;
  last_service?: string;
}

export function CustomersManager() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRow | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [customerDetails, setCustomerDetails] = useState<User | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminApi.getAllUsers();
      if (response.success && response.data) {
        const users = (response.data.users || []).filter((u: User) => u.role === 'customer');
        const enriched = await Promise.all(
          users.map(async (u: User) => {
            const vehiclesRes = await vehiclesApi.getVehicles();
            const userVehicles = vehiclesRes.success && vehiclesRes.data
              ? vehiclesRes.data.vehicles.filter((v: Vehicle) => v.user_id === u.id)
              : [];
            return {
              ...u,
              vehicles: userVehicles,
            };
          })
        );
        setCustomers(enriched);
      }
    } catch (err) {
      setError('Failed to load customers');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (customer: CustomerRow) => {
    setSelectedCustomer(customer);
    setViewDialogOpen(true);
    setLoadingDetails(true);
    setCustomerDetails(null);
    try {
      const response = await adminApi.getUser(customer.id);
      if (response.success && response.data) {
        setCustomerDetails(response.data.user);
      } else {
        toast.error(response.message || 'Failed to load customer details');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load customer details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.id.toString().includes(searchQuery)
  );

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.toUpperCase();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Customers</h1>
          <p className="text-slate-600">Loading customers...</p>
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
          <h1 className="text-3xl font-bold mb-2">Customers</h1>
          <p className="text-red-600">{error}</p>
          <Button onClick={fetchCustomers} className="mt-4">Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Customers</h1>
        <p className="text-slate-600">Manage your customer database</p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              id="customer-search"
              placeholder="Search by name, ID, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{customers.length}</div>
            <p className="text-sm text-slate-600">Total Customers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {customers.filter(c => c.is_active).length}
            </div>
            <p className="text-sm text-slate-600">Active Customers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {customers.reduce((sum, c) => sum + (c.vehicles?.length || 0), 0)}
            </div>
            <p className="text-sm text-slate-600">Total Vehicles</p>
          </CardContent>
        </Card>
      </div>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Customers</CardTitle>
          <CardDescription>{filteredCustomers.length} customers found</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredCustomers.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No customers found</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Vehicles</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback className="bg-slate-200 text-slate-700">
                              {getInitials(customer.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{customer.name}</p>
                            <p className="text-xs text-slate-500">ID: {customer.id}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-3 w-3 text-slate-400" />
                            <span className="text-slate-600">{customer.email}</span>
                          </div>
                          {customer.phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-3 w-3 text-slate-400" />
                              <span className="text-slate-600">{customer.phone}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {customer.vehicles && customer.vehicles.length > 0 ? (
                            customer.vehicles.map((vehicle, index) => (
                              <div key={index} className="flex items-center gap-2 text-sm">
                                <Car className="h-3 w-3 text-slate-400" />
                                <span className="text-slate-600">
                                  {vehicle.make} {vehicle.model} ({vehicle.year})
                                </span>
                              </div>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400">No vehicles</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(customer.is_active ? 'active' : 'inactive')}>
                          {getStatusLabel(customer.is_active ? 'active' : 'inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleView(customer)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Customer Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
            <DialogDescription>
              Customer #{selectedCustomer?.id}
            </DialogDescription>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              {loadingDetails ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : customerDetails ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Name</p>
                    <p className="font-medium">{customerDetails.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">Email</p>
                    <p className="font-medium">{customerDetails.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">Phone</p>
                    <p className="font-medium">{customerDetails.phone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">Address</p>
                    <p className="font-medium">{customerDetails.address || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">Role</p>
                    <p className="font-medium capitalize">{customerDetails.role}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">Status</p>
                    <Badge className={getStatusColor(customerDetails.is_active ? 'active' : 'inactive')}>
                      {getStatusLabel(customerDetails.is_active ? 'active' : 'inactive')}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">Created</p>
                    <p className="font-medium">{new Date(customerDetails.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">Updated</p>
                    <p className="font-medium">{new Date(customerDetails.updated_at).toLocaleString()}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">No additional details available.</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}