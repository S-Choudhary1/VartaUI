import React from 'react';
import { Search } from 'lucide-react';
import { cn } from './Button';

interface SearchBarProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'sm' | 'md';
}

export const SearchBar: React.FC<SearchBarProps> = ({ className, size = 'md', ...props }) => (
  <div className={cn('relative', className)}>
    <Search className={cn(
      'absolute left-3 top-1/2 -translate-y-1/2 text-gray-400',
      size === 'sm' ? 'w-4 h-4' : 'w-4.5 h-4.5'
    )} />
    <input
      type="text"
      className={cn(
        'w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#008069]/20 focus:border-[#008069]/40 focus:bg-white transition-all duration-200',
        size === 'sm' ? 'h-9' : 'h-10'
      )}
      {...props}
    />
  </div>
);
