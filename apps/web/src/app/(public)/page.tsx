import Link from 'next/link';
import {
  ArrowRight,
  Network,
  BarChart3,
  Workflow,
  CheckCircle,
  Zap,
  Shield,
  Clock,
  GitBranch,
  Target,
  TrendingUp,
} from 'lucide-react';
import { TopNav } from '@/components/layout/TopNav';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f6f5f4]">
      <TopNav />

      {/* ── HERO BAND — deep indigo, the single dark island ─────────────────── */}
      <section
        id="hero"
        className="relative bg-black overflow-hidden pt-[64px]"
      >
        {/* Decorative starfield / gradient orbs */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse 80% 60% at 60% 30%, rgba(255,255,255,0.05) 0%, transparent 70%),
              radial-gradient(ellipse 50% 50% at 20% 70%, rgba(255,255,255,0.03) 0%, transparent 60%)
            `,
          }}
        />

        {/* Subtle dot grid */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Decorative sticker orbs */}
        <div aria-hidden="true" className="absolute top-20 right-[8%] w-48 h-48 rounded-full bg-white/5 blur-3xl" />
        <div aria-hidden="true" className="absolute bottom-0 left-[12%] w-64 h-64 rounded-full bg-white/5 blur-3xl" />

        <div className="relative max-w-[1280px] mx-auto px-6 py-24 md:py-32 text-center">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-[9999px] bg-white/10 border border-white/20 mb-8">
            <Zap size={13} className="text-white" />
            <span className="text-[12px] font-[600] text-white/80 tracking-[0.125px] uppercase">
              Powered by C++ Critical Path Engine
            </span>
          </div>

          {/* Hero headline */}
          <h1
            className="text-white mx-auto mb-6"
            style={{
              fontSize: 'clamp(40px, 6vw, 64px)',
              fontWeight: 700,
              lineHeight: 1.0,
              letterSpacing: '-2.125px',
              maxWidth: '820px',
            }}
          >
            Master your project schedules with{' '}
            <span className="text-[#62aef0]">Critical Path</span> logic.
          </h1>

          {/* Sub-headline */}
          <p
            className="text-white/70 mx-auto mb-10"
            style={{
              fontSize: '20px',
              fontWeight: 400,
              lineHeight: '30px',
              maxWidth: '560px',
            }}
          >
            Stop guessing deadlines. Map dependencies, auto-calculate float, and
            instantly identify the tasks that dictate your delivery date.
          </p>

          {/* CTA pair */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-black text-[16px] font-[500] rounded-[9999px] hover:bg-[#ece9e6] active:scale-[0.97] transition-all duration-150 shadow-[rgba(0,0,0,0.1)_0_4px_16px]"
            >
              Start planning free
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-[#000000] text-[16px] font-[500] rounded-[9999px] hover:bg-[#f6f5f4] active:scale-[0.97] transition-all duration-150 shadow-[rgba(0,0,0,0.1)_0_4px_16px]"
            >
              Sign in
            </Link>
          </div>

          {/* Trust bar */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-white/40 text-[13px] font-[500]">
            {['PostgreSQL-backed', 'Real-time WebSocket sync', 'C++ calculation engine', 'Open source'].map(item => (
              <div key={item} className="flex items-center gap-2">
                <CheckCircle size={14} className="text-[#1aae39]" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES — warm canvas, 3-up card grid ────────────────────────────── */}
      <section id="features" className="bg-[#f6f5f4] py-24">
        <div className="max-w-[1280px] mx-auto px-6">
          {/* Section header */}
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[9999px] bg-white border border-[#e6e6e6] text-[12px] font-[600] text-black tracking-[0.125px] uppercase mb-4">
              Core Features
            </span>
            <h2
              style={{
                fontSize: 'clamp(28px, 4vw, 40px)',
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: '-1px',
                color: '#000000',
              }}
            >
              Everything you need to manage critical projects
            </h2>
            <p className="text-[#615d59] text-[16px] leading-[1.5] mt-4 max-w-xl mx-auto">
              Built for project managers who need precision, not guesswork.
            </p>
          </div>

          {/* 3-column feature grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Network,
                accentColor: '#62aef0',
                accentBg: 'rgba(98,174,240,0.12)',
                title: 'Dependency Graphs',
                desc: 'Build your network diagram visually. Link tasks with Finish-to-Start, Start-to-Start, and complex lag constraints. See the full picture instantly.',
              },
              {
                icon: Zap,
                accentColor: '#d6b6f6',
                accentBg: 'rgba(214,182,246,0.12)',
                title: 'Auto CPM Calculation',
                desc: 'Our C++ engine computes Early Start, Late Finish, and Float times in milliseconds for massive task networks with 1000s of dependencies.',
              },
              {
                icon: BarChart3,
                accentColor: '#2a9d99',
                accentBg: 'rgba(42,157,153,0.12)',
                title: 'Dynamic Gantt Charts',
                desc: 'Watch your schedule update in real-time. Critical tasks are highlighted so your team knows exactly what to focus on, today.',
              },
              {
                icon: GitBranch,
                accentColor: '#ff64c8',
                accentBg: 'rgba(255,100,200,0.10)',
                title: 'Critical Path Tracking',
                desc: 'Automatically identify and highlight the critical path across your entire project. Any slip on the critical path slips the project.',
              },
              {
                icon: Target,
                accentColor: '#1aae39',
                accentBg: 'rgba(26,174,57,0.10)',
                title: 'Milestone Management',
                desc: 'Set milestones at key checkpoints. Track progress against them and get early warnings when deadlines are at risk.',
              },
              {
                icon: TrendingUp,
                accentColor: '#dd5b00',
                accentBg: 'rgba(221,91,0,0.10)',
                title: 'Portfolio Dashboard',
                desc: 'Get a bird\'s-eye view across all your projects. Monitor health, progress, and critical path length in one unified workspace.',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-[12px] border border-[#e6e6e6] p-6 hover:shadow-[rgba(0,0,0,0.01)_0_0.175px_1.041px,rgba(0,0,0,0.02)_0_0.8px_2.925px,rgba(0,0,0,0.027)_0_2.025px_7.847px,rgba(0,0,0,0.04)_0_4px_18px] transition-shadow duration-200"
              >
                {/* Colour-blocked icon tile */}
                <div
                  className="w-11 h-11 rounded-[10px] flex items-center justify-center mb-5"
                  style={{ background: feature.accentBg }}
                >
                  <feature.icon size={20} style={{ color: feature.accentColor }} />
                </div>
                <h3
                  className="text-[#000000] mb-2"
                  style={{ fontSize: '22px', fontWeight: 700, lineHeight: 1.27, letterSpacing: '-0.25px' }}
                >
                  {feature.title}
                </h3>
                <p className="text-[#615d59] text-[15px] leading-[1.5]">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS — alternating text + visual ─────────────────────────── */}
      <section id="how-it-works" className="bg-white py-24 border-y border-[#e6e6e6]">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[9999px] bg-[#f6f5f4] border border-[#e6e6e6] text-[12px] font-[600] text-[#615d59] tracking-[0.125px] uppercase mb-4">
              How It Works
            </span>
            <h2
              style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-1px', color: '#000000' }}
            >
              From XML import to critical path in minutes
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                icon: Workflow,
                title: 'Import or Create',
                desc: 'Import ProjectLibre XML files or create a project from scratch. Your task hierarchy is preserved perfectly.',
              },
              {
                step: '02',
                icon: Network,
                title: 'Link Dependencies',
                desc: 'Define task relationships. The engine automatically validates your logic and prevents circular dependencies.',
              },
              {
                step: '03',
                icon: Zap,
                title: 'Get Your Critical Path',
                desc: 'One click triggers the C++ calculation engine. Early/Late times, float, and the full critical path appear instantly.',
              },
            ].map((step) => (
              <div key={step.step} className="relative">
                {/* Step connector line */}
                <div className="flex items-start gap-4">
                  <div className="shrink-0">
                    <div className="w-12 h-12 rounded-[12px] bg-[#f6f5f4] border border-[#e6e6e6] flex items-center justify-center mb-4">
                      <step.icon size={20} className="text-black" />
                    </div>
                    <div className="text-[11px] font-[700] text-[#a39e98] tracking-[0.5px] uppercase mb-3">
                      Step {step.step}
                    </div>
                  </div>
                </div>
                <h3
                  className="text-[#000000] mb-3"
                  style={{ fontSize: '22px', fontWeight: 700, lineHeight: 1.27, letterSpacing: '-0.25px' }}
                >
                  {step.title}
                </h3>
                <p className="text-[#615d59] text-[15px] leading-[1.5]">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST SECTION — social proof on warm canvas ───────────────────────── */}
      <section id="about" className="bg-[#f6f5f4] py-24">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Shield, label: 'Secure', value: 'JWT Auth', sub: 'Edge-compatible jose' },
              { icon: Zap, label: 'Fast', value: '<5ms', sub: 'CPM calculation time' },
              { icon: Clock, label: 'Real-time', value: 'WebSocket', sub: 'Live sync across tabs' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white rounded-[12px] border border-[#e6e6e6] p-6 flex items-center gap-5 shadow-[rgba(0,0,0,0.01)_0_0.175px_1.041px,rgba(0,0,0,0.02)_0_0.8px_2.925px,rgba(0,0,0,0.027)_0_2.025px_7.847px,rgba(0,0,0,0.04)_0_4px_18px]"
              >
                <div className="w-12 h-12 rounded-[10px] bg-[#f6f5f4] flex items-center justify-center shrink-0">
                  <stat.icon size={22} className="text-black" />
                </div>
                <div>
                  <div className="text-[11px] font-[600] text-[#a39e98] uppercase tracking-[0.125px] mb-1">{stat.label}</div>
                  <div className="text-[22px] font-[700] text-[#000000] leading-[1.27] tracking-[-0.25px]">{stat.value}</div>
                  <div className="text-[13px] text-[#615d59]">{stat.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA BAND ───────────────────────────────────────────────────── */}
      <section className="bg-white border-t border-[#e6e6e6] py-24">
        <div className="max-w-[600px] mx-auto px-6 text-center">
          <h2
            className="text-[#000000] mb-4"
            style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-1px' }}
          >
            Ready to find your critical path?
          </h2>
          <p className="text-[#615d59] text-[16px] leading-[1.5] mb-8">
            Create your free account and start scheduling with precision today.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 bg-black text-white text-[16px] font-[500] rounded-[9999px] hover:bg-[#222222] active:scale-[0.97] transition-all duration-150"
            >
              Get started — it&apos;s free
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/login"
              className="text-[15px] font-[500] text-[#615d59] hover:text-[#000000] transition-colors"
            >
              Already have an account? Log in →
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer className="bg-[#f6f5f4] border-t border-[#e6e6e6] py-12">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            {/* Brand column */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-7 h-7 rounded-[6px] bg-black flex items-center justify-center">
                  <Network size={14} className="text-white" />
                </div>
                <span className="text-[14px] font-[700] text-[#000000] tracking-[-0.25px]">CPM Planner</span>
              </div>
              <p className="text-[13px] text-[#a39e98] leading-[1.5]">
                Professional project scheduling with critical path analysis.
              </p>
            </div>

            {/* Links */}
            {[
              {
                title: 'Product',
                links: [
                  { label: 'Features', href: '#features' },
                  { label: 'How it works', href: '#how-it-works' },
                  { label: 'Changelog', href: '#' },
                ],
              },
              {
                title: 'Account',
                links: [
                  { label: 'Login', href: '/login' },
                  { label: 'Sign up', href: '/signup' },
                  { label: 'Dashboard', href: '/dashboard' },
                ],
              },
              {
                title: 'Resources',
                links: [
                  { label: 'Documentation', href: '#' },
                  { label: 'API Reference', href: '#' },
                  { label: 'GitHub', href: '#' },
                ],
              },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-[12px] font-[600] text-[#000000] uppercase tracking-[0.125px] mb-3">
                  {col.title}
                </h4>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-[14px] text-[#615d59] hover:text-[#000000] transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-[#e6e6e6] pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-[13px] text-[#a39e98]">
              © {new Date().getFullYear()} CPM Planner. Built with Next.js + PostgreSQL.
            </p>
            <div className="flex items-center gap-4">
              {['Privacy', 'Terms', 'Contact'].map((item) => (
                <Link
                  key={item}
                  href="#"
                  className="text-[13px] text-[#a39e98] hover:text-[#615d59] transition-colors"
                >
                  {item}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
