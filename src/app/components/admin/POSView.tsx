import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { toast } from 'sonner';
import { CheckCircle2, AlertCircle, Receipt, Wallet, Mail, Printer, ClipboardCheck, XCircle, ArrowRight } from 'lucide-react';
import { adminApi } from '@/services/api/admin';
import type { POSInvoice } from '@/services/api/admin';
import { POSTerminal } from '@/app/components/POSTerminal';

interface POSViewProps {
  mode?: 'admin' | 'pending-invoices';
}

export function POSView({ mode = 'pending-invoices' }: POSViewProps) {
  if (mode === 'admin') {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-emerald-500" />
              POS Terminal — Cash / Walk-in Sales
            </CardTitle>
            <CardDescription>
              Process walk-in or counter sales without a pre-existing assignment.
              Receipts are emailed to the customer immediately.
            </CardDescription>
          </CardHeader>
        </Card>
        <div className="rounded-lg overflow-hidden border border-slate-200">
          <POSTerminal mode="admin" />
        </div>
      </div>
    );
  }

  return <PendingInvoices />;
}

function PendingInvoices() {
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'pos', 'invoices', 'pending'],
    queryFn: async () => {
      const res = await adminApi.getPendingInvoices();
      if (!res.success) throw new Error(res.message || 'Failed to load');
      return res.data;
    },
    refetchOnWindowFocus: true,
  });

  const verifyMutation = useMutation({
    mutationFn: (invoiceId: number) => adminApi.verifyInvoice(invoiceId),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(`Invoice ${res.data.invoice.invoice_number} verified — customer emailed`);
        queryClient.invalidateQueries({ queryKey: ['admin', 'pos', 'invoices', 'pending'] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      } else {
        toast.error(res.message || 'Verification failed');
      }
    },
    onError: (err: any) => toast.error(err?.message || 'Verification failed'),
  });

  const invoices = data?.invoices ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-amber-500" />
            Pending Invoice Verifications
          </CardTitle>
          <CardDescription>
            Invoices created by employees via the POS Terminal. Verify them to email the customer the
            official receipt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{(error as Error).message}</AlertDescription>
            </Alert>
          )}

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
              <p className="text-slate-700 font-medium">All clear</p>
              <p className="text-sm text-slate-500 mt-1">
                No invoices are awaiting verification right now.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map((invoice) => (
                <PendingInvoiceRow
                  key={invoice.id}
                  invoice={invoice}
                  onVerify={() => verifyMutation.mutate(invoice.id)}
                  isVerifying={verifyMutation.isPending && verifyMutation.variables === invoice.id}
                />
              ))}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PendingInvoiceRow({
  invoice,
  onVerify,
  isVerifying,
}: {
  invoice: POSInvoice;
  onVerify: () => void;
  isVerifying: boolean;
}) {
  return (
    <div className="border border-slate-200 rounded-lg p-4 flex items-center justify-between gap-4 bg-white">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Receipt className="h-4 w-4 text-slate-400" />
          <span className="font-medium text-slate-900">{invoice.invoice_number}</span>
          <Badge variant="outline" className="text-xs uppercase tracking-wider">
            {invoice.status.replace('_', ' ')}
          </Badge>
          {invoice.payment_method && (
            <Badge variant="secondary" className="text-xs">
              {invoice.payment_method.toUpperCase()}
            </Badge>
          )}
        </div>
        <p className="text-sm text-slate-600">
          KES {Number(invoice.total_amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
          {invoice.appointment_id ? ` · Appointment #${invoice.appointment_id}` : ' · Walk-in'}
        </p>
        <p className="text-xs text-slate-500 mt-1">
          {new Date(invoice.created_at).toLocaleString()}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="default"
          size="sm"
          onClick={onVerify}
          disabled={isVerifying}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {isVerifying ? (
            <>Verifying…</>
          ) : (
            <>
              <Mail className="h-4 w-4 mr-1.5" />
              Verify & Email
              <ArrowRight className="h-3 w-3 ml-1" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}