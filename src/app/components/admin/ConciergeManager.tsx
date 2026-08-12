import { useState, useEffect } from 'react';
import { Search, Edit, Trash2, Phone, Mail, MapPin, Star, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import { toast } from 'sonner';
import { api } from '@/services/api';
import type { User, EmployeeProfile } from '@/services/api';

interface ConciergeRow {
  id: string;
  user_id: number;
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
  const [selectedConcierge, setSelectedConcierge] = useState<ConciergeRow | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    status: 'active',
    specialties: '',
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
          user_id: item.id,
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

  const handleEdit = (concierge: ConciergeRow) => {
    setSelectedConcierge(concierge);
    setEditForm({
      name: concierge.name,
      email: concierge.email,
      phone: concierge.phone,
      location: concierge.location,
      status: concierge.status,
      specialties: Array.isArray(concierge.specialties) ? concierge.specialties.join(', ') : '',
    });
    setEditDialogOpen(true);
  };

  const handleDelete = (concierge: ConciergeRow) => {
    setSelectedConcierge(concierge);
    setDeleteDialogOpen(true);
  };

  const submitEdit = async () => {
    if (!selectedConcierge) return;
    setSaving(true);
    try {
      const payload: Partial<EmployeeProfile> & { name?: string; email?: string; phone?: string } = {
        status: editForm.status,
        location: editForm.location,
        specialties: editForm.specialties.split(',').map(s => s.trim()).filter(Boolean),
      };
      if (editForm.name) payload.name = editForm.name;
      if (editForm.email) payload.email = editForm.email;
      if (editForm.phone) payload.phone = editForm.phone;

      const response = await api.updateEmployee(selectedConcierge.user_id, payload);
      if (response.success) {
        toast.success('Concierge updated successfully');
        setEditDialogOpen(false);
        setSelectedConcierge(null);
        fetchConcierges();
      } else {
        toast.error(response.message || 'Failed to update concierge');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update concierge');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedConcierge) return;
    setDeleting(true);
    try {
      const response = await api.deactivateEmployee(selectedConcierge.user_id);
      if (response.success) {
        toast.success('Concierge deleted successfully');
        setDeleteDialogOpen(false);
        setSelectedConcierge(null);
        fetchConcierges();
      } else {
        toast.error(response.message || 'Failed to delete concierge');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete concierge');
    } finally {
      setDeleting(false);
    }
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
                  <Button variant="outline" className="flex-1" size="sm" onClick={() => handleEdit(concierge)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(concierge)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Concierge</DialogTitle>
            <DialogDescription>
              Update details for {selectedConcierge?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedConcierge && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={editForm.status} onValueChange={(value) => setEditForm({ ...editForm, status: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="specialties">Specialties</Label>
                <Textarea
                  id="specialties"
                  value={editForm.specialties}
                  onChange={(e) => setEditForm({ ...editForm, specialties: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submitEdit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Concierge</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedConcierge?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}