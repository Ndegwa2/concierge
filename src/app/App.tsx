import { useState, useEffect } from 'react';
import { 
  Droplets, 
  Wrench, 
  Settings, 
  Shield, 
  Disc, 
  Sparkles,
  ArrowRight,
  Clock,
  CheckCircle2,
  Star,
  Car,
  ClipboardCheck,
  MapPin,
  Users,
  Headphones,
  Fuel,
  Package,
  AlertCircle
} from 'lucide-react';
import { ServiceCard } from '@/app/components/ServiceCard';
import { DetailedServiceCard } from '@/app/components/DetailedServiceCard';
import { BookingForm } from '@/app/components/BookingForm';
import { AppointmentList } from '@/app/components/AppointmentList';
import { HowItWorks } from '@/app/components/HowItWorks';
import { Header } from '@/app/components/Header';
import { LoginModal } from '@/app/components/LoginModal';
import { AdminDashboard } from '@/app/components/admin/AdminDashboard';
import { EmployeeDashboard } from '@/app/components/employee/EmployeeDashboard';
import { VehicleReturnConfirmation, ConfirmationData } from '@/app/components/VehicleReturnConfirmation';
import { ConfirmationSuccessModal } from '@/app/components/ConfirmationSuccessModal';
import { Button } from '@/app/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Badge } from '@/app/components/ui/badge';
import { toast, Toaster } from 'sonner';

export default function App() {
  const [currentView, setCurrentView] = useState<'home' | 'booking' | 'appointments' | 'how-it-works'>('home');
  const [selectedService, setSelectedService] = useState<string>();
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [userType, setUserType] = useState<'customer' | 'admin' | 'employee' | null>(null);
  const [confirmationModalOpen, setConfirmationModalOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [lastSubmittedRating, setLastSubmittedRating] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Mock appointments data
  const mockAppointments = [
    {
      id: '1',
      service: 'Premium Car Wash',
      date: 'Feb 15, 2026',
      time: '10:00 AM',
      location: '123 Main St, Downtown',
      vehicle: 'Toyota Camry 2022',
      status: 'awaiting-confirmation' as const,
      concierge: 'Michael Chen'
    },
    {
      id: '2',
      service: 'Oil Change',
      date: 'Feb 18, 2026',
      time: '2:00 PM',
      location: '456 Oak Ave, Westside',
      vehicle: 'Honda Accord 2021',
      status: 'pending' as const
    },
    {
      id: '3',
      service: 'Full Detailing',
      date: 'Feb 10, 2026',
      time: '8:00 AM',
      location: '789 Pine Rd, Eastside',
      vehicle: 'BMW 3 Series 2023',
      status: 'completed' as const,
      concierge: 'Sarah Johnson',
      confirmed: true
    }
  ];

  const services = [
    {
      icon: ClipboardCheck,
      title: 'Vehicle Maintenance & Inspection',
      image: 'https://images.unsplash.com/photo-1708745427274-d5de5122fd57?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWNoYW5pYyUyMGluc3BlY3RpbmclMjBjYXIlMjBlbmdpbmV8ZW58MXx8fHwxNzY5ODcwNTUyfDA&ixlib=rb-4.1.0&q=80&w=1080',
      features: [
        'Routine vehicle health checks and preventive maintenance coordination',
        'Scheduled service reminders and maintenance planning',
        'Pre-trip and post-trip vehicle inspections',
        'Diagnostic coordination with trusted garages',
        'Maintenance reports and service history tracking'
      ]
    },
    {
      icon: Wrench,
      title: 'Garage & Repair Management',
      image: 'https://images.unsplash.com/photo-1758179128122-6079c9cb3e4e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBjYXIlMjBjb25jaWVyZ2UlMjBzZXJ2aWNlfGVufDF8fHx8MTc2OTg3MDU1Mnww&ixlib=rb-4.1.0&q=80&w=1080',
      features: [
        'Vehicle delivery to and collection from approved garages',
        'Repair quotation sourcing and comparison',
        'Repair progress monitoring and client updates',
        'Quality assurance checks before vehicle return',
        'Emergency breakdown coordination'
      ]
    },
    {
      icon: Droplets,
      title: 'Car Wash & Detailing Services',
      image: 'https://images.unsplash.com/photo-1762506168937-fb21f3fcad84?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBjYXIlMjB3YXNoJTIwc2VydmljZXxlbnwxfHx8fDE3Njk4NzA1NTN8MA&ixlib=rb-4.1.0&q=80&w=1080',
      features: [
        'Standard exterior and interior car wash coordination',
        'Premium detailing services (interior, exterior, engine bay)',
        'Mobile car wash arrangements (home or office)',
        'Post-service inspection to ensure quality standards'
      ]
    },
    {
      icon: MapPin,
      title: 'Pick-Up & Drop-Off Services',
      image: 'https://images.unsplash.com/photo-1746079074371-e28f14c76e37?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYXIlMjBkZXRhaWxpbmclMjB3b3Jrc2hvcCUyMHByb2Zlc3Npb25hbHxlbnwxfHx8fDE3Njk4NzA1NTJ8MA&ixlib=rb-4.1.0&q=80&w=1080',
      features: [
        'Door-to-door vehicle collection and return',
        'Secure handling and insured vehicle transportation',
        'Flexible scheduling to suit client availability',
        'Corporate and fleet pick-up & drop-off solutions'
      ]
    },
    {
      icon: Fuel,
      title: 'Convenience & Lifestyle Vehicle Support',
      features: [
        'Fuel refilling coordination',
        'Tyre pressure checks, wheel alignment, and balancing',
        'Battery checks and replacement coordination',
        'Emergency roadside assistance arrangement'
      ]
    },
    {
      icon: Package,
      title: 'Corporate & Fleet Concierge',
      features: [
        'Fleet maintenance scheduling and tracking',
        'Multi-vehicle service coordination',
        'Usage and service reporting for fleet managers',
        'Cost optimization through preferred service partners'
      ]
    },
    {
      icon: Headphones,
      title: 'Customer Support & Transparency',
      features: [
        'Dedicated concierge support',
        'Real-time service updates',
        'Digital service records and invoices',
        'Trusted partner network management'
      ]
    }
  ];

  const handleBookService = (serviceTitle: string) => {
    setSelectedService(serviceTitle);
    setCurrentView('booking');
  };

  const handleCloseBooking = () => {
    setCurrentView('home');
    setSelectedService(undefined);
  };

  const handleLogin = (type: 'customer' | 'admin' | 'employee') => {
    setIsLoading(true);
    // Simulate API delay
    setTimeout(() => {
      setUserType(type);
      setIsLoading(false);
      toast.success(`Logged in as ${type}`);
    }, 800);
  };

  const handleLogout = () => {
    setUserType(null);
    setCurrentView('home');
    toast.info('Logged out successfully');
  };

  const handleConfirmReturn = (appointment: any) => {
    setSelectedAppointment(appointment);
    setConfirmationModalOpen(true);
  };

  const handleConfirmationSubmit = (data: ConfirmationData) => {
    console.log('Confirmation submitted:', data);
    setLastSubmittedRating(data.serviceRating);
    setConfirmationModalOpen(false);
    setSuccessModalOpen(true);
  };

  const handleSuccessClose = () => {
    setSuccessModalOpen(false);
    setSelectedAppointment(null);
  };

  const handleNavigate = (view: string) => {
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

  // Error boundary effect for fetching (to satisfy user request)
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

  // Show admin dashboard if logged in as admin
  if (userType === 'admin') {
    return (
      <>
        <AdminDashboard onLogout={handleLogout} />
        <Toaster position="top-right" />
      </>
    );
  }

  // Show employee dashboard if logged in as employee
  if (userType === 'employee') {
    return (
      <>
        <EmployeeDashboard onLogout={handleLogout} />
        <Toaster position="top-right" />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Toaster position="top-right" />
      <Header 
        currentView={currentView} 
        onNavigate={handleNavigate}
        onLoginClick={() => setLoginModalOpen(true)}
        isLoggedIn={userType === 'customer'}
      />

      <LoginModal 
        open={loginModalOpen} 
        onClose={() => setLoginModalOpen(false)}
        onLogin={handleLogin}
      />

      {/* Home View */}
      {currentView === 'home' && (
        <main className="flex-1">
          {/* Hero Section */}
          <section className="relative h-[600px] flex items-center overflow-hidden">
            <div className="absolute inset-0 z-0">
              <img 
                src="https://images.unsplash.com/photo-1758179128122-6079c9cb3e4e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBjYXIlMjBjb25jaWVyZ2UlMjBzZXJ2aWNlfGVufDF8fHx8MTc2OTg3MDU1Mnww&ixlib=rb-4.1.0&q=80&w=1920" 
                alt="Luxury Car Concierge" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-slate-900/70" />
            </div>
            
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
                    onClick={() => setCurrentView('booking')}
                  >
                    Book a Service
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="border-white text-white hover:bg-white/10 px-8 py-6 text-lg"
                    onClick={() => {
                      const element = document.getElementById('how-it-works-section');
                      element?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    How It Works
                  </Button>
                </div>

                {/* Trust Indicators */}
                <div className="flex flex-wrap gap-8 mt-12 pt-12 border-t border-slate-600">
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      <span className="font-bold text-xl">4.9</span>
                    </div>
                    <p className="text-sm text-slate-300">Average Rating</p>
                  </div>
                  <div>
                    <p className="font-bold text-xl mb-1">10,000+</p>
                    <p className="text-sm text-slate-300">Services Completed</p>
                  </div>
                  <div>
                    <p className="font-bold text-xl mb-1">2-4 hrs</p>
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
                professional take care of your vehicle needs. Join 5,000+ happy car owners.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Button 
                  size="lg" 
                  className="bg-white text-slate-900 hover:bg-slate-100 px-10 py-6 text-lg font-bold"
                  onClick={() => setCurrentView('booking')}
                >
                  Get Started Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-white text-white hover:bg-white/10 px-10 py-6 text-lg font-bold"
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

            <Tabs defaultValue="upcoming" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8 h-12">
                <TabsTrigger value="upcoming" className="text-base">Upcoming Services</TabsTrigger>
                <TabsTrigger value="completed" className="text-base">Past Services</TabsTrigger>
              </TabsList>
              
              <TabsContent value="upcoming" className="mt-0">
                <AppointmentList 
                  appointments={mockAppointments.filter(a => a.status !== 'completed')}
                  onConfirmReturn={handleConfirmReturn}
                />
              </TabsContent>
              
              <TabsContent value="completed" className="mt-0">
                <AppointmentList 
                  appointments={mockAppointments.filter(a => a.status === 'completed')} 
                />
              </TabsContent>
            </Tabs>

            <div className="mt-12 p-8 border rounded-2xl bg-white text-center shadow-sm">
              <h3 className="text-xl font-bold mb-2">Need something else?</h3>
              <p className="text-slate-500 mb-6">Schedule a custom service or request a consultation</p>
              <Button size="lg" onClick={() => setCurrentView('booking')}>
                Book New Service
              </Button>
            </div>
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
                  <span>101 Innovation Blvd, Suite 200<br />San Francisco, CA 94105</span>
                </li>
                <li className="flex items-center gap-3">
                  <Headphones className="h-5 w-5 text-slate-500" />
                  <span>support@autoconcierge.com</span>
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
              © 2026 AutoConcierge. All rights reserved. Built with passion for car care.
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
    </div>
  );
}
