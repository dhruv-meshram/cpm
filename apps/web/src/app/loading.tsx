import { Activity } from 'lucide-react';

export default function GlobalLoading() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-slate-400">
        <Activity size={32} className="animate-pulse text-black" />
        <span className="text-sm font-medium">Loading application...</span>
      </div>
    </div>
  );
}
