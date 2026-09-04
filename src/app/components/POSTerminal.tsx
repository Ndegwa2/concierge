import { useState, useEffect } from 'react';
import { Check, Receipt, CreditCard, Wallet, Trash2, Plus, X, Percent, Delete, Shield, Download, ArrowLeft } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/app/components/ui/utils';
import { adminApi, posApi } from '@/services/api/admin';

interface LineItem {
  id: string;
  type: 'pass-through' | 'service-fee';
  label: string;
  amount: number;
}

export interface POSTerminalProps {
  onClose?: () => void;
  userType?: 'customer' | 'employee' | 'admin' | 'super_admin' | null;
  /** When set, the terminal acts in employee mode and bills the
   *  appointment attached to the given assignment id. */
  mode?: 'admin' | 'employee';
  assignmentId?: number;
  prefill?: {
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    initialLineItems?: Array<{ type: 'pass-through' | 'service-fee'; label: string; amount: number }>;
  };
}

export function POSTerminal({ onClose, userType, mode = 'admin', assignmentId, prefill }: POSTerminalProps) {
  const isAdmin = mode === 'admin';
  const canAccess = isAdmin
    ? userType === 'admin' || userType === 'super_admin'
    : userType === 'employee' || userType === 'admin' || userType === 'super_admin';

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center">
        <div className="text-center space-y-4">
          <Shield className="h-16 w-16 text-red-400 mx-auto" />
          <h1 className="text-3xl font-bold text-white">Access Denied</h1>
          <p className="text-slate-400 max-w-md">
            {isAdmin
              ? 'The POS Terminal is restricted to administrators only.'
              : 'You do not have access to the POS Terminal.'}
          </p>
          {onClose && (
            <Button variant="outline" onClick={onClose} className="mt-4">
              <X className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          )}
        </div>
      </div>
    );
  }

  const [activePayment, setActivePayment] = useState<'mpesa' | 'card' | 'cash'>('cash');
  const [keypadInput, setKeypadInput] = useState('0');
  const [lineItems, setLineItems] = useState<LineItem[]>(
    prefill?.initialLineItems?.length
        ? prefill.initialLineItems.map((it, i) => ({
            id: `prefill-${i}`,
            type: it.type,
            label: it.label,
            amount: it.amount,
          }))
        : [
            { id: '1', type: 'pass-through', label: 'Synthetic Oil Change (Parts)', amount: 6500 },
            { id: '2', type: 'service-fee', label: 'Concierge Logistics Fee', amount: 2500 },
          ]
  );
  const [discountPercent, setDiscountPercent] = useState(5);
  const [vatPercent] = useState(16);
  const [cashTendered, setCashTendered] = useState(0);
  const [customerName, setCustomerName] = useState(prefill?.customerName ?? '');
  const [customerEmail, setCustomerEmail] = useState(prefill?.customerEmail ?? '');
  const [customerPhone, setCustomerPhone] = useState(prefill?.customerPhone ?? '');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (prefill) {
      if (prefill.customerName !== undefined) setCustomerName(prefill.customerName);
      if (prefill.customerEmail !== undefined) setCustomerEmail(prefill.customerEmail);
      if (prefill.customerPhone !== undefined) setCustomerPhone(prefill.customerPhone);
    }
  }, [prefill?.customerName, prefill?.customerEmail, prefill?.customerPhone]);

  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const discountAmount = Math.round(subtotal * (discountPercent / 100));
  const taxableAmount = subtotal - discountAmount;
  const vatAmount = Math.round(taxableAmount * (vatPercent / 100));
  const grandTotal = taxableAmount + vatAmount;
  const changeDue = cashTendered - grandTotal;

  const handleKeypadPress = (key: string) => {
    if (key === 'C') {
      setKeypadInput('0');
      return;
    }
    if (key === 'DEL') {
      setKeypadInput((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'));
      return;
    }
    if (key === '.') {
      if (!keypadInput.includes('.')) {
        setKeypadInput((prev) => prev + '.');
      }
      return;
    }
    if (key === '%') {
      setDiscountPercent((prev) => (prev >= 100 ? 0 : prev + 5));
      toast.info(`Discount set to ${discountPercent >= 100 ? 0 : discountPercent + 5}%`);
      return;
    }
    setKeypadInput((prev) => {
      if (prev === '0' && key !== '.') return key;
      if (prev.includes('.') && prev.split('.')[1].length >= 2) return prev;
      return prev + key;
    });
  };

  const handleQuickAdd = (type: 'pass-through' | 'service-fee') => {
    const newItem: LineItem = {
      id: Date.now().toString(),
      type,
      label: type === 'pass-through' ? 'New Pass-Through Item' : 'New Service Fee',
      amount: 0,
    };
    setLineItems([...lineItems, newItem]);
    toast.success(`Added ${type === 'pass-through' ? 'Pass-Through' : 'Service Fee'} item`);
  };

  const handleRemoveItem = (id: string) => {
    setLineItems(lineItems.filter((item) => item.id !== id));
  };

  const handleCheckout = async () => {
    if (activePayment === 'cash' && cashTendered < grandTotal) {
      toast.error('Cash tendered is less than grand total');
      return;
    }

    if (lineItems.length === 0) {
      toast.error('Add at least one line item');
      return;
    }

    setIsProcessing(true);

    try {
      const payload = {
        customer_name: customerName || undefined,
        customer_email: customerEmail || undefined,
        customer_phone: customerPhone || undefined,
        payment_method: activePayment,
        line_items: lineItems.map((item) => ({
          description: item.label,
          quantity: 1,
          unit_price: item.amount,
          total_price: item.amount,
        })),
        discount_amount: discountAmount,
        tax_amount: vatAmount,
        notes: notes || undefined,
        cash_tendered: activePayment === 'cash' ? cashTendered : undefined,
      };

      const response = isAdmin
        ? await adminApi.posCheckout(payload)
        : await posApi.employeeCheckout(assignmentId!, payload);

      if (response.success) {
        toast.success(
          isAdmin
            ? `Checkout completed! KES ${grandTotal.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`
            : `Invoice queued for admin verification (KES ${grandTotal.toLocaleString('en-KE', { minimumFractionDigits: 2 })})`,
        );
        onClose?.();
      } else {
        toast.error(response.message || 'Checkout failed');
      }
    } catch (error) {
      toast.error('Failed to complete checkout');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatKES = (value: number) =>
    `KES ${value.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header Bar */}
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:text-white"
              onClick={onClose}
              aria-label="Close POS Terminal"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <h1 className="text-sm font-medium text-slate-400 tracking-wide">
            Auto-Concierge POS Terminal v1.2
            <span className="ml-3 text-xs uppercase tracking-wider text-slate-500">
              {isAdmin ? 'Admin mode' : 'Employee mode'}
            </span>
          </h1>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        )}
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left Panel - Checkout & Billing Summary */}
        <div className="w-full lg:w-[60%] border-r border-slate-800 flex flex-col">
          {/* Client Metadata */}
          <div className="px-6 py-4 border-b border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">POS CHECKOUT</h2>
                <p className="text-sm text-slate-400">Create invoice and process payment</p>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Receipt className="h-5 w-5" />
                <span className="text-sm">Receipt</span>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="px-6 py-4 border-b border-slate-800 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Customer Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Walk-in Customer"
                  className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Email (optional)</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="for receipt"
                  className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Phone (optional)</label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+254 700 000 000"
                className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes"
                className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
            {lineItems.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-900/50',
                  item.type === 'pass-through' ? 'border-l-amber-500' : 'border-l-blue-500'
                )}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span
                    className={cn(
                      'text-xs font-bold px-2 py-1 rounded-md shrink-0',
                      item.type === 'pass-through'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    )}
                  >
                    {item.type === 'pass-through' ? '[Pass-Through]' : '[Service Fee]'}
                  </span>
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) => {
                      const newItems = lineItems.map((i) =>
                        i.id === item.id ? { ...i, label: e.target.value } : i
                      );
                      setLineItems(newItems);
                    }}
                    className="text-sm text-slate-200 bg-transparent border-none focus:outline-none focus:ring-0 flex-1 min-w-0"
                  />
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <input
                    type="number"
                    value={item.amount}
                    onChange={(e) => {
                      const newItems = lineItems.map((i) =>
                        i.id === item.id ? { ...i, amount: Number(e.target.value) || 0 } : i
                      );
                      setLineItems(newItems);
                    }}
                    className="w-24 text-right bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-slate-500 hover:text-red-400"
                    onClick={() => handleRemoveItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Financial Summary */}
          <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/30 space-y-2">
            <div className="flex justify-between text-sm text-slate-400">
              <span>Subtotal</span>
              <span>{formatKES(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-400">
              <span>Discount ({discountPercent}%)</span>
              <span className="text-red-400">-{formatKES(discountAmount)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-400">
              <span>VAT ({vatPercent}%)</span>
              <span>{formatKES(vatAmount)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold text-emerald-400 pt-2 border-t border-slate-800">
              <span>Grand Total</span>
              <span>{formatKES(grandTotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-400 pt-2">
              <span>Cash Tendered</span>
              <input
                type="number"
                value={cashTendered}
                onChange={(e) => setCashTendered(Number(e.target.value) || 0)}
                className="w-32 text-right bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex justify-between text-sm font-medium text-slate-300">
              <span>Change Due</span>
              <span className={changeDue >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                {formatKES(Math.max(0, changeDue))}
              </span>
            </div>
          </div>

          {/* Payment Selector */}
          <div className="px-6 py-4 border-t border-slate-800">
            <div className="flex gap-2">
              {[
                { key: 'mpesa', label: 'M-PESA', icon: Wallet },
                { key: 'card', label: 'CARD', icon: CreditCard },
                { key: 'cash', label: 'CASH', icon: Wallet },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActivePayment(key as typeof activePayment)}
                  className={cn(
                    'flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all border',
                    activePayment === key
                      ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                  )}
                >
                  <Icon className="h-4 w-4 mx-auto mb-1" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Checkout Button */}
          <div className="px-6 py-4 border-t border-slate-800">
            <Button
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg py-6"
              onClick={handleCheckout}
              disabled={isProcessing}
            >
              <Check className="h-5 w-5 mr-2" />
              {isProcessing ? 'Processing...' : `Complete Checkout (${formatKES(grandTotal)})`}
            </Button>
          </div>
        </div>

        {/* Right Panel - Numpad & Calculator */}
        <div className="w-full lg:w-[40%] bg-slate-900 p-6 flex flex-col gap-4">
          {/* Digital Display */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 text-center">
            <p className="text-xs text-slate-500 mb-2 tracking-wider">KEYPAD INPUT TERMINAL</p>
            <p className="text-5xl font-mono font-bold text-emerald-400 tracking-tight">
              {Number(keypadInput).toLocaleString('en-KE', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>

          {/* Quick-Add Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
              onClick={() => handleQuickAdd('pass-through')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Pass-Through Parts
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
              onClick={() => handleQuickAdd('service-fee')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Logistics Fee
            </Button>
          </div>

          {/* 3x4 Numpad Grid */}
          <div className="grid grid-cols-4 gap-2">
            {['7', '8', '9', 'DEL', '4', '5', '6', 'C', '1', '2', '3', '%', '0', '.', 'CASH', 'CLEAR'].map((key) => {
              const isRed = key === 'C' || key === 'CLEAR';
              const isGreen = key === 'CASH';
              const isPercent = key === '%';

              return (
                <button
                  key={key}
                  onClick={() => {
                    if (key === 'CASH') {
                      setCashTendered(Number(keypadInput) || 0);
                      toast.success(`Cash tendered set to ${formatKES(Number(keypadInput) || 0)}`);
                      return;
                    }
                    if (key === 'CLEAR') {
                      setKeypadInput('0');
                      setDiscountPercent(5);
                      setCashTendered(0);
                      toast.info('Transaction cleared');
                      return;
                    }
                    handleKeypadPress(key);
                  }}
                  className={cn(
                    'h-14 rounded-lg text-lg font-semibold transition-all border',
                    isRed
                      ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
                      : isGreen
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500 shadow-lg shadow-emerald-500/20 hover:bg-emerald-500/20'
                        : isPercent
                          ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                          : 'bg-slate-800 text-white border-slate-700 hover:bg-slate-700'
                  )}
                >
                  {key === 'DEL' ? <Delete className="h-5 w-5 mx-auto" /> : key}
                </button>
              );
            })}
          </div>

          {/* Specialized POS Function Keys */}
          <div className="grid grid-cols-3 gap-2 mt-auto">
            <Button
              variant="outline"
              className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-12"
              onClick={() => {
                setKeypadInput('0');
                setDiscountPercent(5);
                setCashTendered(0);
                toast.info('Transaction cleared');
              }}
            >
              CLEAR
            </Button>
            <Button
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-800 h-12"
              onClick={() => {
                setDiscountPercent((prev) => (prev >= 100 ? 0 : prev + 5));
                toast.info(`Discount set to ${discountPercent >= 100 ? 0 : discountPercent + 5}%`);
              }}
            >
              <Percent className="h-4 w-4 mr-2" />
              DISCOUNT
            </Button>
            <Button
              className="bg-emerald-500/10 border border-emerald-500 text-emerald-400 hover:bg-emerald-500/20 h-12"
              onClick={() => {
                setCashTendered(Number(keypadInput) || 0);
                toast.success(`Cash tendered set to ${formatKES(Number(keypadInput) || 0)}`);
              }}
            >
              <Wallet className="h-4 w-4 mr-2" />
              CASH GIVEN
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
