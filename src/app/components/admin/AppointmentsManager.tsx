import { useState } from 'react';
import { Search, Filter, Download, Eye, Edit, Trash2, Phone, Mail } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';

export function AppointmentsManager() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const appointments = [
    {
      id: 'A-1001',
      customer: 'John Smith',
      phone: '+1 555-0101',
      email: 'john@example.com',
      service: 'Premium Car Wash',
      vehicle: 'Tesla Model 3 (2023)',
      date: 'Jan 27, 2026',
      time: '10:30 AM',
      location: '123 Main St, Downtown',
      concierge: 'Michael Chen',
      status: 'in-progress',
      price: '$45'
    },
    {
      id: 'A-1002',
      customer: 'Sarah Johnson',
      phone: '+1 555-0102',
      email: 'sarah@example.com',
      service: 'Oil Change',
      vehicle: 'BMW 5 Series (2022)',
      date: 'Jan 27, 2026',
      time: '2:00 PM',
      location: '456 Oak Ave, Westside',
      concierge: 'Emily Rodriguez',
      status: 'scheduled',
      price: '$75'
    },
    {
      id: 'A-1003',
      customer: 'Mike Wilson',
      phone: '+1 555-0103',
      email: 'mike@example.com',
      service: 'Full Detailing',
      vehicle: 'Mercedes E-Class (2021)',
      date: 'Jan 27, 2026',
      time: '9:00 AM',
      location: '789 Pine Rd, Eastside',
      concierge: 'David Park',
      status: 'in-progress',
      price: '$225'
    },
    {
      id: 'A-1004',
      customer: 'Emma Davis',
      phone: '+1 555-0104',
      email: 'emma@example.com',
      service: 'Tire Rotation',
      vehicle: 'Audi A4 (2023)',
      date: 'Jan 27, 2026',
      time: '4:30 PM',
      location: '321 Elm St, Northside',
      concierge: 'Unassigned',
      status: 'pending',
      price: '$40'
    },
    {
      id: 'A-1005',
      customer: 'David Brown',
      phone: '+1 555-0105',
      email: 'david@example.com',
      service: 'Vehicle Inspection',
      vehicle: 'Honda Accord (2020)',
      date: 'Jan 26, 2026',
      time: '11:00 AM',
      location: '654 Maple Ave, Central',
      concierge: 'Sarah Kim',
      status: 'completed',
      price: '$85'
    },
    {
      id: 'A-1006',
      customer: 'Lisa Anderson',
      phone: '+1 555-0106',
      email: 'lisa@example.com',
      service: 'Brake Service',
      vehicle: 'Toyota Camry (2019)',
      date: 'Jan 28, 2026',
      time: '8:00 AM',
      location: '987 Cedar Ln, Southside',
      concierge: 'Michael Chen',
      status: 'scheduled',
      price: '$175'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'scheduled':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const filteredAppointments = appointments.filter(appointment => {
    const matchesSearch = 
      appointment.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appointment.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appointment.vehicle.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Appointments Manager</h1>
        <p className="text-slate-600">View and manage all service appointments</p>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by customer, ID, or vehicle..."
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
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Appointments Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Appointments</CardTitle>
              <CardDescription>{filteredAppointments.length} appointments found</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Concierge</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAppointments.map((appointment) => (
                  <TableRow key={appointment.id}>
                    <TableCell className="font-medium">{appointment.id}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{appointment.customer}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Phone className="h-3 w-3 text-slate-400" />
                          <p className="text-xs text-slate-500">{appointment.phone}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{appointment.service}</TableCell>
                    <TableCell className="text-sm">{appointment.vehicle}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{appointment.date}</p>
                        <p className="text-xs text-slate-500">{appointment.time}</p>
                      </div>
                    </TableCell>
                    <TableCell>{appointment.concierge}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(appointment.status)}>
                        {getStatusLabel(appointment.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold">{appointment.price}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
