import { useState, useEffect } from 'react';
import {
  Wrench,
  Settings,
  Shield,
  ArrowRight,
  Clock,
  CheckCircle2,
  Star,
  Car,
  ClipboardCheck,
  MapPin,
  Headphones,
  Package
} from 'lucide-react';
import { JobGallery } from '@/app/components/JobGallery';
import { HeroSlideshow } from '@/app/components/HeroSlideshow';
import { DetailedServiceCard } from '@/app/components/DetailedServiceCard';
import { BookingForm } from '@/app/components/BookingForm';
import { HowItWorks } from '@/app/components/HowItWorks';
import { Header } from '@/app/components/Header';
import { LoginModal } from '@/app/components/LoginModal';
import { SignUpModal } from '@/app/components/SignUpModal';
import { AdminDashboard } from '@/app/components/admin/AdminDashboard';
import { EmployeeDashboard } from '@/app/components/employee/EmployeeDashboard';
import { CustomerProfile } from '@/app/components/customer/CustomerProfile';
import { CustomerDashboard } from '@/app/components/customer/CustomerDashboard';
import { CustomerAppointments } from '@/app/components/CustomerAppointments';
import { VehicleReturnConfirmation, ConfirmationData } from '@/app/components/VehicleReturnConfirmation';
import { ConfirmationSuccessModal } from '@/app/components/ConfirmationSuccessModal';
import { AIChatBox } from '@/app/components/AIChatBox';
import { Button } from '@/app/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Badge } from '@/app/components/ui/badge';
import { toast, Toaster } from 'sonner';
import { services } from '@/app/data/services';
import { useAppointments, useProfile } from '@/hooks/useApi';
import { api } from '@/services/api';
import type { Appointment } from '@/services/api';

export default function App() {
  const [currentView, setCurrentView] = useState<'home' | 'booking' | 'appointments' | 'dashboard' | 'profile' | 'gallery'>('home');
  const [selectedService, setSelectedService] = useState<string>();
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [signupModalOpen, setSignupModalOpen] = useState(false);
  const [userType, setUserType] = useState<'customer' | 'admin' | 'employee' | null>(null);
  const [confirmationModalOpen, setConfirmationModalOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [lastSubmittedRating, setLastSubmittedRating] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [appointmentsRefreshKey, setAppointmentsRefreshKey] = useState(0);

  const { data: profile } = useProfile();
  const { data: appointments = [], isLoading: appointmentsLoading, refetch: refetchAppointments } = useAppointments();

  const handleBookService = (serviceTitle: string) => {
    if (userType !== 'customer') {
      setLoginModalOpen(true);
      toast.error('Please login to book a service');
      return;
    }
    setSelectedService(serviceTitle);
    setCurrentView('booking');
  };

  const handleCloseBooking = () => {
    setCurrentView('home');
    setSelectedService(undefined);
    refetchAppointments();
  };

  const handleLogin = (type: 'customer' | 'admin' | 'employee') => {
    setIsLoading(true);
    setUserType(type);
    setIsLoading(false);
    toast.success(`Logged in as ${type}`);
  };

  const handleSignUp = (user: any) => {
    if (user.requires_approval) {
      setUserType(null);
      toast.success('Application submitted! Please wait for admin approval.');
    } else {
      setUserType('customer');
      toast.success('Account created successfully!');
    }
  };

  const handleLogout = () => {
    api.logout();
    setUserType(null);
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
      const response = await api.confirmVehicleReturn(selectedAppointment.id, {
        service_rating: data.serviceRating,
        condition_rating: data.conditionRating,
        review: data.feedback || undefined
      });
      
      if (response.success) {
        setLastSubmittedRating(data.serviceRating);
        setConfirmationModalOpen(false);
        setSuccessModalOpen(true);
        refetchAppointments();
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
    if ((currentView === 'appointments' || currentView === 'booking' || currentView === 'profile' || currentView === 'dashboard') && userType !== 'customer') {
      setCurrentView('home');
      setLoginModalOpen(true);
      toast.error('Please login to access this page');
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

  if (userType === 'admin') {
    return (
      <>
        <AdminDashboard onLogout={handleLogout} />
        <Toaster position="top-right" />
      </>
    );
  }

  if (userType === 'employee') {
    return (
      <>
        <EmployeeDashboard onLogout={handleLogout} />
        <Toaster position="top-right" />
      </>
    );
  }

  const upcomingAppointments = appointments.filter(a => 
    a.status === 'scheduled' || a.status === 'confirmed' || a.status === 'in-progress'
  );
  const completedAppointments = appointments.filter(a => a.status === 'completed');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Toaster position="top-right" />
      <Header 
        currentView={currentView} 
        onNavigate={handleNavigate}
        onLoginClick={() => setLoginModalOpen(true)}
        onProfileClick={() => handleNavigate('profile')}
        onLogoutClick={handleLogout}
        isLoggedIn={userType === 'customer'}
      />

      <LoginModal
        open={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onLogin={handleLogin}
        onSwitchToSignUp={handleSwitchToSignUp}
      />

      <SignUpModal
        open={signupModalOpen}
        onClose={() => setSignupModalOpen(false)}
        onSignUp={handleSignUp}
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
                    onClick={() => {
                      if (userType !== 'customer') {
                        setLoginModalOpen(true);
                        toast.error('Please login to book a service');
                        return;
                      }
                      setCurrentView('booking');
                    }}
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
          <section className="py-20 container mx-auto px-4">
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
                  image={service.image}
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
                  onClick={() => {
                    if (userType !== 'customer') {
                      setLoginModalOpen(true);
                      toast.error('Please login to book a service');
                      return;
                    }
                    setCurrentView('booking');
                  }}
                >
                  Get Started Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  size="lg" 
                  className="bg-white text-slate-900 hover:bg-slate-100 px-10 py-6 text-lg font-bold"
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
              appointmentId={selectedAppointment.id}
              serviceRating={lastSubmittedRating}
            />
          )}
        </main>
      )}

      {/* Dashboard View */}
      {currentView === 'dashboard' && (
        <main className="flex-1">
          <CustomerDashboard onLogout={handleLogout} />
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

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="bg-white p-2 rounded-lg">
                  <Car className="h-6 w-6 text-slate-900" />
                </div>
                <span className="font-bold text-2xl tracking-tight">AutoConcierge</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
                Premium door-to-door vehicle care services for professionals and families. We handle the errands so you can enjoy your life.
              </p>
              <div className="flex items-center gap-4 pt-4">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700 cursor-pointer transition-colors">
                  <Star className="h-5 w-5 text-slate-400" />
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700 cursor-pointer transition-colors">
                  <Settings className="h-5 w-5 text-slate-400" />
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700 cursor-pointer transition-colors">
                  <Shield className="h-5 w-5 text-slate-400" />
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-bold text-lg mb-6">Our Services</h3>
              <ul className="space-y-4 text-slate-400 text-sm">
                <li className="hover:text-white transition-colors cursor-pointer">Premium Car Wash</li>
                <li className="hover:text-white transition-colors cursor-pointer">Oil Change & Fluids</li>
                <li className="hover:text-white transition-colors cursor-pointer">Mechanical Repairs</li>
                <li className="hover:text-white transition-colors cursor-pointer">Vehicle Inspection</li>
                <li className="hover:text-white transition-colors cursor-pointer">Tire & Wheel Care</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-bold text-lg mb-6">Quick Links</h3>
              <ul className="space-y-4 text-slate-400 text-sm">
                <li className="hover:text-white transition-colors cursor-pointer" onClick={() => handleNavigate('home')}>Services</li>
                <li className="hover:text-white transition-colors cursor-pointer" onClick={() => handleNavigate('appointments')}>My Appointments</li>
                <li className="hover:text-white transition-colors cursor-pointer" onClick={() => handleNavigate('how-it-works')}>How It Works</li>
                <li className="hover:text-white transition-colors cursor-pointer">Pricing Plans</li>
                <li className="hover:text-white transition-colors cursor-pointer">Safety & Insurance</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-bold text-lg mb-6">Get In Touch</h3>
              <ul className="space-y-4 text-slate-400 text-sm">
                <li className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-slate-500" />
                  <span>Westlands Business Park, Suite 200<br />Nairobi, Kenya 00100</span>
                </li>
                <li className="flex items-center gap-3">
                  <Headphones className="h-5 w-5 text-slate-500" />
                  <span>support@autoconcierge.co.ke</span>
                </li>
                <li className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-slate-500" />
                  <span>24/7 Support Available</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-slate-500 text-sm">
              © {new Date().getFullYear()} AutoConcierge. All rights reserved. Built with passion for car care.
            </div>
            <div className="flex gap-6 text-sm text-slate-500">
              <span className="hover:text-white cursor-pointer transition-colors">Privacy Policy</span>
              <span className="hover:text-white cursor-pointer transition-colors">Terms of Service</span>
              <span className="hover:text-white cursor-pointer transition-colors">Cookies</span>
              <div className="flex items-center gap-2 ml-4 px-3 py-1 bg-green-900/30 text-green-400 rounded-full border border-green-800/50">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-medium">Systems Operational</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
      
      <AIChatBox />
    </div>
  );
}
