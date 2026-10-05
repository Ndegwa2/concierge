import { useState, useEffect } from 'react';
import { Search, Eye, Mail, Phone, Car, Loader2, Send, UserCheck, UserX, Trash2, AlertCircle } from 'lucide-react';
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
      const [usersRes, vehiclesRes] = await Promise.all([
        adminApi.getAllUsers(),
        vehiclesApi.getVehicles(),
      ]);

      if (usersRes.success && usersRes.data) {
        const users = (usersRes.data.users || []).filter((u: User) => u.role === 'customer');
        const allVehicles: Vehicle[] = (vehiclesRes.success && vehiclesRes.data
          ? vehiclesRes.data.vehicles
          : []);

        const enriched = users.map((u: User) => {
          const userVehicles = allVehicles.filter((v: Vehicle) => v.user_id === u.id);
          return {
            ...u,
            vehicles: userVehicles,
          };
        });
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

  // New state for action dialogs
  const [actionLoading, setActionLoading] = useState<Record<number, boolean>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<CustomerRow | null>(null);

  const handleAction = async (
    customerId: number,
    action: 'activate' | 'deactivate' | 'onboarding' | 'delete'
  ) => {
    setActionLoading(prev => ({ ...prev, [customerId]: true }));
    try {
      if (action === 'activate' || action === 'deactivate') {
        const isActive = action === 'activate';
        const response = await adminApi.updateUserStatus(customerId, isActive);
        if (response.success) {
          toast.success(`Customer ${isActive ? 'activated' : 'deactivated'} successfully`);
          fetchCustomers();
        } else {
          throw new Error(response.message || 'Failed to update status');
        }
      } else if (action === 'onboarding') {
        const response = await adminApi.resendOnboardingEmail(customerId);
        if (response.success) {
          toast.success('Onboarding email queued for delivery');
        } else {
          throw new Error(response.message || 'Failed to send onboarding email');
        }
      } else if (action === 'delete') {
        // Open confirmation dialog instead of direct delete
        const customer = customers.find(c => c.id === customerId);
        if (customer) {
          setCustomerToDelete(customer);
          setDeleteDialogOpen(true);
        }
      }
    } catch (err: any) {
      toast.error(err?.message || `Failed to ${action} customer`);
    } finally {
      setActionLoading(prev => ({ ...prev, [customerId]: false }));
    }
  };

  const handleDeleteConfirm = async () => {
    if (!customerToDelete) return;
    setActionLoading(prev => ({ ...prev, [customerToDelete.id]: true }));
    try {
      const response = await adminApi.deleteUser(customerToDelete.id);
      if (response.success) {
        toast.success('Customer deleted successfully');
        fetchCustomers();
        setDeleteDialogOpen(false);
        setCustomerToDelete(null);
      } else {
        throw new Error(response.message || 'Failed to delete customer');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete customer');
    } finally {
      if (customerToDelete) {
        setActionLoading(prev => ({ ...prev, [customerToDelete.id]: false }));
      }
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
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAction(customer.id, 'onboarding')}
                            disabled={actionLoading[customer.id]}
                            title="Send onboarding documents"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                          {customer.is_active ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAction(customer.id, 'deactivate')}
                              disabled={actionLoading[customer.id]}
                              title="Deactivate account"
                              className="text-amber-600 hover:bg-amber-50"
                            >
                              <UserX className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAction(customer.id, 'activate')}
                              disabled={actionLoading[customer.id]}
                              title="Activate account"
                              className="text-green-600 hover:bg-green-50"
                            >
                              <UserCheck className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAction(customer.id, 'delete')}
                            disabled={actionLoading[customer.id]}
                            title="Remove customer"
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleView(customer)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Remove Customer
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {customerToDelete && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">
                  <strong>Customer:</strong> {customerToDelete.name} ({customerToDelete.email})
                </p>
                <p className="text-sm text-red-800 mt-1">
                  <strong>ID:</strong> {customerToDelete.id}
                </p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                  <strong>Warning:</strong> This will permanently delete the customer and all their data.
                  This action cannot be undone.
                </p>
                <p className="text-sm text-amber-800 mt-1">
                  Safety checks will prevent deletion if the customer has active appointments or registered vehicles.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setCustomerToDelete(null); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={customerToDelete ? actionLoading[customerToDelete.id] : true}
            >
              Remove Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}