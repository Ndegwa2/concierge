import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

const AdminDashboard = lazy(() => import('@/app/components/admin/AdminDashboard'));
const EmployeeDashboard = lazy(() => import('@/app/components/employee/EmployeeDashboard'));
const CustomerDashboard = lazy(() => import('@/app/components/customer/CustomerDashboard'));
const CustomerProfile = lazy(() => import('@/app/components/customer/CustomerProfile'));
const JobGallery = lazy(() => import('@/app/components/JobGallery'));
const PricingPage = lazy(() => import('@/app/components/PricingPage'));
const POSTerminal = lazy(() => import('@/app/components/POSTerminal'));
const BookingForm = lazy(() => import('@/app/components/BookingForm'));
const CustomerAppointments = lazy(() => import('@/app/components/CustomerAppointments'));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
    </div>
  );
}

export function withSuspense<T extends object>(
  Component: React.ComponentType<T>,
  fallback?: React.ReactNode
): React.ComponentType<T> {
  return function SuspendedComponent(props: T) {
    return (
      <Suspense fallback={fallback || <LoadingFallback />}>
        <Component {...props} />
      </Suspense>
    );
  };
}

export {
  AdminDashboard,
  EmployeeDashboard,
  CustomerDashboard,
  CustomerProfile,
  JobGallery,
  PricingPage,
  POSTerminal,
  BookingForm,
  CustomerAppointments,
};
