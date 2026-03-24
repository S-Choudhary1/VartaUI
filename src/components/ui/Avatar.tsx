import React from 'react';
import { cn } from './Button';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  src?: string;
}

const sizes = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
};

const colors = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500',
];

function getColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string): string {
  return name
    .split(/[\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
}

export const Avatar: React.FC<AvatarProps> = ({ name, size = 'md', className, src }) => {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover ring-2 ring-white', sizes[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center text-white font-semibold ring-2 ring-white',
        sizes[size],
        getColor(name),
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
};
