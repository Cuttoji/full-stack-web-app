'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'success' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles = {
  primary: 'bg-[#2D5BFF] text-white hover:bg-[#1E3FCC] focus:ring-[#2D5BFF] shadow-lg shadow-[#2D5BFF]/30',
  secondary: 'bg-white/60 dark:bg-slate-700/60 backdrop-blur-md text-gray-700 dark:text-gray-200 hover:bg-white/80 dark:hover:bg-slate-700/80 focus:ring-[#2D5BFF] border border-white/40 dark:border-slate-600/40',
  danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500 shadow-lg shadow-red-500/30',
  destructive: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500 shadow-lg shadow-red-500/30',
  success: 'bg-green-500 text-white hover:bg-green-600 focus:ring-green-500 shadow-lg shadow-green-500/30',
  ghost: 'bg-transparent text-gray-700 dark:text-gray-200 hover:bg-white/40 dark:hover:bg-slate-700/40 hover:backdrop-blur-md focus:ring-[#2D5BFF]',
  outline: 'border-2 border-[#2D5BFF]/30 dark:border-blue-400/30 bg-white/40 dark:bg-slate-800/40 backdrop-blur-md text-[#2D5BFF] dark:text-blue-400 hover:bg-[#2D5BFF] hover:text-white focus:ring-[#2D5BFF]',
};

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={`
          inline-flex items-center justify-center font-medium rounded-lg
          focus:outline-none focus:ring-2 focus:ring-offset-2
          transition-colors duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : leftIcon ? (
          <span className="mr-2">{leftIcon}</span>
        ) : null}
        {children}
        {rightIcon && !isLoading && <span className="ml-2">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
