import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  Car,
  TrendingUp,
  CheckCircle2,
  Star,
  Activity,
  Wallet,
  Gauge,
  LogOut
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
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

export function CustomerDashboard({ onLogout }: { onLogout?: () => void } = {}) {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: appointments = [], isLoading: appointmentsLoading } = useAppointments();
  const { data: vehicles = [], isLoading: vehiclesLoading } = useVehicles();

  const [activeTab, setActiveTab] = useState('overview');

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div className="animate-pulse space-y-6" variants={container} initial="hidden" animate="show">
            <div className="h-10 bg-slate-200 rounded w-64" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <motion.div key={i} className="h-32 bg-slate-200 rounded-2xl" variants={item} />
              ))}
            </div>
            <div className="h-96 bg-slate-200 rounded-2xl" />
          </motion.div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">Please log in to view your dashboard.</p>
        </div>
      </div>
    );
  }

  const StatCard = ({ icon: Icon, label, value, subtext, color, delay }: any) => (
    <motion.div variants={item} transition={{ delay }}>
      <Card className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow">
        <div className={`absolute inset-0 ${color} opacity-5`} />
        <CardContent className="pt-6 pb-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">{label}</p>
              <motion.p
                className="text-3xl font-bold text-slate-900"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 100, delay: delay + 0.2 }}
              >
                {value}
              </motion.p>
              {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
            </div>
            <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
              <Icon className={`h-6 w-6 ${color.replace('bg-', 'text-')}`} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  const ProgressBar = ({ value, max, color }: { value: number; max: number; color: string }) => {
    const percentage = max > 0 ? (value / max) : 0;
    return (
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${color} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(percentage * 100, 100)}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
              <p className="text-slate-600 mt-1">Welcome back, {profile.name}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="capitalize">
                {profile.role}
              </Badge>
              {onLogout && (
                <Button variant="outline" size="sm" onClick={onLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          variants={container}
          initial="hidden"
          animate="show"
        >
          <StatCard
            icon={Calendar}
            label="Total Appointments"
            value={appointments.length}
            subtext={`${upcomingAppointments.length} upcoming`}
            color="bg-blue-500"
            delay={0}
          />
          <StatCard
            icon={Car}
            label="Vehicles"
            value={vehicles.length}
            subtext={`${activeVehicles} active`}
            color="bg-emerald-500"
            delay={0.1}
          />
          <StatCard
            icon={Wallet}
            label="Total Spent"
            value={formatCurrency(totalSpent)}
            subtext={`${completedAppointments.length} completed`}
            color="bg-amber-500"
            delay={0.2}
          />
          <StatCard
            icon={Star}
            label="Loyalty Points"
            value={loyaltyPoints.toLocaleString()}
            subtext={`Avg rating: ${avgRating}`}
            color="bg-purple-500"
            delay={0.3}
          />
        </motion.div>

        {/* Main Content Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <Card className="border-0 shadow-sm">
            <CardHeader className="border-b border-slate-100">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-slate-100 p-1 rounded-xl">
                  <TabsTrigger value="overview" className="rounded-lg">Overview</TabsTrigger>
                  <TabsTrigger value="appointments">Appointments</TabsTrigger>
                  <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
                  <TabsTrigger value="spending">Spending</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className="p-6">
              <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                  <motion.div
                    key="overview"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    {/* Activity Chart Placeholder */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <Card className="lg:col-span-2 border border-slate-100">
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Activity className="h-4 w-4 text-slate-500" />
                            Service Activity
                          </CardTitle>
                          <CardDescription>Your service history over time</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="h-48 flex items-end justify-between gap-2 px-4">
                            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month, i) => {
                              const height = ((i * 37 + 15) % 60) + 20;
                              return (
                                <motion.div
                                  key={month}
                                  className="flex-1 flex flex-col items-center gap-2"
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: i * 0.1 }}
                                >
                                  <motion.div
                                    className="w-full bg-slate-900 rounded-t-lg"
                                    initial={{ height: 0 }}
                                    animate={{ height: `${height}%` }}
                                    transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }}
                                  />
                                  <span className="text-xs text-slate-500">{month}</span>
                                </motion.div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border border-slate-100">
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-slate-500" />
                            Spending Breakdown
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-slate-600">Completed</span>
                              <span className="font-medium">{completedAppointments.length}</span>
                            </div>
                            <ProgressBar value={completedAppointments.length} max={appointments.length || 1} color="bg-emerald-500" />
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-slate-600">Upcoming</span>
                              <span className="font-medium">{upcomingAppointments.length}</span>
                            </div>
                            <ProgressBar value={upcomingAppointments.length} max={appointments.length || 1} color="bg-blue-500" />
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-slate-600">Cancelled</span>
                              <span className="font-medium">{appointments.filter(a => a.status === 'cancelled').length}</span>
                            </div>
                            <ProgressBar value={appointments.filter(a => a.status === 'cancelled').length} max={appointments.length || 1} color="bg-red-500" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Recent Activity */}
                    <Card className="border border-slate-100">
                      <CardHeader>
                        <CardTitle className="text-base">Recent Activity</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {recentCompleted.length === 0 ? (
                          <div className="text-center py-8">
                            <Activity className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-sm text-slate-500">No recent activity</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
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
                )}

                {activeTab === 'appointments' && (
                  <motion.div
                    key="appointments"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    {upcomingAppointments.length === 0 ? (
                      <div className="text-center py-12">
                        <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">No upcoming appointments</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {upcomingAppointments.map((apt, i) => {
                          const status = statusConfig[apt.status] || statusConfig.scheduled;
                          return (
                            <motion.div
                              key={apt.id}
                              className="flex items-center justify-between p-5 bg-slate-50 rounded-xl border border-slate-100"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.08 }}
                            >
                              <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-xl ${status.bg}`}>
                                  <Calendar className={`h-5 w-5 ${status.color}`} />
                                </div>
                                <div>
                                  <p className="font-medium text-slate-900">
                                    {apt.service?.name || `Appointment #${apt.id}`}
                                  </p>
                                  <p className="text-sm text-slate-500 mt-0.5">
                                    {formatDate(apt.appointment_date)}
                                  </p>
                                  {apt.vehicle && (
                                    <p className="text-xs text-slate-400 mt-1">
                                      {apt.vehicle.year} {apt.vehicle.make} {apt.vehicle.model}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <Badge className={`${status.color} ${status.bg} border-0`}>
                                {status.label}
                              </Badge>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'vehicles' && (
                  <motion.div
                    key="vehicles"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    {vehicles.length === 0 ? (
                      <div className="text-center py-12">
                        <Car className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">No vehicles registered yet</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {vehicles.map((vehicle, i) => (
                          <motion.div
                            key={vehicle.id}
                            className="p-5 bg-slate-50 rounded-xl border border-slate-100"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.08 }}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-900 rounded-lg">
                                  <Car className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                  <p className="font-medium text-slate-900">
                                    {vehicle.year} {vehicle.make} {vehicle.model}
                                  </p>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    {vehicle.license_plate || 'No plate'}
                                  </p>
                                </div>
                              </div>
                              <Badge variant={vehicle.is_active ? 'default' : 'secondary'} className="text-xs">
                                {vehicle.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                            <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
                              {vehicle.color && (
                                <span className="flex items-center gap-1">
                                  <div className="w-3 h-3 rounded-full bg-slate-300" />
                                  {vehicle.color}
                                </span>
                              )}
                              {vehicle.odometer && (
                                <span className="flex items-center gap-1">
                                  <Gauge className="h-3 w-3" />
                                  {Number(vehicle.odometer).toLocaleString()} km
                                </span>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'spending' && (
                  <motion.div
                    key="spending"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="border border-slate-100">
                        <CardContent className="pt-6">
                          <p className="text-sm text-slate-500 mb-1">Total Spent</p>
                          <motion.p
                            className="text-2xl font-bold text-slate-900"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                          >
                            {formatCurrency(totalSpent)}
                          </motion.p>
                        </CardContent>
                      </Card>
                      <Card className="border border-slate-100">
                        <CardContent className="pt-6">
                          <p className="text-sm text-slate-500 mb-1">Avg. per Service</p>
                          <motion.p
                            className="text-2xl font-bold text-slate-900"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                          >
                            {completedAppointments.length > 0
                              ? formatCurrency(totalSpent / completedAppointments.length)
                              : formatCurrency(0)}
                          </motion.p>
                        </CardContent>
                      </Card>
                      <Card className="border border-slate-100">
                        <CardContent className="pt-6">
                          <p className="text-sm text-slate-500 mb-1">Loyalty Points</p>
                          <motion.p
                            className="text-2xl font-bold text-amber-600"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                          >
                            {loyaltyPoints.toLocaleString()}
                          </motion.p>
                        </CardContent>
                      </Card>
                    </div>

                    {recentCompleted.length === 0 ? (
                      <div className="text-center py-12">
                        <Wallet className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">No completed services yet</p>
                      </div>
                    ) : (
                      <Card className="border border-slate-100">
                        <CardHeader>
                          <CardTitle className="text-base">Recent Transactions</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {recentCompleted.map((apt, i) => (
                              <motion.div
                                key={apt.id}
                                className="flex items-center justify-between p-4 bg-slate-50 rounded-xl"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.08 }}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-emerald-50 rounded-lg">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm text-slate-900">
                                      {apt.service?.name || `Appointment #${apt.id}`}
                                    </p>
                                    <p className="text-xs text-slate-500">{formatDate(apt.appointment_date)}</p>
                                  </div>
                                </div>
                                <p className="font-semibold text-slate-900">
                                  {apt.total_amount ? formatCurrency(apt.total_amount) : '—'}
                                </p>
                              </motion.div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
