import { useState, useEffect, lazy, Suspense } from 'react';
import {
  ArrowRight,
  Clock,
  CheckCircle2,
  Star
} from 'lucide-react';
import { JobGallery } from '@/app/components/JobGallery';
import { HeroSlideshow } from '@/app/components/HeroSlideshow';
import { DetailedServiceCard } from '@/app/components/DetailedServiceCard';
import { BookingForm } from '@/app/components/BookingForm';
import { HowItWorks } from '@/app/components/HowItWorks';
import { Header } from '@/app/components/Header';
import { LoginModal } from '@/app/components/LoginModal';
import { SignUpModal } from '@/app/components/SignUpModal';
import { AIChatBox } from '@/app/components/AIChatBox';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { toast, Toaster } from 'sonner';
import { services } from '@/app/data/services';
import { useAppointments } from '@/hooks/useApi';
import { appointmentsApi } from '@/services/api/appointments';
import type { Appointment } from '@/services/api/types';
import { useAuth } from '@/contexts/AuthContext';

// Role-specific and rarely-visited views are code-split: they used to be part
// of the single 1.2 MB entry bundle, so every marketing visitor downloaded the
// admin console, POS terminal and signature pad before seeing the home page.
const AdminDashboard = lazy(() =>
  import('@/app/components/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard }))
);
const EmployeeDashboard = lazy(() =>
  import('@/app/components/employee/EmployeeDashboard').then((m) => ({ default: m.EmployeeDashboard }))
);
const DocumentManager = lazy(() => import('@/app/components/documents/DocumentManager'));
const CustomerProfile = lazy(() =>
  import('@/app/components/customer/CustomerProfile').then((m) => ({ default: m.CustomerProfile }))
);
const CustomerDashboard = lazy(() =>
  import('@/app/components/customer/CustomerDashboard').then((m) => ({ default: m.CustomerDashboard }))
);
const CustomerAppointments = lazy(() =>
  import('@/app/components/CustomerAppointments').then((m) => ({ default: m.CustomerAppointments }))
);
const PricingPage = lazy(() =>
  import('@/app/components/PricingPage').then((m) => ({ default: m.PricingPage }))
);
const POSTerminal = lazy(() =>
  import('@/app/components/POSTerminal').then((m) => ({ default: m.POSTerminal }))
);
const VehicleReturnConfirmation = lazy(() =>
  import('@/app/components/VehicleReturnConfirmation').then((m) => ({ default: m.VehicleReturnConfirmation }))
);
const ConfirmationSuccessModal = lazy(() =>
  import('@/app/components/ConfirmationSuccessModal').then((m) => ({ default: m.ConfirmationSuccessModal }))
);

// Type-only import: erased at build time, so it does not pull the component
// into the entry chunk.
import type { ConfirmationData } from '@/app/components/VehicleReturnConfirmation';

function ViewLoader() {
  return (
    <div className="flex-1 flex items-center justify-center py-24 text-slate-500">
      Loading…
    </div>
  );
}

function DeferredView({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<ViewLoader />}>{children}</Suspense>;
}

export default function App() {
  const [currentView, setCurrentView] = useState<'home' | 'booking' | 'appointments' | 'dashboard' | 'profile' | 'gallery' | 'pricing' | 'pos' | 'documents'>('home');
  const [selectedService, setSelectedService] = useState<string>();
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [signupModalOpen, setSignupModalOpen] = useState(false);
  const [confirmationModalOpen, setConfirmationModalOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [lastSubmittedRating, setLastSubmittedRating] = useState(0);

  const { user, userType, logout } = useAuth();
  const { refetch: refetchAppointments } = useAppointments();

  const handleCloseBooking = () => {
    setCurrentView('home');
    setSelectedService(undefined);
    refetchAppointments();
  };

  const handleOpenBooking = (preselectedServiceId?: string) => {
    if (userType !== 'customer') {
      setLoginModalOpen(true);
      toast.error('Please login to book a service');
      return;
    }
    setSelectedService(preselectedServiceId);
    setCurrentView('booking');
    window.scrollTo(0, 0);
  };

  const handleLogout = async () => {
    await logout();
    setCurrentView('home');
    toast.info('Logged out successfully');
  };

  const handleSwitchToSignUp = () => {
    setLoginModalOpen(false);
    setSignupModalOpen(true);
  };

  const handleSwitchToLogin = () => {
    setSignupModalOpen(false);
    setLoginModalOpen(true);
  };

  const handleConfirmReturn = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setConfirmationModalOpen(true);
  };

  const handleConfirmationSubmit = async (data: ConfirmationData) => {
    try {
      if (!selectedAppointment) {
        toast.error('No appointment selected');
        return;
      }
      const response = await appointmentsApi.confirmVehicleReturn(selectedAppointment.id, {
        service_rating: data.serviceRating,
        condition_rating: data.conditionRating,
        concierge_behavior_rating: data.conciergeBehaviorRating,
        review: data.feedback || undefined
      });
      
      if (response.success) {
        setLastSubmittedRating(data.serviceRating);
        setConfirmationModalOpen(false);
        setSuccessModalOpen(true);
        refetchAppointments();
        // Dispatch global event for real-time cache invalidation
        window.dispatchEvent(new CustomEvent('appointment:status-changed', { detail: { appointmentId: selectedAppointment.id } }));
        toast.success('Thank you for your feedback!');
      } else {
        toast.error(response.message || 'Failed to submit confirmation');
      }
    } catch (error) {
      toast.error('Failed to submit confirmation');
    }
  };

  const handleSuccessClose = () => {
    setSuccessModalOpen(false);
    setSelectedAppointment(null);
  };

  const handleNavigate = (view: string) => {
    if (view === 'pos' && userType !== 'admin' && userType !== 'super_admin') {
      toast.error('POS Terminal is restricted to administrators only');
      return;
    }

    if ((view === 'appointments' || view === 'dashboard' || view === 'profile') && userType !== 'customer') {
      setLoginModalOpen(true);
      toast.error('Please login to access this page');
      return;
    }
    
    if (view === 'how-it-works') {
      if (currentView === 'home') {
        const element = document.getElementById('how-it-works-section');
        element?.scrollIntoView({ behavior: 'smooth' });
      } else {
        setCurrentView('home');
        setTimeout(() => {
          const element = document.getElementById('how-it-works-section');
          element?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } else {
      setCurrentView(view as any);
      window.scrollTo(0, 0);
    }
  };

  useEffect(() => {
    if ((currentView === 'appointments' || currentView === 'booking' || currentView === 'profile' || currentView === 'dashboard' || currentView === 'pos') && 
        (userType !== 'customer' && userType !== 'admin' && userType !== 'super_admin')) {
      setCurrentView('home');
      if (currentView === 'pos') {
        toast.error('POS Terminal is restricted to administrators only');
      } else {
        setLoginModalOpen(true);
        toast.error('Please login to access this page');
      }
    }
  }, [currentView, userType]);

  useEffect(() => {
    const handleFetchError = (e: ErrorEvent) => {
      if (e.message && e.message.includes('fetch')) {
        console.warn('Caught a potential fetch error, stabilizing state:', e.message);
        e.preventDefault();
      }
    };
    window.addEventListener('error', handleFetchError);
    return () => window.removeEventListener('error', handleFetchError);
  }, []);

  if (userType === 'admin' || userType === 'super_admin') {
    return (
      <DeferredView>
        <AdminDashboard onLogout={handleLogout} />
        <Toaster position="top-right" />
      </DeferredView>
    );
  }

  if (userType === 'employee') {
    return (
      <DeferredView>
        <EmployeeDashboard onLogout={handleLogout} />
        <Toaster position="top-right" />
      </DeferredView>
    );
  }

  return (
    <DeferredView>
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Toaster position="top-right" />
      <Header 
        currentView={currentView} 
        onNavigate={handleNavigate}
        onLoginClick={() => setLoginModalOpen(true)}
        onProfileClick={() => handleNavigate('profile')}
        onLogoutClick={handleLogout}
        isLoggedIn={userType === 'customer'}
        userName={user?.name}
        userEmail={user?.email}
      />

      <LoginModal
        open={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onSwitchToSignUp={handleSwitchToSignUp}
      />

      <SignUpModal
        open={signupModalOpen}
        onClose={() => setSignupModalOpen(false)}
        onSwitchToLogin={handleSwitchToLogin}
      />

      {/* Home View */}
      {currentView === 'home' && (
        <main className="flex-1">
          {/* Hero Section */}
          <section className="relative h-[600px] flex items-center overflow-hidden bg-slate-900">
            <HeroSlideshow />

            <div className="container mx-auto px-4 relative z-10 text-white">
              <div className="max-w-3xl">
                <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
                  We Handle Your Car,<br />
                  So You Can Focus on Life.
                </h1>
                <p className="text-xl text-slate-200 mb-8 max-w-2xl">
                  Skip the garage and car wash lines. Our professional concierge service picks up 
                  your vehicle, handles all maintenance and cleaning, and returns it to you — all 
                  while you focus on what matters.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button
                    size="lg"
                    className="bg-white text-slate-900 hover:bg-slate-100 px-8 py-6 text-lg"
                    onClick={() => handleOpenBooking()}
                  >
                    Book a Service
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button 
                    size="lg" 
                    className="bg-white text-slate-900 hover:bg-slate-100 px-8 py-6 text-lg"
                    onClick={() => handleNavigate('how-it-works')}
                  >
                    How It Works
                  </Button>
                </div>

                {/* Trust Indicators */}
                <div className="flex flex-wrap gap-8 mt-12 pt-12 border-t border-slate-600">
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      <span className="font-bold text-xl">{import.meta.env.VITE_APP_RATING || '4.9'}</span>
                    </div>
                    <p className="text-sm text-slate-300">Average Rating</p>
                  </div>
                  <div>
                    <p className="font-bold text-xl mb-1">{import.meta.env.VITE_APP_SERVICES_COMPLETED || '10,000+'}</p>
                    <p className="text-sm text-slate-300">Services Completed</p>
                  </div>
                  <div>
                    <p className="font-bold text-xl mb-1">{import.meta.env.VITE_APP_TURNAROUND || '2-4 hrs'}</p>
                    <p className="text-sm text-slate-300">Average Turnaround</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Benefits Section */}
          <section className="py-16 bg-white border-b">
            <div className="container mx-auto px-4">
              <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                <div className="text-center group">
                  <div className="bg-slate-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-slate-200 transition-colors">
                    <Clock className="h-8 w-8 text-slate-700" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">Save Your Time</h3>
                  <p className="text-slate-600">
                    No more waiting at garages or car washes. We pick up and deliver while you work or relax.
                  </p>
                </div>
                <div className="text-center group">
                  <div className="bg-slate-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-slate-200 transition-colors">
                    <CheckCircle2 className="h-8 w-8 text-slate-700" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">Trusted Professionals</h3>
                  <p className="text-slate-600">
                    All concierges are vetted, insured, and highly experienced with all vehicle types.
                  </p>
                </div>
                <div className="text-center group">
                  <div className="bg-slate-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-slate-200 transition-colors">
                    <Star className="h-8 w-8 text-slate-700" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">Quality Service</h3>
                  <p className="text-slate-600">
                    Premium partners and guaranteed satisfaction with our thorough quality checklists.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* How It Works Section */}
          <section id="how-it-works-section" className="bg-slate-50 border-b border-slate-200">
            <div className="container mx-auto px-4">
              <HowItWorks />
            </div>
          </section>

          {/* Services Section */}
          <section id="services-section" className="py-20 container mx-auto px-4">
            <div className="text-center mb-16">
              <Badge variant="outline" className="mb-4 py-1 px-4 text-sm font-medium border-slate-300">Our Expertise</Badge>
              <h2 className="text-4xl font-bold mb-4 tracking-tight">Auto Concierge Services</h2>
              <p className="text-slate-600 max-w-2xl mx-auto text-lg">
                Comprehensive vehicle care solutions tailored to your lifestyle. We handle the logistics so you don't have to.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {services.map((service) => (
                <DetailedServiceCard
                  key={service.title}
                  icon={service.icon}
                  title={service.title}
                  features={service.features}
                />
              ))}
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-24 bg-slate-900 text-white relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
              <div className="grid grid-cols-6 h-full w-full">
                {[...Array(24)].map((_, i) => (
                  <div key={i} className="border-r border-b border-white/20" />
                ))}
              </div>
            </div>
            <div className="container mx-auto px-4 text-center relative z-10">
              <h2 className="text-4xl font-bold mb-6">Ready to Save Time?</h2>
              <p className="text-slate-300 mb-10 max-w-2xl mx-auto text-lg leading-relaxed">
                Book your first service today and experience the convenience of having a 
                professional take care of your vehicle needs. Join {import.meta.env.VITE_APP_HAPPY_CUSTOMERS || '5,000+'} happy car owners.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Button
                  size="lg"
                  className="bg-white text-slate-900 hover:bg-slate-100 px-10 py-6 text-lg font-bold"
                  onClick={() => handleOpenBooking()}
                >
                  Get Started Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  size="lg" 
                  className="bg-white text-slate-900 hover:bg-slate-100 px-10 py-6 text-lg font-bold"
                  onClick={() => handleNavigate('pricing')}
                >
                  View Pricing
                </Button>
              </div>
            </div>
          </section>
        </main>
      )}

      {/* Booking View */}
      {currentView === 'booking' && (
        <main className="flex-1 container mx-auto px-4 py-16 bg-white">
          <BookingForm
            key={`booking-${selectedService ?? 'none'}`}
            selectedService={selectedService}
            onClose={handleCloseBooking}
          />
        </main>
      )}

      {/* Appointments View */}
      {currentView === 'appointments' && (
        <main className="flex-1 container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="mb-10">
              <h1 className="text-4xl font-bold mb-3 tracking-tight">My Appointments</h1>
              <p className="text-slate-600 text-lg">
                Track and manage all your vehicle service appointments in real-time
              </p>
            </div>

            <CustomerAppointments
              onConfirmReturn={handleConfirmReturn}
              onBookAppointment={() => handleOpenBooking()}
            />
          </div>

          {/* Vehicle Return Confirmation Modal */}
          {selectedAppointment && (
            <VehicleReturnConfirmation
              open={confirmationModalOpen}
              onClose={() => setConfirmationModalOpen(false)}
              appointment={selectedAppointment}
              onSubmit={handleConfirmationSubmit}
            />
          )}

          {/* Success Modal */}
          {selectedAppointment && (
            <ConfirmationSuccessModal
              open={successModalOpen}
              onClose={handleSuccessClose}
              appointmentId={String(selectedAppointment.id)}
              serviceRating={lastSubmittedRating}
            />
          )}
        </main>
      )}

      {/* Dashboard View */}
      {currentView === 'dashboard' && (
        <main className="flex-1">
          <CustomerDashboard onLogout={handleLogout} onBookService={() => handleOpenBooking()} />
        </main>
      )}

      {/* Profile View */}
      {currentView === 'profile' && (
        <main className="flex-1">
          <CustomerProfile onLogout={handleLogout} />
        </main>
      )}

      {/* Gallery View */}
      {currentView === 'gallery' && (
        <main className="flex-1">
          <JobGallery />
        </main>
      )}

      {/* Pricing View */}
      {currentView === 'pricing' && (
        <PricingPage onNavigate={handleNavigate} />
      )}

      {/* POS Terminal View */}
      {currentView === 'pos' && (
        <POSTerminal 
          onClose={() => setCurrentView('home')}
          userType={userType}
        />
      )}

      {/* Documents View */}
      {currentView === 'documents' && (
        <main className="flex-1 container mx-auto py-8">
          <DocumentManager />
        </main>
      )}

      <AIChatBox />
    </div>
    </DeferredView>
  );
}
