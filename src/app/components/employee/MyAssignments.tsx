import { useState, useEffect } from 'react';
import { Search, Filter, MapPin, Phone, Navigation, CheckCircle2, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { api } from '@/services/api';
import type { Assignment } from '@/services/api';

interface MyAssignmentsProps {
  employeeData: {
    name: string;
    id: string;
  };
}

interface AssignmentDisplay {
  id: string;
  customer: string;
  phone: string;
  service: string;
  vehicle: string;
  pickupLocation: string;
  serviceLocation: string;
  date: string;
  time: string;
  status: string;
  estimatedDuration: string;
  specialInstructions?: string;
  price: string;
}

export function MyAssignments({ employeeData }: MyAssignmentsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [assignments, setAssignments] = useState<AssignmentDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssignments = async () => {
    try {
      const statusParam = statusFilter === 'all' ? undefined : statusFilter;
      const response = await api.getMyAssignments(statusParam);
      if (response.success && response.data) {
        const mapped = response.data.assignments.map(a => {
          const appt = a.appointment;
          return {
            id: `A-${appt.id}`,
            customer: appt.customer?.name || 'Unknown Customer',
            phone: appt.customer?.phone || 'N/A',
            service: appt.service?.name || 'N/A',
            vehicle: appt.vehicle ? `${appt.vehicle.make} ${appt.vehicle.model} (${appt.vehicle.year})` : 'N/A',
            pickupLocation: appt.notes ? appt.notes.split('\n')[0] || 'TBD' : 'TBD',
            serviceLocation: appt.service ? appt.service.name : 'Standard Service Center',
            date: new Date(appt.appointment_date).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' }),
            time: new Date(appt.appointment_date).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }),
            status: a.status || 'pending',
            estimatedDuration: appt.service ? `${appt.service.duration} min` : 'N/A',
            specialInstructions: appt.notes,
            price: appt.total_amount ? `KES ${appt.total_amount.toLocaleString()}` : 'N/A',
          };
        });
        setAssignments(mapped);
      } else {
        setError(response.message || 'Failed to load assignments');
      }
    } catch (err) {
      setError('Failed to load assignments. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'scheduled':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'completed':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = 
      assignment.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assignment.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assignment.vehicle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assignment.service.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || assignment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const activeAssignments = filteredAssignments.filter(a => a.status !== 'completed');
  const completedAssignments = filteredAssignments.filter(a => a.status === 'completed');

  const AssignmentCard = ({ assignment }: { assignment: AssignmentDisplay }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{assignment.service}</CardTitle>
            <CardDescription>{assignment.customer} - {assignment.id}</CardDescription>
          </div>
          <Badge className={getStatusColor(assignment.status)}>
            {getStatusLabel(assignment.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-slate-500" />
            <span className="font-medium">{assignment.date} at {assignment.time}</span>
            <span className="text-slate-500">({assignment.estimatedDuration})</span>
          </div>
          <div className="text-sm text-slate-600">
            <p className="font-medium mb-1">Vehicle: {assignment.vehicle}</p>
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 text-slate-500 mt-0.5" />
            <div>
              <p className="font-medium">Pickup:</p>
              <p className="text-slate-600">{assignment.pickupLocation}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 text-slate-500 mt-0.5" />
            <div>
              <p className="font-medium">Service Location:</p>
              <p className="text-slate-600">{assignment.serviceLocation}</p>
            </div>
          </div>
        </div>

        {assignment.specialInstructions && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm font-medium text-yellow-900 mb-1">Special Instructions:</p>
            <p className="text-sm text-yellow-800">{assignment.specialInstructions}</p>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Phone className="h-4 w-4" />
            <span>{assignment.phone}</span>
          </div>
          <span className="font-semibold">{assignment.price}</span>
        </div>

        <div className="flex gap-2">
          {assignment.status === 'scheduled' && (
            <>
              <Button className="flex-1" size="sm">
                <Navigation className="h-4 w-4 mr-2" />
                Start Service
              </Button>
              <Button variant="outline" size="sm">
                Call Customer
              </Button>
            </>
          )}
          {assignment.status === 'in-progress' && (
            <>
              <Button className="flex-1" size="sm">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Complete Service
              </Button>
              <Button variant="outline" size="sm">
                Update Status
              </Button>
            </>
          )}
          {assignment.status === 'completed' && (
            <Button variant="outline" className="flex-1" size="sm">
              View Details
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Clock className="h-6 w-6 text-slate-400 animate-spin" />
        <span className="ml-2 text-slate-500">Loading assignments...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-slate-500">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">My Assignments</h1>
        <p className="text-slate-600">Welcome back, {employeeData.name}! Manage your service appointments</p>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by customer, vehicle, or service..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{activeAssignments.length}</div>
                <p className="text-sm text-slate-600">Active Assignments</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{completedAssignments.length}</div>
                <p className="text-sm text-slate-600">Completed Today</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{filteredAssignments.length}</div>
                <p className="text-sm text-slate-600">Total Shown</p>
              </div>
              <Filter className="h-8 w-8 text-slate-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assignments Tabs */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active ({activeAssignments.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedAssignments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            {activeAssignments.length > 0 ? (
              activeAssignments.map((assignment) => (
                <AssignmentCard key={assignment.id} assignment={assignment} />
              ))
            ) : (
              <Card className="md:col-span-2">
                <CardContent className="py-12 text-center">
                  <p className="text-slate-500">No active assignments found</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            {completedAssignments.length > 0 ? (
              completedAssignments.map((assignment) => (
                <AssignmentCard key={assignment.id} assignment={assignment} />
              ))
            ) : (
              <Card className="md:col-span-2">
                <CardContent className="py-12 text-center">
                  <p className="text-slate-500">No completed assignments found</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
