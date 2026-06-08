import { cn } from '@/lib/utils';

// ── FeatureCard — white surface, hairline border, 12px radius ─────────────────
interface FeatureCardProps {
  children: React.ReactNode;
  className?: string;
  elevated?: boolean;
}

export function FeatureCard({ children, className, elevated = false }: FeatureCardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-[12px] border border-[#e6e6e6] p-6',
        elevated
          ? 'shadow-[rgba(0,0,0,0.01)_0_0.175px_1.041px,rgba(0,0,0,0.02)_0_0.8px_2.925px,rgba(0,0,0,0.027)_0_2.025px_7.847px,rgba(0,0,0,0.04)_0_4px_18px]'
          : '',
        className
      )}
    >
      {children}
    </div>
  );
}

// ── MetricCard — compact stats card ──────────────────────────────────────────
interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  subvalue?: React.ReactNode;
  icon?: React.ReactNode;
  accent?: 'default' | 'success' | 'warning' | 'danger' | 'primary';
  className?: string;
  loading?: boolean;
}

const accentMap = {
  default: { card: '', label: 'text-[#615d59]', value: 'text-[#000000]', icon: 'text-[#a39e98] bg-[#f6f5f4]' },
  success: { card: '', label: 'text-[#615d59]', value: 'text-[#000000]', icon: 'text-[#1aae39] bg-[#f0faf2]' },
  warning: { card: '', label: 'text-[#615d59]', value: 'text-[#000000]', icon: 'text-[#dd5b00] bg-[#fef3ea]' },
  danger:  { card: 'bg-red-50 border-red-100', label: 'text-red-600', value: 'text-red-700', icon: 'text-red-500 bg-red-100' },
  primary: { card: 'bg-[#ece9e6] border-[#d4d0cc]', label: 'text-[#000000]', value: 'text-[#000000]', icon: 'text-[#000000] bg-white' },
};

export function MetricCard({ label, value, subvalue, icon, accent = 'default', className, loading = false }: MetricCardProps) {
  const colors = accentMap[accent];

  return (
    <div className={cn('bg-white rounded-[12px] border border-[#e6e6e6] p-5 flex flex-col gap-3', colors.card, className)}>
      <div className="flex items-center justify-between gap-3">
        <p className={cn('text-[12px] font-[600] uppercase tracking-[0.125px] leading-[1.33]', colors.label)}>
          {label}
        </p>
        {icon && (
          <div className={cn('w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0 text-sm', colors.icon)}>
            {icon}
          </div>
        )}
      </div>

      {loading ? (
        <div className="h-8 w-24 skeleton rounded-[4px]" />
      ) : (
        <div className="flex items-baseline gap-2">
          <div className={cn('text-[28px] font-[700] leading-[1] tracking-[-0.5px]', colors.value)}>
            {value}
          </div>
          {subvalue && (
            <div className="text-[13px] text-[#a39e98] font-[400]">{subvalue}</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── SectionCard — panel with optional header ──────────────────────────────────
interface SectionCardProps {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  noPadding?: boolean;
}

export function SectionCard({ title, action, children, className, bodyClassName, noPadding = false }: SectionCardProps) {
  return (
    <div className={cn('bg-white rounded-[12px] border border-[#e6e6e6] overflow-hidden', className)}>
      {(title || action) && (
        <div className="px-5 py-4 border-b border-[#e6e6e6] flex items-center justify-between gap-4">
          {title && (
            <h2 className="text-[14px] font-[600] text-[#000000] leading-[1.43] tracking-[0]">
              {title}
            </h2>
          )}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={cn(!noPadding && 'p-5', bodyClassName)}>
        {children}
      </div>
    </div>
  );
}
