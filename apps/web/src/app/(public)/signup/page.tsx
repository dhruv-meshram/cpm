'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { Network, ArrowRight, CheckCircle } from 'lucide-react';
import { TextInput, PasswordInput } from '@/components/ui/Input';
import { ButtonPrimary } from '@/components/ui/Button';

const signupSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.email({ error: 'Please enter a valid email address' }),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[0-9]/, 'Must contain a number')
    .regex(/[^A-Za-z0-9]/, 'Must contain a special character'),
});

type SignupForm = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupForm) => {
    setServerError(null);
    try {
      const res = await fetch('/api/v1/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        if (Array.isArray(json.error)) {
          setServerError(json.error[0]?.message || 'Validation failed');
        } else {
          setServerError(json.error || 'Failed to create account. Please try again.');
        }
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setServerError('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-[#f6f5f4]">
      <div className="w-full max-w-[400px]">
        {/* Wordmark */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[10px] bg-black flex items-center justify-center">
              <Network size={18} className="text-white" />
            </div>
            <span className="text-[16px] font-[700] text-[#000000] tracking-[-0.25px]">
              CPM Planner
            </span>
          </Link>
        </div>

        {/* Auth card */}
        <div className="bg-white rounded-[12px] border border-[#e6e6e6] p-8 shadow-[rgba(0,0,0,0.01)_0_0.175px_1.041px,rgba(0,0,0,0.02)_0_0.8px_2.925px,rgba(0,0,0,0.027)_0_2.025px_7.847px,rgba(0,0,0,0.04)_0_4px_18px]">
          <div className="mb-7">
            <h1
              className="text-[#000000] mb-1"
              style={{ fontSize: '26px', fontWeight: 700, lineHeight: 1.23, letterSpacing: '-0.625px' }}
            >
              Create your account
            </h1>
            <p className="text-[15px] text-[#615d59] leading-[1.33]">
              Start planning with CPM Planner — it&apos;s free
            </p>
          </div>

          {/* Benefits */}
          <div className="flex flex-col gap-2 mb-7 p-4 bg-[#f6f5f4] rounded-[8px] border border-[#e6e6e6]">
            {['Free account, no credit card needed', 'Import ProjectLibre XML files', 'Unlimited critical path calculations'].map(benefit => (
              <div key={benefit} className="flex items-center gap-2">
                <CheckCircle size={14} className="text-[#1aae39] shrink-0" />
                <span className="text-[13px] text-[#615d59]">{benefit}</span>
              </div>
            ))}
          </div>

          {/* Error */}
          {serverError && (
            <div className="mb-5 px-4 py-3 rounded-[8px] bg-red-50 border border-red-200 text-[14px] text-red-700 leading-[1.43]">
              {serverError}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <TextInput
              label="Username"
              id="username"
              type="text"
              placeholder="johndoe"
              autoComplete="username"
              error={errors.username?.message}
              {...register('username')}
            />

            <TextInput
              label="Email"
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />

            <PasswordInput
              label="Password"
              id="password"
              placeholder="Min. 8 chars, upper, lower, number, symbol"
              autoComplete="new-password"
              error={errors.password?.message}
              {...register('password')}
            />

            <ButtonPrimary
              type="submit"
              size="md"
              loading={isSubmitting}
              className="w-full justify-center"
            >
              {isSubmitting ? 'Creating account…' : (
                <>
                  Create account <ArrowRight size={16} />
                </>
              )}
            </ButtonPrimary>
          </form>
        </div>

        {/* Login link */}
        <p className="text-center text-[14px] text-[#615d59] mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-black font-[500] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
