import { cn } from '@/lib/utils';

// ── Skeleton — animated loading placeholder ───────────────────────────────────
interface SkeletonProps {
  className?: string;
  height?: string | number;
  width?: string | number;
}

export function Skeleton({ className, height, width }: SkeletonProps) {
  return (
    <div
      className={cn('skeleton rounded-[4px]', className)}
      style={{ height, width }}
    />
  );
}

// ── SkeletonText — multi-line text placeholder ────────────────────────────────
interface SkeletonTextProps {
  lines?: number;
  className?: string;
  lastLineWidth?: string;
}

export function SkeletonText({ lines = 3, className, lastLineWidth = '60%' }: SkeletonTextProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={16}
          width={i === lines - 1 && lines > 1 ? lastLineWidth : '100%'}
        />
      ))}
    </div>
  );
}

// ── SkeletonCard — card placeholder ──────────────────────────────────────────
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('bg-white rounded-[12px] border border-[#e6e6e6] p-5 space-y-4', className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-[8px]" />
        <div className="flex-1 space-y-2">
          <Skeleton height={16} width="60%" />
          <Skeleton height={12} width="40%" />
        </div>
      </div>
      <SkeletonText lines={2} lastLineWidth="75%" />
      <div className="grid grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} height={40} />)}
      </div>
    </div>
  );
}

// ── SkeletonMetricCard — metric card placeholder ──────────────────────────────
export function SkeletonMetricCard({ className }: { className?: string }) {
  return (
    <div className={cn('bg-white rounded-[12px] border border-[#e6e6e6] p-5 space-y-3', className)}>
      <div className="flex items-center justify-between">
        <Skeleton height={12} width="40%" />
        <Skeleton className="w-8 h-8 rounded-[8px]" />
      </div>
      <Skeleton height={28} width="50%" />
    </div>
  );
}

// ── SkeletonTableRow — table row placeholder ──────────────────────────────────
export function SkeletonTableRow({ cols = 6 }: { cols?: number }) {
  return (
    <tr className="border-b border-[#e6e6e6]">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton height={14} width={i === 0 ? '80%' : i === 1 ? '50%' : '60%'} />
        </td>
      ))}
    </tr>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        'py-16 px-8',
        'rounded-[12px] border border-dashed border-[#e6e6e6]',
        'bg-white',
        className
      )}
    >
      {icon && (
        <div className="w-14 h-14 rounded-[12px] bg-[#f6f5f4] flex items-center justify-center mb-5 text-[#a39e98]">
          {icon}
        </div>
      )}
      <h3 className="text-[18px] font-[700] text-[#000000] leading-[1.27] tracking-[-0.25px] mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-[15px] text-[#615d59] leading-[1.5] max-w-sm mb-6">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
