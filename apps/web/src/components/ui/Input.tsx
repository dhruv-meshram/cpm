'use client';

import { forwardRef, useState } from 'react';
import { Search, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── TextInput — form input matching design spec ───────────────────────────────
interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, className, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={id}
            className="text-[14px] font-[500] text-[#000000] leading-[1.43]"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a39e98] pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={id}
            className={cn(
              'w-full bg-white text-[#000000]',
              'text-[15px] font-[400] leading-[1.33]',
              'border border-[#ddd] rounded-[4px]',
              'px-3 py-[6px]',
              'placeholder:text-[#a39e98]',
              'transition-all duration-[150ms]',
              'focus:outline-none focus:border-[#000000]',
              'focus:shadow-[rgba(0,0,0,0.01)_0_0.175px_1.041px,rgba(0,0,0,0.02)_0_0.8px_2.925px,rgba(0,0,0,0.027)_0_2.025px_7.847px,rgba(0,0,0,0.04)_0_4px_18px]',
              error && 'border-[#f64932] focus:border-[#f64932]',
              leftIcon && 'pl-9',
              rightIcon && 'pr-9',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a39e98]">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="text-[13px] text-[#f64932] leading-[1.33]">{error}</p>
        )}
        {!error && helperText && (
          <p className="text-[13px] text-[#a39e98] leading-[1.33]">{helperText}</p>
        )}
      </div>
    );
  }
);
TextInput.displayName = 'TextInput';


// ── PasswordInput — text input with show/hide toggle ─────────────────────────
interface PasswordInputProps extends Omit<TextInputProps, 'type' | 'rightIcon'> {}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...props }, ref) => {
    const [show, setShow] = useState(false);

    return (
      <TextInput
        ref={ref}
        type={show ? 'text' : 'password'}
        rightIcon={
          <button
            type="button"
            onClick={() => setShow(s => !s)}
            className="hover:text-[#615d59] transition-colors"
            tabIndex={-1}
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        }
        className={className}
        {...props}
      />
    );
  }
);
PasswordInput.displayName = 'PasswordInput';


// ── SearchBar — input with integrated search icon ────────────────────────────
interface SearchBarProps extends React.InputHTMLAttributes<HTMLInputElement> {
  containerClassName?: string;
}

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  ({ containerClassName, className, ...props }, ref) => {
    return (
      <div
        className={cn(
          'flex items-center gap-2',
          'bg-white border border-[#e6e6e6] rounded-[8px]',
          'px-3 py-2',
          'focus-within:border-[#000000]',
          'focus-within:shadow-[rgba(0,0,0,0.01)_0_0.175px_1.041px,rgba(0,0,0,0.02)_0_0.8px_2.925px,rgba(0,0,0,0.027)_0_2.025px_7.847px]',
          'transition-all duration-[150ms]',
          containerClassName
        )}
      >
        <Search size={15} className="text-[#a39e98] shrink-0" />
        <input
          ref={ref}
          type="search"
          className={cn(
            'flex-1 bg-transparent border-none outline-none',
            'text-[15px] text-[#000000] placeholder:text-[#a39e98]',
            'font-[400] leading-[1.33]',
            className
          )}
          {...props}
        />
      </div>
    );
  }
);
SearchBar.displayName = 'SearchBar';


// ── Textarea ──────────────────────────────────────────────────────────────────
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-[14px] font-[500] text-[#000000] leading-[1.43]">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          className={cn(
            'w-full bg-white text-[#000000]',
            'text-[15px] font-[400] leading-[1.5]',
            'border border-[#ddd] rounded-[4px]',
            'px-3 py-2',
            'placeholder:text-[#a39e98]',
            'resize-y min-h-[80px]',
            'transition-all duration-[150ms]',
            'focus:outline-none focus:border-[#000000]',
            error && 'border-[#f64932]',
            className
          )}
          {...props}
        />
        {error && <p className="text-[13px] text-[#f64932] leading-[1.33]">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
