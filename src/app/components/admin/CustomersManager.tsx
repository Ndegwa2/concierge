import { useState } from 'react';
import { Search, Eye, Mail, Phone, Car } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';

export function CustomersManager() {
  const [searchQuery, setSearchQuery] = useState('');

  const customers = [
    {
      id: 'CU-1001',
      name: 'John Smith',
      email: 'john.smith@example.com',
      phone: '+1 555-0101',
      vehicles: ['Tesla Model 3 (2023)', 'Honda CR-V (2020)'],
      totalServices: 24,
      totalSpent: '$1,840',
      lastService: 'Jan 20, 2026',
      status: 'active'
    },
    {
      id: 'CU-1002',
      name: 'Sarah Johnson',
      email: 'sarah.j@example.com',
      phone: '+1 555-0102',
      vehicles: ['BMW 5 Series (2022)'],
      totalServices: 18,
      totalSpent: '$1,425',
      lastService: 'Jan 15, 2026',
      status: 'active'
    },
    {
      id: 'CU-1003',
      name: 'Mike Wilson',
      email: 'mike.wilson@example.com',
      phone: '+1 555-0103',
      vehicles: ['Mercedes E-Class (2021)', 'Porsche 911 (2023)'],
      totalServices: 32,
      totalSpent: '$3,290',
      lastService: 'Jan 22, 2026',
      status: 'vip'
    },
    {
      id: 'CU-1004',
      name: 'Emma Davis',
      email: 'emma.davis@example.com',
      phone: '+1 555-0104',
      vehicles: ['Audi A4 (2023)'],
      totalServices: 12,
      totalSpent: '$895',
      lastService: 'Jan 18, 2026',
      status: 'active'
    },
    {
      id: 'CU-1005',
      name: 'David Brown',
      email: 'david.b@example.com',
      phone: '+1 555-0105',
      vehicles: ['Honda Accord (2020)', 'Toyota Highlander (2022)'],
      totalServices: 28,
      totalSpent: '$2,150',
      lastService: 'Jan 25, 2026',
      status: 'active'
    },
    {
      id: 'CU-1006',
      name: 'Lisa Anderson',
      email: 'lisa.anderson@example.com',
      phone: '+1 555-0106',
      vehicles: ['Toyota Camry (2019)'],
      totalServices: 8,
      totalSpent: '$620',
      lastService: 'Dec 28, 2025',
      status: 'inactive'
    }
  ];

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'vip':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.toUpperCase();
  };

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
              placeholder="Search by name, ID, or email..."
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
            <div className="text-2xl font-bold">{customers.length}</div>
            <p className="text-sm text-slate-600">Total Customers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {customers.filter(c => c.status === 'active').length}
            </div>
            <p className="text-sm text-slate-600">Active Customers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {customers.filter(c => c.status === 'vip').length}
            </div>
            <p className="text-sm text-slate-600">VIP Customers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">$10,220</div>
            <p className="text-sm text-slate-600">Total Revenue</p>
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Vehicles</TableHead>
                  <TableHead>Services</TableHead>
                  <TableHead>Total Spent</TableHead>
                  <TableHead>Last Service</TableHead>
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
                          <p className="text-xs text-slate-500">{customer.id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-3 w-3 text-slate-400" />
                          <span className="text-slate-600">{customer.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-3 w-3 text-slate-400" />
                          <span className="text-slate-600">{customer.phone}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {customer.vehicles.map((vehicle, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <Car className="h-3 w-3 text-slate-400" />
                            <span className="text-slate-600">{vehicle}</span>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">{customer.totalServices}</TableCell>
                    <TableCell className="font-semibold">{customer.totalSpent}</TableCell>
                    <TableCell className="text-sm text-slate-600">{customer.lastService}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(customer.status)}>
                        {getStatusLabel(customer.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
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
