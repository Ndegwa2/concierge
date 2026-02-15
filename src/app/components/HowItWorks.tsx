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
    description: 'Select the right care for your vehicle, from routine washes to detailed inspections. Our plans are flexible and transparent.'
  },
  {
    number: 2,
    title: 'Schedule Pickup',
    icon: Calendar,
    description: 'Pick a convenient time and location. Our professional concierge will arrive promptly to collect your vehicle keys.'
  },
  {
    number: 3,
    title: 'Expert Care',
    icon: ShieldCheck,
    description: 'While you focus on life, our experts handle everything at our partner facilities, ensuring top-tier service standards.'
  },
  {
    number: 4,
    title: 'Vehicle Returned',
    icon: Car,
    description: 'Your car is returned to your doorstep, fully serviced, clean, and ready for your next journey. Experience the concierge difference.'
  }
];

export function HowItWorks() {
  return (
    <div className="py-24">
      <div className="text-center mb-20">
        <span className="text-blue-600 font-semibold tracking-wider uppercase text-sm mb-3 block">Seamless Process</span>
        <h2 className="text-4xl font-bold mb-4 tracking-tight">How AutoConcierge Works</h2>
        <p className="text-slate-600 max-w-2xl mx-auto text-lg leading-relaxed">
          We've reinvented the vehicle care experience. Save hours of your life with our simple, four-step professional concierge process.
        </p>
      </div>

      <div className="grid md:grid-cols-4 gap-12 max-w-7xl mx-auto px-4 relative">
        {/* Connection Line */}
        <div className="hidden lg:block absolute top-[60px] left-[10%] right-[10%] h-0.5 bg-slate-200 z-0" />
        
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div key={step.number} className="group relative z-10">
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-3xl bg-white border-2 border-slate-100 shadow-sm flex items-center justify-center mb-8 group-hover:border-blue-500 group-hover:shadow-md transition-all duration-300">
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-xl font-bold shadow-inner group-hover:bg-blue-600 transition-colors">
                    <Icon className="h-7 w-7" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-sm font-bold text-slate-500">
                    {step.number}
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-4 group-hover:text-blue-600 transition-colors">{step.title}</h3>
                <p className="text-slate-600 leading-relaxed text-sm">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-slate-700 text-sm font-medium">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <span>Fully insured door-to-door service</span>
        </div>
      </div>
    </div>
  );
}
