import { useState, useMemo, useEffect } from 'react';
import { Check, ChevronDown, Car, Users, Star, Mail, Phone, MapPin, FileText, DollarSign, Wrench, PhoneCall, Building2, BarChart3, Receipt } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/app/components/ui/accordion';
import { Slider } from '@/app/components/ui/slider';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/app/components/ui/utils';

interface PricingPageProps {
  onNavigate?: (view: string) => void;
}

const HERO_IMAGES = [
  '/images/hero-mechanic-1.jpg',
  '/images/hero-mechanic-2.jpg',
];

export function PricingPage({ onNavigate }: PricingPageProps) {
  const [activeSegment, setActiveSegment] = useState<'retail' | 'fleet'>('retail');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [fleetSize, setFleetSize] = useState([10]);
  const [showErrandRates, setShowErrandRates] = useState(false);
  const [corporateEmail, setCorporateEmail] = useState('');
  const [heroIndex, setHeroIndex] = useState(0);

  const fleetPrice = useMemo(() => {
    const size = fleetSize[0];
    if (size <= 9) return { label: 'Starter Fleet', price: 4500 };
    if (size <= 25) return { label: 'Business Fleet', price: 3800 };
    return { label: 'Enterprise Fleet', price: 3000 };
  }, [fleetSize]);

  useEffect(() => {
    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleBookErrand = () => {
    if (onNavigate) {
      onNavigate('booking');
    } else {
      toast.info('Booking coming soon! Please sign up to book an errand.');
    }
  };

  const handleStartTrial = () => {
    toast.success('14-day trial activated! Check your email for onboarding details.');
  };

  const handleExecutiveAccess = () => {
    toast.info('Executive access request received. Our team will contact you within 24 hours.');
  };

  const handleScheduleAudit = () => {
    if (!corporateEmail) {
      toast.error('Please enter your corporate email address.');
      return;
    }
    toast.success('Fleet audit scheduled! Our enterprise team will reach out to ' + corporateEmail);
    setCorporateEmail('');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Header Section */}
      <section className="relative bg-[#0F172A] py-20 lg:py-28 overflow-hidden">
        <div className="absolute inset-0">
          {HERO_IMAGES.map((src, index) => (
            <img
              key={src}
              src={src}
              alt=""
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
                index === heroIndex ? 'opacity-40' : 'opacity-0'
              }`}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-900/40" />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-6 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 text-sm font-medium px-4 py-1.5">
              Transparent Automotive Management
            </Badge>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight tracking-tight">
              Your Time is Priceless.<br className="hidden sm:block" /> Let Us Handle the Car.
            </h1>
            
            <p className="text-lg md:text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
              From routine garage runs and emergency recoveries to full-sized corporate fleet operations. Simple pricing, no hidden costs.
            </p>

            {/* Segment Switcher */}
            <div className="inline-flex items-center bg-slate-800/50 p-1 rounded-xl border border-slate-700/50 backdrop-blur-sm">
              <button
                onClick={() => setActiveSegment('retail')}
                className={cn(
                  'px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  activeSegment === 'retail'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-300 hover:text-white'
                )}
              >
                Retail & Personal
              </button>
              <button
                onClick={() => setActiveSegment('fleet')}
                className={cn(
                  'px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  activeSegment === 'fleet'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-300 hover:text-white'
                )}
              >
                Fleet & Business
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="bg-[#F8FAFC]">
        {activeSegment === 'retail' && (
          <div className="py-16 lg:py-24">
            <div className="container mx-auto px-4">
              {/* Billing Cycle Toggle */}
              <div className="flex justify-center mb-12">
                <div className="inline-flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                  <button
                    onClick={() => setBillingCycle('monthly')}
                    className={cn(
                      'px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                      billingCycle === 'monthly'
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    Monthly Billing
                  </button>
                  <button
                    onClick={() => setBillingCycle('annual')}
                    className={cn(
                      'px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2',
                      billingCycle === 'annual'
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    Annual Billing
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Save 15%</span>
                  </button>
                </div>
              </div>

              {/* Membership Tier Cards */}
              <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-7xl mx-auto mb-12">
                {/* Tier 1: Pay-Per-Errand */}
                <Card className="relative border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col">
                  <CardHeader className="pb-6 pt-8">
                    <CardTitle className="text-xl font-bold text-slate-900">Pay-Per-Errand</CardTitle>
                    <CardDescription className="text-slate-500 mt-1">Pay-As-You-Go</CardDescription>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-slate-900">KES 0</span>
                      <span className="text-slate-500 text-sm ml-1">/ month</span>
                    </div>
                    <p className="text-sm text-slate-500 mt-2">Ideal for occasional car wash, inspection, or maintenance runs.</p>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-slate-400 mt-0.5 shrink-0" />
                        <span className="text-sm text-slate-600">KES 2,000 base fee per garage run</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-slate-400 mt-0.5 shrink-0" />
                        <span className="text-sm text-slate-600">Pay-as-you-need emergency support</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-slate-400 mt-0.5 shrink-0" />
                        <span className="text-sm text-slate-600">Itemized digital receipts</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-slate-400 mt-0.5 shrink-0" />
                        <span className="text-sm text-slate-600">Standard M-Pesa checkout</span>
                      </li>
                    </ul>
                  </CardContent>
                  <CardFooter className="pt-4">
                    <Button variant="outline" className="w-full" size="lg" onClick={handleBookErrand}>
                      Book an Errand
                    </Button>
                  </CardFooter>
                </Card>

                {/* Tier 2: Essential Care - Highlighted */}
                <Card className="relative border-emerald-200 shadow-lg hover:shadow-xl transition-shadow duration-200 flex flex-col scale-[1.02]">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <Badge className="bg-emerald-500 text-white hover:bg-emerald-600 text-xs font-bold px-4 py-1 rounded-full shadow-md">
                      Most Popular
                    </Badge>
                  </div>
                  <CardHeader className="pb-6 pt-10">
                    <CardTitle className="text-xl font-bold text-slate-900">Essential Care</CardTitle>
                    <CardDescription className="text-slate-500 mt-1">Single-Vehicle Membership</CardDescription>
                    <div className="mt-4">
                      {billingCycle === 'monthly' ? (
                        <>
                          <span className="text-4xl font-bold text-slate-900">KES 3,999</span>
                          <span className="text-slate-500 text-sm ml-1">/ month</span>
                        </>
                      ) : (
                        <>
                          <span className="text-4xl font-bold text-slate-900">KES 40,000</span>
                          <span className="text-slate-500 text-sm ml-1">/ year</span>
                        </>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-2">Perfect for single-car owners seeking effortless routine maintenance.</p>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                        <span className="text-sm text-slate-600">2 Concierge errands/mo included</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                        <span className="text-sm text-slate-600">1 Free quarterly garage oversight run</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                        <span className="text-sm text-slate-600">Priority scheduling during peak seasons</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                        <span className="text-sm text-slate-600">5% partner network discounts</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                        <span className="text-sm text-slate-600">Centralized M-Pesa billing</span>
                      </li>
                    </ul>
                  </CardContent>
                  <CardFooter className="pt-4">
                    <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white" size="lg" onClick={handleStartTrial}>
                      Start 14-Day Trial
                    </Button>
                  </CardFooter>
                </Card>

                {/* Tier 3: Executive Dual */}
                <Card className="relative border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col">
                  <CardHeader className="pb-6 pt-8">
                    <CardTitle className="text-xl font-bold text-slate-900">Executive Dual</CardTitle>
                    <CardDescription className="text-slate-500 mt-1">Multi-Vehicle Household</CardDescription>
                    <div className="mt-4">
                      {billingCycle === 'monthly' ? (
                        <>
                          <span className="text-4xl font-bold text-slate-900">KES 7,999</span>
                          <span className="text-slate-500 text-sm ml-1">/ month</span>
                        </>
                      ) : (
                        <>
                          <span className="text-4xl font-bold text-slate-900">KES 80,000</span>
                          <span className="text-slate-500 text-sm ml-1">/ year</span>
                        </>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-2">Designed for multi-vehicle households managing 2+ cars.</p>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-slate-400 mt-0.5 shrink-0" />
                        <span className="text-sm text-slate-600">5 Concierge errands/mo split across cars</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-slate-400 mt-0.5 shrink-0" />
                        <span className="text-sm text-slate-600">Unlimited NTSA inspection handling</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-slate-400 mt-0.5 shrink-0" />
                        <span className="text-sm text-slate-600">3 Hours/mo included personal valet driver</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-slate-400 mt-0.5 shrink-0" />
                        <span className="text-sm text-slate-600">10% partner network labor discounts</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-slate-400 mt-0.5 shrink-0" />
                        <span className="text-sm text-slate-600">Dedicated Concierge Manager</span>
                      </li>
                    </ul>
                  </CardContent>
                  <CardFooter className="pt-4">
                    <Button variant="outline" className="w-full border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white" size="lg" onClick={handleExecutiveAccess}>
                      Get Executive Access
                    </Button>
                  </CardFooter>
                </Card>
              </div>

              {/* Transactional Errand Rate Card */}
              <div className="max-w-7xl mx-auto">
                <button
                  onClick={() => setShowErrandRates(!showErrandRates)}
                  className="w-full flex items-center justify-between bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-100 p-2 rounded-lg">
                      <Receipt className="h-5 w-5 text-slate-700" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-slate-900">A La Carte Errand Rates (Pay-As-You-Go)</h3>
                      <p className="text-sm text-slate-500">Transparent flat fees, no surprises</p>
                    </div>
                  </div>
                  <ChevronDown className={cn('h-5 w-5 text-slate-400 transition-transform duration-200', showErrandRates && 'rotate-180')} />
                </button>

                {showErrandRates && (
                  <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="border-slate-200">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3 mb-3">
                          <Wrench className="h-5 w-5 text-slate-600" />
                          <span className="text-sm font-medium text-slate-900">Routine Service Management</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">KES 2,000 – 3,500</p>
                        <p className="text-xs text-slate-500 mt-1">Per garage run</p>
                      </CardContent>
                    </Card>
                    <Card className="border-slate-200">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3 mb-3">
                          <FileText className="h-5 w-5 text-slate-600" />
                          <span className="text-sm font-medium text-slate-900">NTSA / Diagnostic Inspection Run</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">KES 1,500 – 2,500</p>
                        <p className="text-xs text-slate-500 mt-1">Pickup, inspection & return</p>
                      </CardContent>
                    </Card>
                    <Card className="border-slate-200">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3 mb-3">
                          <Star className="h-5 w-5 text-slate-600" />
                          <span className="text-sm font-medium text-slate-900">Detailing & Spa Pickup/Dropoff</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">KES 1,000 – 1,500</p>
                        <p className="text-xs text-slate-500 mt-1">Full vehicle detailing service</p>
                      </CardContent>
                    </Card>
                    <Card className="border-slate-200">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3 mb-3">
                          <PhoneCall className="h-5 w-5 text-slate-600" />
                          <span className="text-sm font-medium text-slate-900">Roadside Emergency Assistance</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">KES 2,500 – 4,000</p>
                        <p className="text-xs text-slate-500 mt-1">24/7 breakdown response</p>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeSegment === 'fleet' && (
          <div className="py-16 lg:py-24">
            <div className="container mx-auto px-4">
              <div className="max-w-5xl mx-auto">
                {/* Fleet Size Estimator */}
                <Card className="border-slate-200 shadow-sm mb-12">
                  <CardHeader>
                    <CardTitle className="text-2xl font-bold text-slate-900">Fleet Size Estimator</CardTitle>
                    <CardDescription className="text-slate-500">Get instant per-vehicle pricing based on your fleet size</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-700">Fleet Size</span>
                        <span className="text-2xl font-bold text-slate-900">
                          {fleetSize[0]}+ {fleetSize[0] === 50 ? 'Vehicles' : 'Vehicles'}
                        </span>
                      </div>
                      <Slider
                        value={fleetSize}
                        onValueChange={setFleetSize}
                        min={3}
                        max={50}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>3 Vehicles</span>
                        <span>50+ Vehicles</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-6 border border-slate-100">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                          <p className="text-sm text-slate-500 mb-1">Your Pricing Tier</p>
                          <p className="text-xl font-bold text-slate-900">{fleetPrice.label}</p>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-sm text-slate-500 mb-1">Per Vehicle / Month</p>
                          <p className="text-3xl font-bold text-emerald-600">KES {fleetPrice.price.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <p className="text-sm text-slate-600">
                          Estimated monthly total for <span className="font-semibold">{fleetSize[0]} vehicles</span>: <span className="font-bold text-slate-900">KES {(fleetPrice.price * fleetSize[0]).toLocaleString()}</span>
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* B2B Feature Grid */}
                <div className="mb-12">
                  <h3 className="text-2xl font-bold text-slate-900 mb-8 text-center">Enterprise B2B Features</h3>
                  <div className="grid md:grid-cols-3 gap-6">
                    <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="bg-slate-100 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                          <BarChart3 className="h-6 w-6 text-slate-700" />
                        </div>
                        <h4 className="font-bold text-slate-900 mb-2">Automated TCO Tracking</h4>
                        <p className="text-sm text-slate-600 leading-relaxed">Real-time maintenance audit logs and downtime metrics across your entire fleet.</p>
                      </CardContent>
                    </Card>
                    <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="bg-slate-100 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                          <Receipt className="h-6 w-6 text-slate-700" />
                        </div>
                        <h4 className="font-bold text-slate-900 mb-2">Consolidated Corporate Invoicing</h4>
                        <p className="text-sm text-slate-600 leading-relaxed">Unified monthly statements via M-Pesa Paybill, RTGS, or corporate card with itemized partner receipts.</p>
                      </CardContent>
                    </Card>
                    <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="bg-slate-100 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                          <Users className="h-6 w-6 text-slate-700" />
                        </div>
                        <h4 className="font-bold text-slate-900 mb-2">Dedicated On-Site Drivers</h4>
                        <p className="text-sm text-slate-600 leading-relaxed">On-demand drivers for vehicle repositioning, servicing, and corporate transport.</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Enterprise CTA Banner */}
                <Card className="bg-[#0F172A] border-slate-700 text-white">
                  <CardContent className="pt-8 pb-8">
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                      <div className="text-center lg:text-left">
                        <h3 className="text-2xl font-bold mb-2">Managing a fleet larger than 50 vehicles?</h3>
                        <p className="text-slate-300">Get a custom enterprise quote with dedicated account management.</p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                        <Input
                          type="email"
                          placeholder="Enter corporate email"
                          value={corporateEmail}
                          onChange={(e) => setCorporateEmail(e.target.value)}
                          className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-400 focus:ring-emerald-500 focus:border-emerald-500 w-full sm:w-72"
                        />
                        <Button className="bg-emerald-500 hover:bg-emerald-600 text-white whitespace-nowrap w-full sm:w-auto" onClick={handleScheduleAudit}>
                          Schedule Fleet Audit
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Trust & Social Proof Section */}
      <section className="bg-white border-y border-slate-200">
        <div className="container mx-auto px-4 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
            <div className="text-center">
              <p className="text-4xl font-bold text-slate-900 mb-2">1,200+</p>
              <p className="text-slate-500 font-medium">Errand Hours Saved</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-slate-900 mb-2">98.4%</p>
              <p className="text-slate-500 font-medium">On-Time Service Return</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-slate-900 mb-2">KES 0</p>
              <p className="text-slate-500 font-medium">Hidden Markups</p>
            </div>
          </div>

          {/* Partner Logos Slider */}
          <div className="max-w-6xl mx-auto">
            <p className="text-center text-sm text-slate-400 mb-8 uppercase tracking-wider font-medium">Trusted by Nairobi's Leading Partners</p>
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 opacity-40">
              {['Total Garage', 'Tusker Tyres', 'Jubilee Insurance', 'Safaricom Insurance', 'AutoXpress', 'Midas Touch', 'Kercil Motors', 'Naivas Auto'].map((partner) => (
                <div key={partner} className="flex items-center gap-2 text-slate-600">
                  <Building2 className="h-6 w-6" />
                  <span className="font-semibold text-lg whitespace-nowrap">{partner}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-[#F8FAFC] py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 tracking-tight">Frequently Asked Questions</h2>
              <p className="text-slate-600 text-lg">Billing, payments, splits, and service standards explained.</p>
            </div>

            <Accordion type="single" collapsible className="space-y-3">
              <AccordionItem value="item-1" className="bg-white border border-slate-200 rounded-xl px-2 shadow-sm">
                <AccordionTrigger className="text-left font-semibold text-slate-900 hover:no-underline py-4">
                  How does Auto-Concierge handle payments for third-party garage repairs and spare parts?
                </AccordionTrigger>
                <AccordionContent className="text-slate-600 leading-relaxed pb-4">
                  We maintain complete financial transparency through a zero-markup, direct-settlement policy. When your vehicle requires mechanical repairs, routine servicing, or new parts, AutoConcierge acts as your authorized manager. We source parts and negotiate labor directly with our vetted partner garages across Nairobi. The exact third-party costs charged by the garage or vendor are passed directly to you without any added profit margins or hidden markups. You pay the true cost of the repair alongside your flat AutoConcierge service fee.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="bg-white border border-slate-200 rounded-xl px-2 shadow-sm">
                <AccordionTrigger className="text-left font-semibold text-slate-900 hover:no-underline py-4">
                  What is &quot;Split-Invoicing&quot; and how does it appear on my bill?
                </AccordionTrigger>
                <AccordionContent className="text-slate-600 leading-relaxed pb-4">
                  Split-invoicing divides your total transaction into two distinct line items on a single, clean statement: <br/><br/>
                  <strong>Direct Vehicle Expenses (Pass-Through):</strong> The exact cost of third-party spare parts, garage labor, fluids, or NTSA inspection fees. Every direct expense includes the original receipt attached directly from the vendor.<br/><br/>
                  <strong>AutoConcierge Service Fee:</strong> Our fixed, transparent fee for executing the errand, managing the service oversight, and delivering your vehicle.<br/><br/>
                  This separation ensures you always know what went directly into your vehicle versus what was paid for our logistics management.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3" className="bg-white border border-slate-200 rounded-xl px-2 shadow-sm">
                <AccordionTrigger className="text-left font-semibold text-slate-900 hover:no-underline py-4">
                  How do I pay for parts and service runs via M-Pesa or Bank Transfer?
                </AccordionTrigger>
                <AccordionContent className="text-slate-600 leading-relaxed pb-4">
                  Before any major repair work or parts purchase begins, your Concierge Manager sends a real-time digital quote to your phone via SMS or WhatsApp for approval. Once approved, checkout takes less than a minute:<br/><br/>
                  <strong>Instant M-Pesa STK Push:</strong> An automated prompt appears on your phone screen displaying the itemized split-total.<br/><br/>
                  <strong>Direct Paybill / Till Option:</strong> You can settle via our central M-Pesa Paybill number or instant Till prompt.<br/><br/>
                  <strong>Corporate Bank Transfer (RTGS / EFT):</strong> Corporate and fleet clients receive consolidated monthly invoices payable via direct bank transfer.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4" className="bg-white border border-slate-200 rounded-xl px-2 shadow-sm">
                <AccordionTrigger className="text-left font-semibold text-slate-900 hover:no-underline py-4">
                  What happens if a mechanic discovers extra repairs during an errand run?
                </AccordionTrigger>
                <AccordionContent className="text-slate-600 leading-relaxed pb-4">
                  Our concierge team will never authorize additional work or incur expenses without your explicit consent. If a partner garage identifies secondary issues (e.g., worn brake pads discovered during a routine oil change), your assigned manager will:<br/><br/>
                  • Capture photos or video of the affected part at the garage.<br/>
                  • Obtain an itemized cost estimate from the garage.<br/>
                  • Send an updated digital pre-approval request to your terminal app.<br/><br/>
                  Work only proceeds once you tap Approve on your device.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5" className="bg-white border border-slate-200 rounded-xl px-2 shadow-sm">
                <AccordionTrigger className="text-left font-semibold text-slate-900 hover:no-underline py-4">
                  Do I get original receipts and warranties for spare parts purchased?
                </AccordionTrigger>
                <AccordionContent className="text-slate-600 leading-relaxed pb-4">
                  Yes. Complete documentation is a core standard of our service:<br/><br/>
                  <strong>Physical Receipts:</strong> All physical vendor receipts, tax invoices, and parts packaging/warranty cards are placed in your vehicle&apos;s glove compartment upon delivery.<br/><br/>
                  <strong>Digital Audit Trail:</strong> High-resolution scans of all garage receipts and warranty terms are uploaded permanently to your AutoConcierge client dashboard under your vehicle&apos;s digital service history.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0F172A] text-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="bg-white p-2 rounded-lg">
                  <Car className="h-5 w-5 text-slate-900" />
                </div>
                <span className="font-bold text-xl tracking-tight">AutoConcierge</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
                Premium door-to-door vehicle care services for professionals and families. We handle the errands so you can enjoy your life.
              </p>
              <div className="flex items-center gap-4 pt-4">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700 cursor-pointer transition-colors">
                  <Star className="h-5 w-5 text-slate-400" />
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700 cursor-pointer transition-colors">
                  <Phone className="h-5 w-5 text-slate-400" />
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700 cursor-pointer transition-colors">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-6">Quick Links</h3>
              <ul className="space-y-3 text-slate-400 text-sm">
                <li className="hover:text-white transition-colors cursor-pointer" onClick={() => toast.info('Coming soon')}>Terms of Service</li>
                <li className="hover:text-white transition-colors cursor-pointer" onClick={() => toast.info('Coming soon')}>Privacy Policy</li>
                <li className="hover:text-white transition-colors cursor-pointer" onClick={() => toast.info('Partner network page coming soon')}>Partner Network</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-6">Services</h3>
              <ul className="space-y-3 text-slate-400 text-sm">
                <li className="hover:text-white transition-colors cursor-pointer" onClick={() => onNavigate && onNavigate('home')}>Concierge Errands</li>
                <li className="hover:text-white transition-colors cursor-pointer" onClick={() => onNavigate && onNavigate('home')}>Fleet Management</li>
                <li className="hover:text-white transition-colors cursor-pointer" onClick={() => onNavigate && onNavigate('home')}>Emergency Recovery</li>
                <li className="hover:text-white transition-colors cursor-pointer" onClick={() => onNavigate && onNavigate('home')}>NTSA Inspection</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-6">Get In Touch</h3>
              <ul className="space-y-4 text-slate-400 text-sm">
                <li className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-slate-500 mt-0.5 shrink-0" />
                  <span>Kilimani, Nairobi<br />Westlands Business Park<br />Suite 200, 00100</span>
                </li>
                <li className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-slate-500 shrink-0" />
                  <span>support@autoconcierge.co.ke</span>
                </li>
                <li className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-slate-500 shrink-0" />
                  <span>+254 700 000 000</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-slate-500 text-sm">
              © {new Date().getFullYear()} AutoConcierge. All rights reserved.
            </div>
            <div className="flex flex-wrap items-center gap-6 text-sm text-slate-500">
              <span className="hover:text-white cursor-pointer transition-colors" onClick={() => toast.info('Coming soon')}>Privacy Policy</span>
              <span className="hover:text-white cursor-pointer transition-colors" onClick={() => toast.info('Coming soon')}>Terms of Service</span>
              <span className="hover:text-white cursor-pointer transition-colors" onClick={() => toast.info('POS Login portal coming soon')}>POS Login</span>
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-900/30 text-emerald-400 rounded-full border border-emerald-800/50">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-medium">Systems Operational</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
