import React from "react";
import { Shield, Cpu, Lock, Check } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-slate-800/80 bg-slate-950 py-10 mt-20 text-slate-400 text-xs">
      <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-md bg-slate-900 border border-slate-800 flex items-center justify-center font-mono text-[10px] text-cyan-400">
            SL
          </div>
          <div>
            <p className="text-slate-300 font-medium">SiteLens AI Audit Platform</p>
            <p className="text-slate-500 text-[11px]">
              Deterministic website quality, performance & SEO evaluation.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 font-mono text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>100% Local Inference</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-slate-400" />
            <span>Zero Remote Telemetry</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            <span>Open Architecture</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
