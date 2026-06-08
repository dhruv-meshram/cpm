import { cn } from '@/lib/utils';

// ── StatusBadge — semantic status pill ───────────────────────────────────────
type StatusVariant = 'active' | 'completed' | 'delayed' | 'draft' | 'on_hold' | 'cancelled' | 'default';

const statusStyles: Record<StatusVariant, string> = {
  active:    'bg-[#ece9e6] text-[#000000] border-[#d4d0cc]',
  completed: 'bg-[#edf8f0] text-[#138637] border-[#c3e8cc]',
  delayed:   'bg-red-50 text-red-700 border-red-200',
  draft:     'bg-[#f6f5f4] text-[#615d59] border-[#e6e6e6]',
  on_hold:   'bg-amber-50 text-amber-700 border-amber-200',
  cancelled: 'bg-[#f6f5f4] text-[#a39e98] border-[#e6e6e6]',
  default:   'bg-[#f6f5f4] text-[#615d59] border-[#e6e6e6]',
};

const statusLabels: Record<string, string> = {
  active: 'Active', completed: 'Completed', delayed: 'Delayed',
  draft: 'Draft', on_hold: 'On Hold', cancelled: 'Cancelled',
  'at risk': 'At Risk', warning: 'Warning', healthy: 'Healthy',
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const key = status.toLowerCase().replace(/\s/g, '_') as StatusVariant;
  const styles = statusStyles[key] ?? statusStyles.default;
  const label = statusLabels[status.toLowerCase()] ?? status;

  return (
    <span
      className={cn(
        'inline-flex items-center',
        'px-[8px] py-[2px]',
        'text-[11px] font-[600] leading-[1.33] tracking-[0.125px] uppercase',
        'rounded-[5px] border',
        styles,
        className
      )}
    >
      {label}
    </span>
  );
}

// ── HealthDot — small colored status dot ──────────────────────────────────────
type HealthVariant = 'healthy' | 'warning' | 'at_risk' | 'default';

const healthDotStyles: Record<HealthVariant, string> = {
  healthy:  'bg-[#1aae39]',
  warning:  'bg-[#dd5b00]',
  at_risk:  'bg-[#f64932]',
  default:  'bg-[#a39e98]',
};

interface HealthDotProps {
  health: string;
  showLabel?: boolean;
  className?: string;
}

export function HealthDot({ health, showLabel = false, className }: HealthDotProps) {
  const key = health.toLowerCase().replace(/\s/g, '_') as HealthVariant;
  const dotStyle = healthDotStyles[key] ?? healthDotStyles.default;

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className={cn('w-2 h-2 rounded-full shrink-0', dotStyle)} />
      {showLabel && (
        <span className="text-[13px] text-[#615d59]">{health}</span>
      )}
    </span>
  );
}

// ── BadgePill — eyebrow/category pill ────────────────────────────────────────
interface BadgePillProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'muted' | 'success' | 'warning' | 'danger';
}

const pillVariants = {
  primary: 'bg-white text-[#000000] border border-[#e6e6e6]',
  muted:   'bg-[#f6f5f4] text-[#615d59] border border-[#e6e6e6]',
  success: 'bg-[#edf8f0] text-[#138637] border border-[#c3e8cc]',
  warning: 'bg-amber-50 text-amber-700 border border-amber-200',
  danger:  'bg-red-50 text-red-700 border border-red-200',
};

export function BadgePill({ children, className, variant = 'primary' }: BadgePillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1',
        'px-[8px] py-[4px]',
        'text-[12px] font-[600] leading-[1.33] tracking-[0.125px]',
        'rounded-[9999px]',
        pillVariants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

// ── ProgressBar ───────────────────────────────────────────────────────────────
interface ProgressBarProps {
  value: number; // 0–100
  className?: string;
  size?: 'xs' | 'sm' | 'md';
  variant?: 'default' | 'success' | 'danger';
}

const progressSizes = { xs: 'h-1', sm: 'h-1.5', md: 'h-2' };
const progressColors = {
  default: 'bg-black',
  success: 'bg-[#1aae39]',
  danger:  'bg-[#f64932]',
};

export function ProgressBar({ value, className, size = 'sm', variant = 'default' }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className={cn('w-full bg-[#e6e6e6] rounded-[9999px] overflow-hidden', progressSizes[size], className)}>
      <div
        className={cn('h-full rounded-[9999px] transition-all duration-[400ms]', progressColors[variant])}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
