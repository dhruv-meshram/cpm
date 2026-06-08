'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

// ── ButtonPrimary — pill-shaped, black, main CTA ───────────────────────────────
interface ButtonPrimaryProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const ButtonPrimary = forwardRef<HTMLButtonElement, ButtonPrimaryProps>(
  ({ children, loading, size = 'md', className, disabled, ...props }, ref) => {
    const sizes = {
      sm: 'px-4 py-2 text-[14px]',
      md: 'px-6 py-3 text-[16px]',
      lg: 'px-8 py-4 text-[16px]',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          // base
          'inline-flex items-center justify-center gap-2 font-[500] leading-[1.5]',
          'rounded-[9999px] transition-all duration-[150ms]',
          'bg-black text-white',
          // hover / active
          'hover:bg-[#222222] active:scale-[0.97] active:bg-[#333333]',
          // disabled
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100',
          // focus
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black',
          sizes[size],
          className
        )}
        {...props}
      >
        {loading && <Loader2 size={16} className="animate-spin shrink-0" />}
        {children}
      </button>
    );
  }
);
ButtonPrimary.displayName = 'ButtonPrimary';


// ── ButtonSecondary — pill-shaped, white, soft shadow ────────────────────────
interface ButtonSecondaryProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'md' | 'lg';
}

export const ButtonSecondary = forwardRef<HTMLButtonElement, ButtonSecondaryProps>(
  ({ children, size = 'md', className, ...props }, ref) => {
    const sizes = {
      sm: 'px-4 py-2 text-[14px]',
      md: 'px-6 py-3 text-[16px]',
      lg: 'px-8 py-4 text-[16px]',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-[500] leading-[1.5]',
          'rounded-[9999px] transition-all duration-[150ms]',
          'bg-white text-[#000000] border border-[#e6e6e6]',
          'shadow-[rgba(0,0,0,0.01)_0_0.175px_1.041px,rgba(0,0,0,0.02)_0_0.8px_2.925px,rgba(0,0,0,0.027)_0_2.025px_7.847px,rgba(0,0,0,0.04)_0_4px_18px]',
          'hover:bg-[#f6f5f4] active:scale-[0.97]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black',
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
ButtonSecondary.displayName = 'ButtonSecondary';


// ── ButtonUtility — 8px radius, hairline border, compact ─────────────────────
interface ButtonUtilityProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: 'default' | 'ghost' | 'danger';
}

export const ButtonUtility = forwardRef<HTMLButtonElement, ButtonUtilityProps>(
  ({ children, loading, variant = 'default', className, disabled, ...props }, ref) => {
    const variants = {
      default: 'bg-white text-[#000000] border border-[#e6e6e6] hover:bg-[#f6f5f4]',
      ghost: 'bg-transparent text-[#615d59] border border-transparent hover:bg-[#f6f5f4] hover:text-[#000000]',
      danger: 'bg-white text-[#f64932] border border-[#e6e6e6] hover:bg-red-50',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2',
          'px-[14px] py-[4px] min-h-[32px]',
          'text-[15px] font-[500] leading-[1.5]',
          'rounded-[8px] transition-all duration-[150ms]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black',
          variants[variant],
          className
        )}
        {...props}
      >
        {loading && <Loader2 size={14} className="animate-spin shrink-0" />}
        {children}
      </button>
    );
  }
);
ButtonUtility.displayName = 'ButtonUtility';


// ── IconButton — small icon-only button ──────────────────────────────────────
interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'ghost' | 'soft' | 'outline';
  size?: 'sm' | 'md';
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ children, variant = 'ghost', size = 'md', className, ...props }, ref) => {
    const sizes = { sm: 'w-7 h-7', md: 'w-8 h-8' };
    const variants = {
      ghost: 'text-[#615d59] hover:bg-[#f6f5f4] hover:text-[#000000]',
      soft: 'bg-[rgba(0,0,0,0.05)] text-[#000000] hover:bg-[rgba(0,0,0,0.08)]',
      outline: 'border border-[#e6e6e6] text-[#000000] hover:bg-[#f6f5f4]',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center',
          'rounded-[8px] transition-colors duration-[150ms]',
          'active:scale-[0.93]',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black',
          sizes[size],
          variants[variant],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
IconButton.displayName = 'IconButton';
