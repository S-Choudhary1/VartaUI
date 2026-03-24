import React from 'react';
import { cn } from './Button';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default' | 'outline';
  size?: 'sm' | 'md';
  dot?: boolean;
}

const variantStyles = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  warning: 'bg-amber-50 text-amber-700 border-amber-200/60',
  danger: 'bg-red-50 text-red-700 border-red-200/60',
  info: 'bg-blue-50 text-blue-700 border-blue-200/60',
  default: 'bg-gray-50 text-gray-600 border-gray-200/60',
  outline: 'bg-white text-gray-600 border-gray-200',
};

const dotStyles = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  info: 'bg-blue-500',
  default: 'bg-gray-400',
  outline: 'bg-gray-400',
};

export const Badge: React.FC<BadgeProps> = ({ className, variant = 'default', size = 'sm', dot, children, ...props }) => (
  <span
    className={cn(
      'inline-flex items-center font-medium border rounded-full',
      size === 'sm' ? 'px-2 py-0.5 text-xs gap-1' : 'px-2.5 py-1 text-xs gap-1.5',
      variantStyles[variant],
      className
    )}
    {...props}
  >
    {dot && <span className={cn('w-1.5 h-1.5 rounded-full', dotStyles[variant])} />}
    {children}
  </span>
);
