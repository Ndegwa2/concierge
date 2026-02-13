import { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';

interface ServiceCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  duration: string;
  price: string;
  onBook: () => void;
}

export function ServiceCard({ icon: Icon, title, description, duration, price, onBook }: ServiceCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="p-3 rounded-lg bg-slate-100 w-fit">
            <Icon className="h-6 w-6 text-slate-700" />
          </div>
          <span className="text-slate-500 text-sm">{duration}</span>
        </div>
        <CardTitle className="mt-4">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-semibold">{price}</span>
          <Button onClick={onBook}>Book Now</Button>
        </div>
      </CardContent>
    </Card>
  );
}
