import Link from 'next/link';
import { ArrowRight, BarChart3, Network, Workflow } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-blue-500/30">
      {/* Navigation */}
      <nav className="border-b border-slate-800/60 bg-slate-950/50 backdrop-blur-md fixed w-full top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="font-bold text-xl tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            CPM Planner
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link href="/signup" className="text-sm font-medium bg-white text-slate-950 px-4 py-2 rounded-full hover:bg-slate-200 transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-32 pb-16 px-6">
        <div className="max-w-7xl mx-auto text-center space-y-8 mt-16">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight">
            Master your project schedules with <span className="bg-gradient-to-r from-blue-500 to-violet-500 bg-clip-text text-transparent">Critical Path</span> logic.
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Stop guessing deadlines. Visually map dependencies, auto-calculate float, and instantly identify the exact tasks that dictate your delivery date.
          </p>
          
          <div className="flex items-center justify-center gap-4 pt-4">
            <Link href="/signup" className="flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-full font-semibold hover:bg-blue-500 transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_-10px_rgba(59,130,246,0.5)]">
              Start Planning Free
              <ArrowRight size={20} />
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 mt-32">
          <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-3xl hover:bg-slate-800/50 transition-colors">
            <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center mb-6">
              <Network size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3">Dependency Graphs</h3>
            <p className="text-slate-400 leading-relaxed">
              Build your network diagram visually. Link tasks with Finish-to-Start, Start-to-Start, and complex lag constraints instantly.
            </p>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-3xl hover:bg-slate-800/50 transition-colors">
            <div className="w-12 h-12 bg-violet-500/10 text-violet-400 rounded-2xl flex items-center justify-center mb-6">
              <Workflow size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3">Auto Calculation</h3>
            <p className="text-slate-400 leading-relaxed">
              Our powerful C++ engine computes Early Start, Late Finish, and Float times in milliseconds for massive task networks.
            </p>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-3xl hover:bg-slate-800/50 transition-colors">
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mb-6">
              <BarChart3 size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3">Dynamic Gantt</h3>
            <p className="text-slate-400 leading-relaxed">
              Watch your schedule update in real-time. Critical tasks are highlighted red so your team knows exactly what to focus on.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
