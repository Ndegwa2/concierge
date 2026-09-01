import { useState, useEffect } from 'react';
import { FileText, Send, Download, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Select } from '@/app/components/ui/select';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { toast } from 'sonner';
import { fleetsApi } from '@/services/api';
import { Company, FleetExpense, FleetInvoice, InvoiceLineItem } from '@/services/api';

export function FleetBilling() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [expenses, setExpenses] = useState<FleetExpense[]>([]);
  const [invoices, setInvoices] = useState<FleetInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
  const [currentInvoice, setCurrentInvoice] = useState<FleetInvoice | null>(null);

  const [expenseForm, setExpenseForm] = useState({ expense_type: 'garage', description: '', amount: '', incurred_at: '', vehicle_id: '' });
  const [invoiceForm, setInvoiceForm] = useState({ period_start: '', period_end: '', tax_amount: '', currency: 'KES', due_date: '', notes: '' });

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      loadCompanyDetail(selectedCompanyId);
      loadCompanyExpenses(selectedCompanyId);
      loadCompanyInvoices(selectedCompanyId);
    }
  }, [selectedCompanyId]);

  async function loadCompanies() {
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

  async function loadCompanyDetail(id: number) {
    try {
      const res = await fleetsApi.getCompany(id);
      if (res.success && res.data) setCompany(res.data.company);
    } catch (e) {
      toast.error('Failed to load company');
    }
  }

  async function loadCompanyExpenses(id: number) {
    try {
      const res = await fleetsApi.getCompanyExpenses(id);
      if (res.success && res.data) setExpenses(res.data.expenses);
    } catch (e) {
      toast.error('Failed to load expenses');
    }
  }

  async function loadCompanyInvoices(id: number) {
    try {
      const res = await fleetsApi.getCompanyInvoices(id);
      if (res.success && res.data) setInvoices(res.data.invoices);
    } catch (e) {
      toast.error('Failed to load invoices');
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
      if (res.success) {
        toast.success('Expense recorded');
        setExpenseDialogOpen(false);
        setExpenseForm({ expense_type: 'garage', description: '', amount: '', incurred_at: '', vehicle_id: '' });
        loadCompanyExpenses(selectedCompanyId);
      }
    } catch (e) {
      toast.error('Failed to record expense');
    }
  }

  function addLineItem() {
    setLineItems([...lineItems, { id: Date.now(), invoice_id: 0, description: '', quantity: 1, unit_price: 0, total_price: 0 }]);
  }

  function updateLineItem(index: number, field: string, value: any) {
    const updated = [...lineItems];
    (updated[index] as any)[field] = value;
    if (field === 'quantity' || field === 'unit_price') {
      updated[index].total_price = Number(updated[index].quantity || 0) * Number(updated[index].unit_price || 0);
    }
    setLineItems(updated);
  }

  function removeLineItem(index: number) {
    setLineItems(lineItems.filter((_, i) => i !== index));
  }

  async function handleGenerateInvoice(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCompanyId) {
      toast.error('Please select a company');
      return;
    }
    if (lineItems.length === 0) {
      toast.error('Add at least one line item');
      return;
    }
    try {
      const res = await fleetsApi.generateFleetInvoice(selectedCompanyId, {
        period_start: invoiceForm.period_start,
        period_end: invoiceForm.period_end,
        tax_amount: Number(invoiceForm.tax_amount) || 0,
        currency: invoiceForm.currency,
        due_date: invoiceForm.due_date || undefined,
        notes: invoiceForm.notes || undefined,
        line_items: lineItems.map(li => ({ description: li.description, quantity: li.quantity, unit_price: li.unit_price, total_price: li.total_price })),
      });
      if (res.success && res.data) {
        setCurrentInvoice(res.data.invoice);
        setInvoiceDialogOpen(false);
        setLineItems([]);
        setInvoiceForm({ period_start: '', period_end: '', tax_amount: '', currency: 'KES', due_date: '', notes: '' });
        toast.success('Invoice draft created');
        loadCompanyInvoices(selectedCompanyId);
      } else {
        toast.error(res.message || 'Failed to generate invoice');
      }
    } catch (e) {
      toast.error('Failed to generate invoice');
    }
  }

  async function handleSendInvoice(invoice: FleetInvoice) {
    try {
      const res = await fleetsApi.sendFleetInvoice(invoice.id);
      if (res.success) {
        toast.success('Invoice sent via email');
        loadCompanyInvoices(selectedCompanyId);
      }
    } catch (e) {
      toast.error('Failed to send invoice');
    }
  }

  async function handleDownloadPdf(id: number) {
    try {
      const blob = await fleetsApi.downloadFleetInvoicePdf(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Downloading PDF');
    } catch (e) {
      toast.error('Failed to download PDF');
    }
  }

  const subtotal = lineItems.reduce((s, li) => s + li.total_price, 0);
  const tax = Number(invoiceForm.tax_amount) || 0;
  const total = subtotal + tax;

  const garageExpenses = expenses.filter(e => e.expense_type === 'garage').reduce((s, e) => s + e.amount, 0);
  const driverSurcharges = expenses.filter(e => e.expense_type === 'driver_surcharge').reduce((s, e) => s + e.amount, 0);

  if (loading) {
    return <div className="p-8 text-slate-500">Loading billing data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Fleet Billing & Invoicing</h2>
          <p className="text-slate-500">Consolidated invoicing and payment tracking for B2B fleets</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-4 lg:col-span-1 space-y-4">
          <h3 className="font-semibold">Select Company</h3>
          <select className="w-full border rounded-md p-2" value={selectedCompanyId || ''} onChange={e => setSelectedCompanyId(Number(e.target.value))}>
            <option value="">Select a company</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {company && (
            <div className="space-y-2 text-sm">
              <div><span className="text-slate-500">Contact:</span> {company.contact_name || '-'}</div>
              <div><span className="text-slate-500">Email:</span> {company.email || '-'}</div>
              <div><span className="text-slate-500">Phone:</span> {company.phone || '-'}</div>
              <div><span className="text-slate-500">Payment Terms:</span> {company.payment_terms}</div>
            </div>
          )}
          <div className="space-y-2">
            <div className="flex items-center justify-between"><span className="text-sm text-slate-600">Garage Expenses</span><span className="font-medium">KSh {garageExpenses.toLocaleString()}</span></div>
            <div className="flex items-center justify-between"><span className="text-sm text-slate-600">Driver Surcharges</span><span className="font-medium">KSh {driverSurcharges.toLocaleString()}</span></div>
            <div className="border-t pt-2 flex items-center justify-between"><span className="text-sm font-medium">Invoice Total</span><span className="font-bold">KSh {(garageExpenses + driverSurcharges).toLocaleString()}</span></div>
          </div>
          <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
            <DialogTrigger asChild><Button variant="outline" className="w-full"><Plus className="h-4 w-4 mr-2" />Add Expense</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Fleet Expense</DialogTitle>
                <DialogDescription>Record a new expense for the fleet</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddExpense} className="space-y-3">
                <div><Label>Type</Label>
                  <select className="w-full border rounded-md p-2" value={expenseForm.expense_type} onChange={e => setExpenseForm({ ...expenseForm, expense_type: e.target.value })}>
                    <option value="garage">Garage</option>
                    <option value="driver_surcharge">Driver Surcharge</option>
                    <option value="fuel">Fuel</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div><Label>Description</Label><Input required value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })} /></div>
                <div><Label>Amount (KES)</Label><Input type="number" required value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })} /></div>
                <div><Label>Date</Label><Input type="date" value={expenseForm.incurred_at} onChange={e => setExpenseForm({ ...expenseForm, incurred_at: e.target.value })} /></div>
                <div><Label>Vehicle ID</Label><Input type="number" value={expenseForm.vehicle_id} onChange={e => setExpenseForm({ ...expenseForm, vehicle_id: e.target.value })} /></div>
                <Button type="submit" className="w-full">Record Expense</Button>
              </form>
            </DialogContent>
          </Dialog>
        </Card>

        <Card className="p-4 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Itemized Breakdown</h3>
            <Dialog open={invoiceDialogOpen} onOpenChange={(open) => { setInvoiceDialogOpen(open); if (!open) { setLineItems([]); setCurrentInvoice(null); }}}>
              <DialogTrigger asChild><Button><FileText className="h-4 w-4 mr-2" />New Invoice</Button></DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Consolidated Invoice Builder</DialogTitle>
                  <DialogDescription>Create a new consolidated invoice for the fleet</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleGenerateInvoice} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Period Start</Label><Input type="date" required value={invoiceForm.period_start} onChange={e => setInvoiceForm({ ...invoiceForm, period_start: e.target.value })} /></div>
                    <div><Label>Period End</Label><Input type="date" required value={invoiceForm.period_end} onChange={e => setInvoiceForm({ ...invoiceForm, period_end: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Tax Amount (KES)</Label><Input type="number" value={invoiceForm.tax_amount} onChange={e => setInvoiceForm({ ...invoiceForm, tax_amount: e.target.value })} /></div>
                    <div><Label>Currency</Label><Input value={invoiceForm.currency} onChange={e => setInvoiceForm({ ...invoiceForm, currency: e.target.value })} /></div>
                  </div>
                  <div><Label>Due Date</Label><Input type="date" value={invoiceForm.due_date} onChange={e => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })} /></div>
                  <div><Label>Notes</Label><Textarea value={invoiceForm.notes} onChange={e => setInvoiceForm({ ...invoiceForm, notes: e.target.value })} /></div>
                  <div>
                    <div className="flex items-center justify-between mb-2"><Label>Line Items</Label><Button type="button" size="sm" variant="outline" onClick={addLineItem}><Plus className="h-4 w-4 mr-1" />Add</Button></div>
                    <div className="space-y-2">
                      {lineItems.map((li, i) => (
                        <div key={li.id} className="grid grid-cols-12 gap-2 items-end">
                          <div className="col-span-5"><Input placeholder="Description" value={li.description} onChange={e => updateLineItem(i, 'description', e.target.value)} /></div>
                          <div className="col-span-2"><Input type="number" placeholder="Qty" value={li.quantity} onChange={e => updateLineItem(i, 'quantity', Number(e.target.value))} /></div>
                          <div className="col-span-2"><Input type="number" placeholder="Unit Price" value={li.unit_price} onChange={e => updateLineItem(i, 'unit_price', Number(e.target.value))} /></div>
                          <div className="col-span-2"><Input type="number" placeholder="Total" value={li.total_price} readOnly /></div>
                          <div className="col-span-1"><Button type="button" variant="ghost" size="sm" onClick={() => removeLineItem(i)}><Trash2 className="h-4 w-4 text-red-600" /></Button></div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="text-right text-sm text-slate-600">Subtotal: KSh {subtotal.toLocaleString()} | Tax: KSh {tax.toLocaleString()} | Total: <span className="font-bold">KSh {total.toLocaleString()}</span></div>
                  <Button type="submit" className="w-full">Create Invoice Draft</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm text-slate-600">Recent Invoices</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-slate-500 py-6">No invoices yet.</TableCell></TableRow>}
                {invoices.map(inv => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                    <TableCell>{new Date(inv.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge className={inv.status === 'paid' ? 'bg-green-100 text-green-800' : inv.status === 'sent' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'}>{inv.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">KSh {inv.total_amount.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleDownloadPdf(inv.id)}><Download className="h-4 w-4" /></Button>
                        {inv.status !== 'paid' && <Button variant="ghost" size="sm" onClick={() => handleSendInvoice(inv)}><Send className="h-4 w-4" /></Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          </Card>
      </div>
    </div>
  );
}
