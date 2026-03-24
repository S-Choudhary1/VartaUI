import React from 'react';
import { cn } from './Button';

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, action, className }) => (
  <div className={cn('flex flex-col items-center justify-center py-16 px-4', className)}>
    <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
      <Icon className="w-8 h-8 text-gray-400" />
    </div>
    <h3 className="text-base font-semibold text-gray-900">{title}</h3>
    {description && <p className="text-sm text-gray-500 mt-1 max-w-sm text-center">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);
