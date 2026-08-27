import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/app/components/ui/table';
import { toast } from 'sonner';
import { fleetsApi } from '@/services/api';

const COLORS = ['#0f172a', '#334155', '#94a3b8', '#cbd5e1'];

type Quarter = { name: string; retail: number; fleet: number; expenses: number };

export function FleetAnalytics() {
  const [revenueData, setRevenueData] = useState<Quarter[]>([]);
  const [serviceTypeData, setServiceTypeData] = useState<{ name: string; value: number }[]>([]);
  const [partnerMatrix, setPartnerMatrix] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      setLoading(true);
      const companiesRes = await fleetsApi.getCompanies({ per_page: 100 });

      const companies = companiesRes.success && companiesRes.data ? companiesRes.data.companies : [];
      const allExpenses: any[] = [];
      const allInvoices: any[] = [];
      for (const c of companies) {
        const [expensesRes, invoicesRes] = await Promise.all([
          fleetsApi.getCompanyExpenses(c.id),
          fleetsApi.getCompanyInvoices(c.id),
        ]);
        if (expensesRes.success && expensesRes.data) {
          allExpenses.push(...expensesRes.data.expenses.map((e: any) => ({ ...e, company_name: c.name })));
        }
        if (invoicesRes.success && invoicesRes.data) {
          allInvoices.push(...invoicesRes.data.invoices.map((i: any) => ({ ...i, company_name: c.name })));
        }
      }

      const q1 = allExpenses.filter(e => {
        const d = new Date(e.incurred_at);
        return d.getMonth() >= 0 && d.getMonth() <= 2;
      });
      const q2 = allExpenses.filter(e => {
        const d = new Date(e.incurred_at);
        return d.getMonth() >= 3 && d.getMonth() <= 5;
      });
      const q3 = allExpenses.filter(e => {
        const d = new Date(e.incurred_at);
        return d.getMonth() >= 6 && d.getMonth() <= 8;
      });
      const q4 = allExpenses.filter(e => {
        const d = new Date(e.incurred_at);
        return d.getMonth() >= 9 && d.getMonth() <= 11;
      });

      const invoicesQ1 = allInvoices.filter(i => new Date(i.created_at).getMonth() <= 2);
      const invoicesQ2 = allInvoices.filter(i => { const m = new Date(i.created_at).getMonth(); return m >= 3 && m <= 5; });
      const invoicesQ3 = allInvoices.filter(i => { const m = new Date(i.created_at).getMonth(); return m >= 6 && m <= 8; });
      const invoicesQ4 = allInvoices.filter(i => new Date(i.created_at).getMonth() >= 9);

      setRevenueData([
        { name: 'Q1', fleet: invoicesQ1.reduce((s, i) => s + i.total_amount, 0), expenses: q1.reduce((s, e) => s + e.amount, 0) },
        { name: 'Q2', fleet: invoicesQ2.reduce((s, i) => s + i.total_amount, 0), expenses: q2.reduce((s, e) => s + e.amount, 0) },
        { name: 'Q3', fleet: invoicesQ3.reduce((s, i) => s + i.total_amount, 0), expenses: q3.reduce((s, e) => s + e.amount, 0) },
        { name: 'Q4', fleet: invoicesQ4.reduce((s, i) => s + i.total_amount, 0), expenses: q4.reduce((s, e) => s + e.amount, 0) },
      ]);

      const byType: Record<string, number> = {};
      for (const e of allExpenses) {
        byType[e.expense_type] = (byType[e.expense_type] || 0) + e.amount;
      }
      setServiceTypeData(Object.entries(byType).map(([name, value]) => ({ name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), value })));

      const byCompany: Record<string, { total: number; garage: number; driver: number; other: number }> = {};
      for (const e of allExpenses) {
        const entry = byCompany[e.company_name] || { total: 0, garage: 0, driver: 0, other: 0 };
        entry.total += e.amount;
        if (e.expense_type === 'garage') entry.garage += e.amount;
        else if (e.expense_type === 'driver_surcharge') entry.driver += e.amount;
        else entry.other += e.amount;
        byCompany[e.company_name] = entry;
      }
      setPartnerMatrix(Object.entries(byCompany).map(([company, data]) => ({ company, ...data })));
    } catch (e) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-slate-500">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Fleet Analytics</h2>
          <p className="text-slate-500">Revenue trends and financial insights</p>
        </div>
        <Button variant="outline" onClick={loadAnalytics}>Refresh</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-4">
          <h3 className="font-semibold mb-4">Quarterly Revenue vs Expenses</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: any) => `KSh ${Number(value).toLocaleString()}`} />
                <Legend />
                <Line type="monotone" dataKey="fleet" stroke="#334155" strokeWidth={2} name="B2B Fleet Invoices" />
                <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Operational Expenses" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-4">Revenue by Service Type</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={serviceTypeData} cx="50%" cy="50%" labelLine={false} label={(entry) => entry.name} outerRadius={100} fill="#8884d8" dataKey="value">
                  {serviceTypeData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value: any) => `KSh ${Number(value).toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <h3 className="font-semibold mb-4">Partner Transaction Matrix</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead className="text-right">Garage Payouts</TableHead>
                <TableHead className="text-right">Driver Surcharges</TableHead>
                <TableHead className="text-right">Other</TableHead>
                <TableHead className="text-right">Outstanding Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partnerMatrix.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-slate-500 py-6">No transaction data yet.</TableCell></TableRow>}
              {partnerMatrix.map((row, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{row.company}</TableCell>
                  <TableCell className="text-right">KSh {row.garage.toLocaleString()}</TableCell>
                  <TableCell className="text-right">KSh {row.driver.toLocaleString()}</TableCell>
                  <TableCell className="text-right">KSh {row.other.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-medium">KSh {row.total.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
