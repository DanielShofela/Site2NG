import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'premium';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  className?: string;
  isLoading?: boolean;
  disabled?: boolean;
  onClick?: (e: any) => void | Promise<void>;
  type?: 'button' | 'submit' | 'reset';
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  isLoading = false,
  disabled,
  ...props
}: ButtonProps) {
  
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-orange-600 text-white hover:bg-orange-700 active:scale-98 shadow-md shadow-orange-600/10 border-none';
      case 'secondary':
        return 'bg-slate-900 text-white hover:bg-slate-800 active:scale-98 shadow-md border-none';
      case 'outline':
        return 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 active:scale-98';
      case 'ghost':
        return 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900';
      case 'danger':
        return 'bg-rose-600 text-white hover:bg-rose-700 active:scale-98 shadow-md shadow-rose-600/10';
      case 'premium':
        return 'bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 text-white hover:opacity-95 shadow-lg shadow-orange-600/15 border-none';
      default:
        return '';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'h-9 px-3.5 text-xs rounded-xl';
      case 'lg':
        return 'h-12 px-6 text-sm rounded-2xl';
      case 'icon':
        return 'h-10 w-10 p-0 rounded-xl flex items-center justify-center shrink-0';
      case 'md':
      default:
        return 'h-11 px-5 text-xs rounded-xl';
    }
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center font-bold tracking-wide uppercase transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none ${getVariantStyles()} ${getSizeStyles()} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-1.5">
          <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Chargement...
        </span>
      ) : (
        children
      )}
    </button>
  );
}
