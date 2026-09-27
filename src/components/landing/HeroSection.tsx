import React from "react";
import { Cpu, Terminal, Shield } from "lucide-react";
import { Badge } from "../ui/Badge";

export function HeroSection() {
  return (
    <div className="pt-12 pb-8 text-center space-y-4 max-w-3xl mx-auto px-4">
      {/* Engine Status Tag */}
      <div className="inline-flex items-center gap-2">
        <Badge variant="outline" size="sm" className="bg-slate-900/80 border-slate-800">
          <Terminal className="w-3 h-3 text-cyan-400" />
          <span>Deterministic Audit Engine</span>
        </Badge>
        <span className="text-slate-600 text-xs">•</span>
        <Badge variant="outline" size="sm" className="bg-slate-900/80 border-slate-800 text-slate-400">
          <Shield className="w-3 h-3 text-emerald-400" />
          <span>Local Ollama Ready</span>
        </Badge>
      </div>

      {/* Main Title */}
      <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-[1.15]">
        Rigorous Website Audits for <br className="hidden sm:inline" />
        <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 bg-clip-text text-transparent">
          Developers & Architects
        </span>
      </h1>

      {/* Subhead */}
      <p className="text-base sm:text-lg text-slate-400 font-normal leading-relaxed max-w-2xl mx-auto">
        Deep technical inspection across 6 vectors: SEO hierarchy, Core Web Vitals, WCAG 2.1 accessibility, content depth, mobile fidelity, and UX hygiene.
      </p>
    </div>
  );
}
