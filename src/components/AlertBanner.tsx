import { AlertTriangle } from 'lucide-react';
import { cn } from '../utils/cn';

type AlertBannerProps = {
  message: string;
  level: 'Low' | 'Moderate' | 'High';
};

const bannerStyles = {
  Low: 'bg-risk-low/10 border-risk-low/20 text-risk-low',
  Moderate: 'bg-risk-moderate/10 border-risk-moderate/20 text-risk-moderate',
  High: 'bg-risk-high/10 border-risk-high/20 text-risk-high',
}

export default function AlertBanner({ message, level }: AlertBannerProps) {
  return (
    <div className={cn('flex items-center gap-4 p-4 rounded-lg border', bannerStyles[level])}>
      <AlertTriangle className="w-6 h-6" />
      <p className="font-semibold">{message}</p>
    </div>
  );
}
