import React from 'react';
import { cn } from './Button';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: { value: string; positive: boolean };
  iconBg?: string;
  iconColor?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  iconBg = 'bg-[#008069]/10',
  iconColor = 'text-[#008069]',
  className,
}) => (
  <div className={cn(
    'bg-white rounded-2xl border border-gray-100/80 p-5 hover:shadow-md transition-all duration-300 group',
    className
  )}>
    <div className="flex items-start justify-between">
      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
      </div>
      <div className={cn('p-2.5 rounded-xl transition-transform duration-300 group-hover:scale-110', iconBg)}>
        <Icon className={cn('w-5 h-5', iconColor)} />
      </div>
    </div>
    {trend && (
      <div className="mt-3 flex items-center text-xs gap-1">
        {trend.positive ? (
          <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
        ) : (
          <TrendingDown className="w-3.5 h-3.5 text-red-500" />
        )}
        <span className={trend.positive ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
          {trend.value}
        </span>
        <span className="text-gray-400">vs last month</span>
      </div>
    )}
  </div>
);
