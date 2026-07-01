import { useState, useEffect } from 'react';
import { Search, Check, X, Phone, Mail, MapPin, Star, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { useApi } from '@/hooks/useApi';

export function PendingEmployeesManager() {
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingEmployees, setPendingEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const { post } = useApi();

  useEffect(() => {
    fetchPendingEmployees();
  }, []);

  const fetchPendingEmployees = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/admin/pending-employees', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPendingEmployees(data.data.pending_employees || []);
      } else {
        console.error('Failed to fetch pending employees');
      }
    } catch (error) {
      console.error('Error fetching pending employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: number) => {
    try {
      const response = await fetch(`/api/auth/admin/approve-employee/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ action: 'approve' })
      });
      
      if (response.ok) {
        await fetchPendingEmployees();
      } else {
        const errorData = await response.json();
        alert(`Failed to approve employee: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error approving employee:', error);
      alert('Failed to approve employee');
    }
  };

  const handleReject = async (userId: number) => {
    if (!window.confirm('Are you sure you want to reject this employee registration?')) {
      return;
    }

    try {
      const response = await fetch(`/api/auth/admin/approve-employee/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ action: 'reject' })
      });
      
      if (response.ok) {
        await fetchPendingEmployees();
      } else {
        const errorData = await response.json();
        alert(`Failed to reject employee: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error rejecting employee:', error);
      alert('Failed to reject employee');
    }
  };

  const filteredEmployees = pendingEmployees.filter(employee => 
    employee.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    employee.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    employee.employee.employee_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('');
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full border-4 border-b-slate-900 w-12 h-12"></div>
        <p className="mt-4 text-slate-600">Loading pending employee registrations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Pending Employee Registrations</h1>
          <p className="text-slate-600">Review and approve new employee registration requests</p>
        </div>
        <Button variant="outline" onClick={fetchPendingEmployees}>
          <Clock className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by name, email, or employee ID..."
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
            <div className="text-2xl font-bold">{pendingEmployees.length}</div>
            <p className="text-sm text-slate-600">Pending Registrations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{filteredEmployees.length}</div>
            <p className="text-sm text-slate-600">Filtered Results</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">0</div>
            <p className="text-sm text-slate-600">Approved Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">0</div>
            <p className="text-sm text-slate-600">Rejected Today</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Employees Table */}
      {pendingEmployees.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-slate-500">No pending employee registrations</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Pending Registrations</CardTitle>
            <CardDescription>{filteredEmployees.length} employees awaiting approval</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Specialties</TableHead>
                    <TableHead>Registration Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((emp) => (
                    <TableRow key={emp.user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback className="bg-slate-900 text-white">
                              {getInitials(emp.user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{emp.user.name}</p>
                            <p className="text-xs text-slate-500">ID: {emp.employee.employee_id}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-3 w-3 text-slate-400" />
                            <span className="text-slate-600">{emp.user.email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-3 w-3 text-slate-400" />
                            <span className="text-slate-600">{emp.user.phone || 'Not provided'}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-slate-600">
                          {emp.employee.location || 'Not specified'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 text-xs">
                          {(emp.employee.specialties || []).map((specialty, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {specialty}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {new Date(emp.user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button 
                          variant="default" 
                          size="sm" 
                          onClick={() => handleApprove(emp.user.id)}
                          className="bg-green-500 hover:bg-green-600 text-white"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Approve
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => handleReject(emp.user.id)}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Reject
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}