import React from 'react';
import { cn } from './Button';

interface Tab {
  id: string;
  label: string;
  icon?: React.ElementType;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, active, onChange, className }) => (
  <div className={cn('flex items-center gap-1 p-1 bg-gray-100/80 rounded-xl', className)}>
    {tabs.map((tab) => {
      const Icon = tab.icon;
      const isActive = active === tab.id;
      return (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200',
            isActive
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          {Icon && <Icon className="w-4 h-4" />}
          {tab.label}
          {tab.count !== undefined && (
            <span className={cn(
              'text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center',
              isActive ? 'bg-gray-100 text-gray-700' : 'bg-gray-200/60 text-gray-500'
            )}>
              {tab.count}
            </span>
          )}
        </button>
      );
    })}
  </div>
);
