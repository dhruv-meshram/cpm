'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { Network, ArrowRight } from 'lucide-react';
import { TextInput, PasswordInput } from '@/components/ui/Input';
import { ButtonPrimary } from '@/components/ui/Button';

const loginSchema = z.object({
  email: z.email({ error: 'Please enter a valid email' }),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setServerError(null);
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        setServerError(json.error || 'Login failed. Please try again.');
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setServerError('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: '#f6f5f4' }}
    >
      {/* Card */}
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

        {/* Auth card — ex-auth-form-card */}
        <div className="bg-white rounded-[12px] border border-[#e6e6e6] p-8 shadow-[rgba(0,0,0,0.01)_0_0.175px_1.041px,rgba(0,0,0,0.02)_0_0.8px_2.925px,rgba(0,0,0,0.027)_0_2.025px_7.847px,rgba(0,0,0,0.04)_0_4px_18px]">
          {/* Heading */}
          <div className="mb-7">
            <h1
              className="text-[#000000] mb-1"
              style={{ fontSize: '26px', fontWeight: 700, lineHeight: 1.23, letterSpacing: '-0.625px' }}
            >
              Welcome back
            </h1>
            <p className="text-[15px] text-[#615d59] leading-[1.33]">
              Sign in to your CPM Planner account
            </p>
          </div>

          {/* Error state */}
          {serverError && (
            <div className="mb-5 px-4 py-3 rounded-[8px] bg-red-50 border border-red-200 text-[14px] text-red-700 leading-[1.43]">
              {serverError}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
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
              placeholder="••••••••"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register('password')}
            />

            {/* Forgot password */}
            <div className="text-right">
              <Link
                href="#"
                className="text-[13px] text-black hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <ButtonPrimary
              type="submit"
              size="md"
              loading={isSubmitting}
              className="w-full justify-center"
            >
              {isSubmitting ? 'Signing in…' : (
                <>
                  Sign in <ArrowRight size={16} />
                </>
              )}
            </ButtonPrimary>
          </form>
        </div>

        {/* Sign up link */}
        <p className="text-center text-[14px] text-[#615d59] mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-black font-[500] hover:underline">
            Create one free
          </Link>
        </p>
      </div>
    </div>
  );
}
