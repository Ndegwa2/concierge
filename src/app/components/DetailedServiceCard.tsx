import { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Check } from 'lucide-react';

interface DetailedServiceCardProps {
  icon: LucideIcon;
  title: string;
  features: string[];
  image?: string;
}

export function DetailedServiceCard({ icon: Icon, title, features, image }: DetailedServiceCardProps) {
  return (
    <Card className="hover:shadow-lg transition-all hover:-translate-y-1 h-full overflow-hidden flex flex-col">
      {image && (
        <div className="h-48 overflow-hidden">
          <img src={image} alt={title} className="w-full h-full object-cover" />
        </div>
      )}
      <CardHeader>
        <div className="p-3 rounded-lg bg-slate-100 w-fit mb-4">
          <Icon className="h-6 w-6 text-slate-700" />
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <ul className="space-y-3">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-slate-600">
              <Check className="h-4 w-4 text-slate-900 mt-0.5 flex-shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
