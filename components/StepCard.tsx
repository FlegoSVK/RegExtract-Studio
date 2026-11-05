import React from 'react';
import { Check } from 'lucide-react';

interface StepCardProps {
  title: string;
  stepNumber: number;
  isActive: boolean;
  isCompleted: boolean;
  children: React.ReactNode;
}

export const StepCard: React.FC<StepCardProps> = ({ title, stepNumber, isActive, isCompleted, children }) => {
  return (
    <section className={`relative rounded-2xl border transition-all duration-300 overflow-hidden ${
      isActive 
        ? 'border-cyan-500/50 bg-[#0c1425] shadow-xl shadow-cyan-950/20 ring-1 ring-cyan-500/20' 
        : isCompleted 
          ? 'border-slate-800/80 bg-[#0a0f1d]/70' 
          : 'border-slate-800/40 bg-[#070b14]/50 opacity-60'
    }`}>
      {/* Step Header */}
      <div className={`px-6 py-4 border-b flex items-center justify-between ${
        isActive ? 'border-slate-800/90 bg-[#0e172a]/60' : 'border-slate-800/40 bg-[#090e1c]/40'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`flex items-center justify-center w-8 h-8 rounded-xl font-bold font-mono text-xs transition-colors border ${
            isActive 
              ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-sm shadow-cyan-500/30' 
              : isCompleted
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-800 text-slate-500 border-slate-700'
          }`}>
            {isCompleted ? <Check size={14} className="stroke-[2.5]" /> : stepNumber}
          </div>
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 block">
              Krok {stepNumber}
            </span>
            <h3 className={`text-base font-bold tracking-tight ${
              isActive ? 'text-white' : isCompleted ? 'text-slate-300' : 'text-slate-500'
            }`}>
              {title}
            </h3>
          </div>
        </div>

        {isCompleted && (
          <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
            <Check size={12} /> Hotovo
          </span>
        )}
      </div>

      {/* Step Body */}
      <div className={`p-6 ${isActive ? 'block' : 'hidden'}`}>
        {children}
      </div>
    </section>
  );
};
