import { CheckCircle2, Search, Calendar, ShieldCheck, Car } from 'lucide-react';

interface Step {
  number: number;
  title: string;
  description: string;
  icon: any;
}

const steps: Step[] = [
  {
    number: 1,
    title: 'Choose Your Service',
    icon: Search,
    description: 'Select the right care for your vehicle, from routine washes to detailed inspections with transparent pricing.'
  },
  {
    number: 2,
    title: 'Schedule Pickup',
    icon: Calendar,
    description: 'Pick a convenient time and location. Our professional concierge will arrive promptly to collect your keys.'
  },
  {
    number: 3,
    title: 'Expert Care',
    icon: ShieldCheck,
    description: 'While you focus on life, our experts handle everything at our partner facilities under top-tier standards.'
  },
  {
    number: 4,
    title: 'Vehicle Returned',
    icon: Car,
    description: 'Your car is returned to your doorstep, fully serviced, clean, and ready for your next journey.'
  }
];

export function HowItWorks() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-blue-600 font-semibold tracking-wider uppercase text-sm mb-3 block">Seamless Process</span>
          <h2 className="text-4xl font-bold text-slate-900 tracking-tight mb-4">
            How AutoConcierge Works
          </h2>
          <p className="text-slate-600 text-lg leading-relaxed">
            We've reinvented the vehicle care experience. Save hours with our simple, four-step professional concierge process.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="relative flex flex-col bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200"
              >
                {/* Step Number Tag */}
                <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase mb-4">
                  Step {String(step.number).padStart(2, '0')}
                </span>

                {/* Icon Box */}
                <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center mb-5 shadow-sm">
                  <Icon className="w-6 h-6" />
                </div>

                {/* Content */}
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {step.description}
                </p>

                {/* Desktop Chevron */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-20">
                    <div className="w-6 h-6 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                      <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Trust Badge */}
        <div className="mt-12 flex justify-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Fully insured door-to-door service</span>
          </div>
        </div>
      </div>
    </section>
  );
}
