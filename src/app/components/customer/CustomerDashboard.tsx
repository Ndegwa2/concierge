import { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Car,
  CheckCircle2,
  Activity,
  Gauge,
  BookOpen,
  Wrench,
  FileText,
  ShieldAlert,
  BarChart3,
  Droplets,
  BatteryCharging,
  Disc,
  Sparkles,
  PieChart,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { useProfile, useAppointments, useVehicles } from '@/hooks/useApi';
import type { Appointment, Vehicle } from '@/services/api';

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
  }).format(amount);
}

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  scheduled: { color: 'text-blue-700', bg: 'bg-blue-50', label: 'Scheduled' },
  confirmed: { color: 'text-emerald-700', bg: 'bg-emerald-50', label: 'Confirmed' },
  'in-progress': { color: 'text-amber-700', bg: 'bg-amber-50', label: 'In Progress' },
  completed: { color: 'text-slate-700', bg: 'bg-slate-100', label: 'Completed' },
  cancelled: { color: 'text-red-700', bg: 'bg-red-50', label: 'Cancelled' },
  rescheduled: { color: 'text-purple-700', bg: 'bg-purple-50', label: 'Rescheduled' },
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

function HealthPill({ icon: Icon, label, value, status }: { icon: any; label: string; value: string; status: 'good' | 'warn' | 'alert' }) {
  const colors = {
    good: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    warn: 'text-amber-700 bg-amber-50 border-amber-200',
    alert: 'text-red-700 bg-red-50 border-red-200',
  };
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${colors[status]}`}>
      <Icon className="h-3.5 w-3.5" />
      <span>{label}: {value}</span>
    </div>
  );
}

function NextServiceWidget({ vehicle, onBookService }: { vehicle: Vehicle; onBookService?: () => void }) {
  const currentOdo = Number(vehicle.odometer) || 0;
  const serviceInterval = 10000;
  const lastServiceOdo = Math.floor(currentOdo / serviceInterval) * serviceInterval;
  const remaining = Math.max(serviceInterval - (currentOdo - lastServiceOdo), 0);
  const progress = Math.min(((serviceInterval - remaining) / serviceInterval) * 100, 100);
  const nextService = remaining < 1500 ? 'Due Soon' : 'On Track';

  return (
    <Card className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow h-full">
      <div className="absolute inset-0 bg-blue-500 opacity-[0.06]" />
      <CardContent className="pt-5 pb-5 h-full flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 rounded-xl bg-blue-50">
            <Wrench className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Next Service</p>
            <p className="text-xs text-slate-400">Oil & Filter Change</p>
          </div>
        </div>
        <div className="flex items-end justify-between mb-2">
          <div>
            <p className="text-2xl font-bold text-slate-900 leading-none">
              {remaining.toLocaleString()} <span className="text-sm font-medium text-slate-500">km</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">remaining</p>
          </div>
          <Badge variant="outline" className={`text-[10px] ${remaining < 1500 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200'}`}>
            {nextService}
          </Badge>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
          <motion.div
            className="h-full bg-blue-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          className="w-full mt-auto"
          onClick={onBookService}
        >
          Schedule Maintenance
        </Button>
      </CardContent>
    </Card>
  );
}

function QuickActions({ onBookService }: { onBookService?: () => void }) {
  const actions = [
    { label: 'Wash', icon: Sparkles, color: 'bg-sky-50 text-sky-700 hover:bg-sky-100 border-sky-200', onClick: onBookService },
    { label: 'Maintenance', icon: Wrench, color: 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200', onClick: onBookService },
    { label: 'Bill', icon: FileText, color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200', onClick: () => {} },
    { label: 'Towing', icon: ShieldAlert, color: 'bg-red-50 text-red-700 hover:bg-red-100 border-red-200', onClick: () => {} },
  ];

  return (
    <Card className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow h-full">
      <div className="absolute inset-0 bg-emerald-500 opacity-[0.06]" />
      <CardContent className="pt-5 pb-5 h-full flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl bg-emerald-50">
            <BarChart3 className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="text-sm font-medium text-slate-500">Express Book</p>
        </div>
        <div className="grid grid-cols-2 gap-3 flex-1">
          {actions.map((action, i) => (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 * i }}
              onClick={action.onClick}
              className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-colors cursor-pointer ${action.color}`}
            >
              <action.icon className="h-6 w-6" />
              <span className="text-xs font-semibold">{action.label}</span>
            </motion.button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function VehicleHealthCard({ vehicles }: { vehicles: Vehicle[] }) {
  const primary = vehicles[0];
  if (!primary) return null;

  const year = new Date().getFullYear();
  const vehicleAge = year - primary.year;
  const batteryHealth = vehicleAge <= 2 ? 98 : vehicleAge <= 4 ? 92 : 85;
  const brakeStatus = (Number(primary.odometer) || 0) > 80000 ? 'Inspect Soon' : 'Good';

  return (
    <Card className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow h-full">
      <div className="absolute inset-0 bg-emerald-500 opacity-[0.06]" />
      <CardContent className="pt-5 pb-5 h-full flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-50">
              <Car className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Vehicle Health</p>
              <p className="text-xs text-slate-400">{primary.year} {primary.make} {primary.model}</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] text-emerald-700 bg-emerald-50 border-emerald-200">
            {primary.license_plate || 'No plate'}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          <HealthPill icon={Droplets} label="Tires" value="Normal" status="good" />
          <HealthPill icon={BatteryCharging} label={`Battery ${batteryHealth}%`} value="Good" status="good" />
          <HealthPill icon={Disc} label="Brakes" value={brakeStatus} status={brakeStatus === 'Good' ? 'good' : 'warn'} />
        </div>
        <Button variant="ghost" size="sm" className="w-full mt-auto text-xs text-slate-600">
          View Full Telematics
        </Button>
      </CardContent>
    </Card>
  );
}

function MiniAnalytics({ appointments }: { appointments: Appointment[] }) {
  const completed = appointments.filter(a => a.status === 'completed');
  const thisMonth = completed.filter(a => {
    const d = new Date(a.appointment_date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const thisMonthSpend = thisMonth.reduce((s, a) => s + (a.total_amount || 0), 0);

  const categories = useMemo(() => {
    const map: Record<string, number> = {};
    completed.forEach(a => {
      const cat = a.service?.category || 'Other';
      map[cat] = (map[cat] || 0) + (a.total_amount || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [completed]);

  const total = categories.reduce((s, [, v]) => s + v, 0);

  return (
    <Card className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow h-full">
      <div className="absolute inset-0 bg-purple-500 opacity-[0.06]" />
      <CardContent className="pt-5 pb-5 h-full flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 rounded-xl bg-purple-50">
            <PieChart className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Spending</p>
            <p className="text-xs text-slate-400">This month</p>
          </div>
        </div>
        <div className="flex items-baseline gap-2 mb-2">
          <p className="text-2xl font-bold text-slate-900 leading-none">
            {formatCurrency(thisMonthSpend).replace('KES', 'Ksh')}
          </p>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[10px] text-slate-400">Sparkline:</span>
          <div className="flex-1 h-4 bg-slate-100 rounded-full relative overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 bg-purple-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: completed.length > 0 ? '60%' : '0%' }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
        </div>
        <div className="mt-auto pt-3 border-t border-slate-100">
          <p className="text-xs font-medium text-slate-600 mb-2">Active Plan</p>
          <p className="text-sm font-semibold text-emerald-700">Premium Care</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function CustomerDashboard({ onLogout, onBookService }: { onLogout?: () => void; onBookService?: () => void } = {}) {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: appointments = [], isLoading: appointmentsLoading } = useAppointments();
  const { data: vehicles = [], isLoading: vehiclesLoading } = useVehicles();

  const isLoading = profileLoading || appointmentsLoading || vehiclesLoading;

  const completedAppointments = appointments.filter(a => a.status === 'completed');
  const upcomingAppointments = appointments
    .filter(a => a.status === 'scheduled' || a.status === 'confirmed' || a.status === 'in-progress')
    .sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime());

  const totalSpent = completedAppointments.reduce((sum, a) => sum + (a.total_amount || 0), 0);
  const loyaltyPoints = Math.floor(totalSpent);
  const avgRating = completedAppointments.length > 0 ? 4.8 : 0;
  const activeVehicles = vehicles.filter(v => v.is_active).length;

  const recentCompleted = appointments
    .filter(a => a.status === 'completed')
    .sort((a, b) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime())
    .slice(0, 5);

  const nextAppointment = upcomingAppointments[0];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div className="animate-pulse space-y-6" variants={container} initial="hidden" animate="show">
            <div className="h-10 bg-slate-200 rounded w-64" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <motion.div key={i} className="h-40 bg-slate-200 rounded-2xl" variants={item} />
              ))}
            </div>
            <div className="h-48 bg-slate-200 rounded-2xl" />
          </motion.div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Activity className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">Please log in to view your dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Greeting */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                Welcome back, {profile.name}
              </h1>
              <p className="text-slate-600 mt-1 text-lg">
                Here's what's happening with your vehicles today.
              </p>
            </div>
            <Button
              size="lg"
              className="bg-slate-900 text-white hover:bg-slate-800 px-6 py-3 font-medium"
              onClick={onBookService}
            >
              <BookOpen className="mr-2 h-5 w-5" />
              Book Service
            </Button>
          </div>
        </motion.div>

        {/* 2x2 Widget Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6"
          variants={container}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={item} transition={{ delay: 0 }}>
            <VehicleHealthCard vehicles={vehicles} />
          </motion.div>

          <motion.div variants={item} transition={{ delay: 0.1 }}>
            {vehicles.length > 0 ? (
              <NextServiceWidget vehicle={vehicles[0]} onBookService={onBookService} />
            ) : (
              <Card className="border-0 shadow-sm h-full flex items-center justify-center">
                <CardContent className="text-center py-8">
                  <Car className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Add a vehicle to track service readiness.</p>
                </CardContent>
              </Card>
            )}
          </motion.div>

          <motion.div variants={item} transition={{ delay: 0.2 }}>
            <QuickActions onBookService={onBookService} />
          </motion.div>

          <motion.div variants={item} transition={{ delay: 0.3 }}>
            <MiniAnalytics appointments={appointments} />
          </motion.div>
        </motion.div>

        {/* Recent Activity Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <Card className="border-0 shadow-sm">
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-base font-semibold text-slate-900">Recent Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {recentCompleted.length === 0 ? (
                <div className="text-center py-10">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                    <Activity className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-700 mb-1">No recent activity</p>
                  <p className="text-xs text-slate-500 mb-4">Complete your first service to see it here.</p>
                  <Button variant="outline" size="sm" onClick={onBookService}>
                    Book Your First Service
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentCompleted.map((apt, i) => {
                    const status = statusConfig[apt.status] || statusConfig.completed;
                    return (
                      <motion.div
                        key={apt.id}
                        className="flex items-center justify-between p-4 bg-slate-50 rounded-xl"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${status.bg}`}>
                            <CheckCircle2 className={`h-5 w-5 ${status.color}`} />
                          </div>
                          <div>
                            <p className="font-medium text-sm text-slate-900">
                              {apt.service?.name || `Appointment #${apt.id}`}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {formatDate(apt.appointment_date)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm text-slate-900">
                            {apt.total_amount ? formatCurrency(apt.total_amount) : '—'}
                          </p>
                          <Badge variant="outline" className={`text-xs ${status.color} ${status.bg} border-0`}>
                            {status.label}
                          </Badge>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}