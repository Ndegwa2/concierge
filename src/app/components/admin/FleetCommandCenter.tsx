import { useState, useEffect } from 'react';
import { Plus, Calendar, AlertTriangle, DollarSign, Car as CarIcon, Trash2, Edit, FileText } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Select } from '@/app/components/ui/select';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { toast } from 'sonner';
import { fleetsApi } from '@/services/api';
import { Company, FleetVehicle, FleetExpense } from '@/services/api';

type Status = 'active' | 'in-service' | 'maintenance-due';

export function FleetCommandCenter() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [expenses, setExpenses] = useState<FleetExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [bulkScheduleOpen, setBulkScheduleOpen] = useState(false);

  const [vehicleForm, setVehicleForm] = useState({
    make: '', model: '', year: '', license_plate: '', vin: '', status: 'active', assigned_employee_id: '', last_service_date: '', mileage_km: '', notes: ''
  });
  const [companyForm, setCompanyForm] = useState({ name: '', contact_name: '', email: '', phone: '', payment_terms: 'Net 30', notes: '' });
  const [expenseForm, setExpenseForm] = useState({ expense_type: 'garage', description: '', amount: '', incurred_at: '', vehicle_id: '' });

  const selectedCompany = companies.find(c => c.id === selectedCompanyId) || companies[0] || null;
  const companyVehicles = vehicles.filter(v => v.company_id === selectedCompanyId);
  const companyExpenses = expenses.filter(e => e.company_id === selectedCompanyId);

  const kpi = {
    totalVehicles: companyVehicles.length,
    activeErrandJobs: companyVehicles.filter(v => v.status === 'in-service').length,
    scheduledServiceAlerts: companyVehicles.filter(v => v.status === 'maintenance-due').length,
    avgTco: companyExpenses.length ? companyExpenses.reduce((s, e) => s + e.amount, 0) / Math.max(companyVehicles.length, 1) : 0,
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      loadCompanyVehicles(selectedCompanyId);
      loadCompanyExpenses(selectedCompanyId);
    }
  }, [selectedCompanyId]);

  async function loadData() {
    try {
      const res = await fleetsApi.getCompanies({ per_page: 100 });
      if (res.success && res.data) {
        setCompanies(res.data.companies);
        if (res.data.companies.length > 0) setSelectedCompanyId(res.data.companies[0].id);
      }
    } catch (e) {
      toast.error('Failed to load companies');
    } finally {
      setLoading(false);
    }
  }

  async function loadCompanyVehicles(companyId: number) {
    try {
      const res = await fleetsApi.getCompanyVehicles(companyId);
      if (res.success && res.data) setVehicles(res.data.vehicles);
    } catch (e) {
      toast.error('Failed to load vehicles');
    }
  }

  async function loadCompanyExpenses(companyId: number) {
    try {
      const res = await fleetsApi.getCompanyExpenses(companyId);
      if (res.success && res.data) setExpenses(res.data.expenses);
    } catch (e) {
      toast.error('Failed to load expenses');
    }
  }

  async function handleAddCompany(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fleetsApi.createCompany(companyForm);
      if (res.success && res.data) {
        toast.success('Company added');
        setCompanyDialogOpen(false);
        setCompanyForm({ name: '', contact_name: '', email: '', phone: '', payment_terms: 'Net 30', notes: '' });
        loadData();
      }
    } catch (e) {
      toast.error('Failed to add company');
    }
  }

  async function handleAddVehicle(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCompanyId) return;
    try {
      const res = await fleetsApi.createCompanyVehicle(selectedCompanyId, {
        ...vehicleForm,
        year: vehicleForm.year ? Number(vehicleForm.year) : undefined,
        assigned_employee_id: vehicleForm.assigned_employee_id ? Number(vehicleForm.assigned_employee_id) : undefined,
        last_service_date: vehicleForm.last_service_date || undefined,
        mileage_km: Number(vehicleForm.mileage_km) || 0,
      });
      if (res.success && res.data) {
        toast.success('Vehicle added');
        setVehicleDialogOpen(false);
        setVehicleForm({ make: '', model: '', year: '', license_plate: '', vin: '', status: 'active', assigned_employee_id: '', last_service_date: '', mileage_km: '', notes: '' });
        loadCompanyVehicles(selectedCompanyId);
      }
    } catch (e) {
      toast.error('Failed to add vehicle');
    }
  }

  async function handleDeleteVehicle(id: number) {
    try {
      await fleetsApi.deleteFleetVehicle(id);
      toast.success('Vehicle removed');
      if (selectedCompanyId) loadCompanyVehicles(selectedCompanyId);
    } catch (e) {
      toast.error('Failed to remove vehicle');
    }
  }

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCompanyId) return;
    try {
      const res = await fleetsApi.createCompanyExpense(selectedCompanyId, {
        ...expenseForm,
        amount: Number(expenseForm.amount),
        vehicle_id: expenseForm.vehicle_id ? Number(expenseForm.vehicle_id) : undefined,
        incurred_at: expenseForm.incurred_at || new Date().toISOString(),
      });
      if (res.success && res.data) {
        toast.success('Expense recorded');
        setExpenseDialogOpen(false);
        setExpenseForm({ expense_type: 'garage', description: '', amount: '', incurred_at: '', vehicle_id: '' });
        loadCompanyExpenses(selectedCompanyId);
      }
    } catch (e) {
      toast.error('Failed to record expense');
    }
  }

  async function handleBulkSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCompanyId) return;
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    const date = String(fd.get('service_date') || '');
    const desc = String(fd.get('description') || '');
    const amount = Number(fd.get('amount') || 0);
    if (!date || !amount) {
      toast.error('Date and amount are required');
      return;
    }
    try {
      await fleetsApi.createCompanyExpense(selectedCompanyId, {
        expense_type: 'scheduled_service',
        description: `Bulk Service Run - ${desc}`,
        amount,
        incurred_at: new Date(date).toISOString(),
      });
      toast.success('Bulk service run scheduled');
      setBulkScheduleOpen(false);
      loadCompanyExpenses(selectedCompanyId);
    } catch (e) {
      toast.error('Failed to schedule service run');
    }
  }

  async function handleGenerateStatement() {
    if (!selectedCompanyId) return;
    try {
      const from = new Date();
      from.setMonth(from.getMonth() - 1);
      const to = new Date();
      await fleetsApi.generateFleetInvoice(selectedCompanyId, {
        period_start: from.toISOString().slice(0, 10),
        period_end: to.toISOString().slice(0, 10),
        line_items: companyExpenses.map(e => ({ description: `${e.expense_type}: ${e.description}`, quantity: 1, unit_price: e.amount, total_price: e.amount })),
        notes: 'Monthly fleet statement',
      });
      toast.success('Monthly statement generated');
    } catch (e) {
      toast.error('Failed to generate statement');
    }
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'in-service': return <Badge className="bg-amber-100 text-amber-800">In Service</Badge>;
      case 'maintenance-due': return <Badge className="bg-red-100 text-red-800">Maintenance Due</Badge>;
      default: return <Badge className="bg-slate-100 text-slate-800">{status}</Badge>;
    }
  };

  if (loading) {
    return <div className="p-8 text-slate-500">Loading fleet data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Fleet Command Center</h2>
          <p className="text-slate-500">Manage fleet vehicles, expenses, and operations</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={companyDialogOpen} onOpenChange={setCompanyDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><Plus className="h-4 w-4 mr-2" />Add Company</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Company</DialogTitle></DialogHeader>
              <form onSubmit={handleAddCompany} className="space-y-3">
                <div><Label>Company Name</Label><Input required value={companyForm.name} onChange={e => setCompanyForm({ ...companyForm, name: e.target.value })} /></div>
                <div><Label>Contact Name</Label><Input value={companyForm.contact_name} onChange={e => setCompanyForm({ ...companyForm, contact_name: e.target.value })} /></div>
                <div><Label>Email</Label><Input type="email" value={companyForm.email} onChange={e => setCompanyForm({ ...companyForm, email: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={companyForm.phone} onChange={e => setCompanyForm({ ...companyForm, phone: e.target.value })} /></div>
                <div><Label>Payment Terms</Label><Input value={companyForm.payment_terms} onChange={e => setCompanyForm({ ...companyForm, payment_terms: e.target.value })} /></div>
                <div><Label>Notes</Label><Textarea value={companyForm.notes} onChange={e => setCompanyForm({ ...companyForm, notes: e.target.value })} /></div>
                <Button type="submit" className="w-full">Create Company</Button>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={vehicleDialogOpen} onOpenChange={setVehicleDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Add Vehicle</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Vehicle to Fleet</DialogTitle></DialogHeader>
              <form onSubmit={handleAddVehicle} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Make</Label><Input required value={vehicleForm.make} onChange={e => setVehicleForm({ ...vehicleForm, make: e.target.value })} /></div>
                  <div><Label>Model</Label><Input required value={vehicleForm.model} onChange={e => setVehicleForm({ ...vehicleForm, model: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Year</Label><Input type="number" value={vehicleForm.year} onChange={e => setVehicleForm({ ...vehicleForm, year: e.target.value })} /></div>
                  <div><Label>License Plate</Label><Input required value={vehicleForm.license_plate} onChange={e => setVehicleForm({ ...vehicleForm, license_plate: e.target.value })} /></div>
                </div>
                <div><Label>VIN</Label><Input value={vehicleForm.vin} onChange={e => setVehicleForm({ ...vehicleForm, vin: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Status</Label>
                    <select className="w-full border rounded-md p-2" value={vehicleForm.status} onChange={e => setVehicleForm({ ...vehicleForm, status: e.target.value })}>
                      <option value="active">Active</option>
                      <option value="in-service">In Service</option>
                      <option value="maintenance-due">Maintenance Due</option>
                    </select>
                  </div>
                  <div><Label>Mileage (km)</Label><Input type="number" value={vehicleForm.mileage_km} onChange={e => setVehicleForm({ ...vehicleForm, mileage_km: e.target.value })} /></div>
                </div>
                <div><Label>Assigned Concierge ID</Label><Input type="number" value={vehicleForm.assigned_employee_id} onChange={e => setVehicleForm({ ...vehicleForm, assigned_employee_id: e.target.value })} /></div>
                <div><Label>Last Service Date</Label><Input type="date" value={vehicleForm.last_service_date} onChange={e => setVehicleForm({ ...vehicleForm, last_service_date: e.target.value })} /></div>
                <div><Label>Notes</Label><Textarea value={vehicleForm.notes} onChange={e => setVehicleForm({ ...vehicleForm, notes: e.target.value })} /></div>
                <Button type="submit" className="w-full">Add Vehicle</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4"><div className="text-slate-500 text-sm">Total Fleet Vehicles</div><div className="text-2xl font-bold">{kpi.totalVehicles}</div></Card>
        <Card className="p-4"><div className="text-slate-500 text-sm">Active Errand Jobs</div><div className="text-2xl font-bold">{kpi.activeErrandJobs}</div></Card>
        <Card className="p-4"><div className="text-slate-500 text-sm">Scheduled Service Alerts</div><div className="text-2xl font-bold">{kpi.scheduledServiceAlerts}</div></Card>
        <Card className="p-4"><div className="text-slate-500 text-sm">Avg TCO Per Vehicle</div><div className="text-2xl font-bold">KSh {kpi.avgTco.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div></Card>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Fleet Directory</h3>
          <div className="flex gap-2">
            <Dialog open={bulkScheduleOpen} onOpenChange={setBulkScheduleOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm"><Calendar className="h-4 w-4 mr-2" />Schedule Bulk Service Run</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Bulk Service Run</DialogTitle></DialogHeader>
                <form onSubmit={handleBulkSchedule} className="space-y-3">
                  <div><Label>Service Date</Label><Input type="date" name="service_date" required /></div>
                  <div><Label>Description</Label><Input name="description" /></div>
                  <div><Label>Estimated Cost (KES)</Label><Input type="number" name="amount" required /></div>
                  <Button type="submit" className="w-full">Schedule Run</Button>
                </form>
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="sm" onClick={handleGenerateStatement}><FileText className="h-4 w-4 mr-2" />Generate Monthly Statement</Button>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reg No</TableHead>
              <TableHead>Fleet Owner</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Service</TableHead>
              <TableHead>Assigned Concierge</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companyVehicles.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-slate-500 py-8">No vehicles in this fleet yet.</TableCell></TableRow>
            )}
            {companyVehicles.map(v => (
              <TableRow key={v.id}>
                <TableCell className="font-medium">{v.license_plate}</TableCell>
                <TableCell>{selectedCompany?.name || '-'}</TableCell>
                <TableCell>{v.make} {v.model}</TableCell>
                <TableCell>{statusBadge(v.status)}</TableCell>
                <TableCell>{v.last_service_date ? new Date(v.last_service_date).toLocaleDateString() : '-'}</TableCell>
                <TableCell>{v.assigned_employee?.name || '-'}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteVehicle(v.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
