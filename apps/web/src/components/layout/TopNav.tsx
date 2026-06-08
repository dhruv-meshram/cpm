'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X, Network, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Public TopNav — landing + auth pages ─────────────────────────────────────
interface TopNavProps {
  className?: string;
}

export function TopNav({ className }: TopNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'How it works', href: '#how-it-works' },
    { label: 'About', href: '#about' },
  ];

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50',
        'bg-white/90 backdrop-blur-[12px]',
        'border-b border-[#e6e6e6]',
        'h-[64px]',
        className
      )}
    >
      <div className="max-w-[1280px] mx-auto px-6 h-full flex items-center justify-between gap-6">
        {/* ── Wordmark ─────────────────────────────────────────── */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-[8px] bg-black flex items-center justify-center">
            <Network size={16} className="text-white" />
          </div>
          <span className="text-[15px] font-[700] text-[#000000] tracking-[-0.25px]">
            CPM Planner
          </span>
        </Link>

        {/* ── Desktop Nav links ─────────────────────────────────── */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="px-3 py-2 text-[15px] font-[400] text-[#615d59] hover:text-[#000000] rounded-[8px] hover:bg-[#f6f5f4] transition-colors duration-150"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* ── Desktop Actions ───────────────────────────────────── */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="text-[15px] font-[500] text-[#615d59] hover:text-[#000000] px-3 py-2 rounded-[8px] hover:bg-[#f6f5f4] transition-colors duration-150"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-black text-white text-[15px] font-[500] rounded-[9999px] hover:bg-[#222222] active:scale-[0.97] active:bg-[#333333] transition-all duration-150"
          >
            Get started
            <ArrowRight size={15} />
          </Link>
        </div>

        {/* ── Mobile hamburger ─────────────────────────────────── */}
        <button
          className="md:hidden p-2 text-[#615d59] hover:text-[#000000] hover:bg-[#f6f5f4] rounded-[8px] transition-colors"
          onClick={() => setMobileOpen(o => !o)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* ── Mobile drawer ─────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="md:hidden absolute top-[64px] left-0 right-0 bg-white border-b border-[#e6e6e6] shadow-[var(--shadow-soft)] animate-fade-in">
          <div className="max-w-[1280px] mx-auto px-6 py-4 flex flex-col gap-2">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2.5 text-[15px] font-[500] text-[#615d59] hover:text-[#000000] rounded-[8px] hover:bg-[#f6f5f4] transition-colors"
              >
                {link.label}
              </a>
            ))}
            <div className="border-t border-[#e6e6e6] pt-3 mt-1 flex flex-col gap-2">
              <Link
                href="/login"
                className="px-3 py-2.5 text-[15px] font-[500] text-[#615d59] hover:text-[#000000] rounded-[8px] hover:bg-[#f6f5f4] transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="flex items-center justify-center gap-2 px-5 py-3 bg-black text-white text-[15px] font-[500] rounded-[9999px] hover:bg-[#222222] transition-colors"
              >
                Get started <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
