import { cn } from '../utils/cn';

type RiskBadgeProps = {
  level: 'Low' | 'Moderate' | 'High';
  large?: boolean;
};

const badgeStyles = {
  Low: 'bg-risk-low/10 text-risk-low border-risk-low/20',
  Moderate: 'bg-risk-moderate/10 text-risk-moderate border-risk-moderate/20',
  High: 'bg-risk-high/10 text-risk-high border-risk-high/20',
};

const dotStyles = {
    Low: 'bg-risk-low',
    Moderate: 'bg-risk-moderate',
    High: 'bg-risk-high',
}

export default function RiskBadge({ level, large = false }: RiskBadgeProps) {
    const sizeClasses = large ? 'px-6 py-2 text-lg gap-3' : 'text-xs px-2.5 py-1 gap-2';

  return (
    <div className={cn('flex items-center font-medium rounded-full border', sizeClasses, badgeStyles[level])}>
        <div className={cn('w-1.5 h-1.5 rounded-full', dotStyles[level])}></div>
        <span>{level}</span>
    </div>
  );
}
