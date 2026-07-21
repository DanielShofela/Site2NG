import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  intensity?: 'light' | 'medium' | 'dark';
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

export default function GlassCard({ children, className = '', intensity = 'medium', ...props }: GlassCardProps) {
  const getIntensityClass = () => {
    switch (intensity) {
      case 'light':
        return 'bg-white/40 backdrop-blur-sm border-white/10';
      case 'dark':
        return 'bg-slate-900/80 backdrop-blur-lg border-slate-700/30 text-white';
      case 'medium':
      default:
        return 'bg-white/75 backdrop-blur-md border-white/20 shadow-lg';
    }
  };

  return (
    <div
      className={`rounded-3xl border p-6 transition-all duration-300 ${getIntensityClass()} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
