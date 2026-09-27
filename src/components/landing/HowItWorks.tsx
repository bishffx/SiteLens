import React from "react";
import {
  Globe,
  Binary,
  Layers,
  Calculator,
  Cpu,
  FileCheck2,
} from "lucide-react";
import { Card } from "../ui/Card";

export function HowItWorks() {
  const steps = [
    {
      num: "01",
      icon: Globe,
      title: "URL Ingestion & Validation",
      desc: "Input address is normalized and verified via Zod schema checks ensuring proper protocol, host resolution, and security constraints.",
    },
    {
      num: "02",
      icon: Binary,
      title: "Server-Side Headless Crawl",
      desc: "Node server executes a headless browser instance to capture full DOM markup, network timings, script bundles, and visual snapshots.",
    },
    {
      num: "03",
      icon: Layers,
      title: "Parallel Dimension Evaluation",
      desc: "The crawled payload is piped through 6 isolated analyzers (SEO, Performance, A11y, Content, Mobile, UX) without inter-dependency.",
    },
    {
      num: "04",
      icon: Calculator,
      title: "Deterministic Point Deduction",
      desc: "Deficiencies subtract defined impact points from a base score of 100. Weights are mathematically combined into an objective grade.",
    },
    {
      num: "05",
      icon: Cpu,
      title: "Local Ollama Synthesis",
      desc: "Audit findings can be piped directly to a local Ollama model to generate structured, air-gapped code remediation steps.",
    },
    {
      num: "06",
      icon: FileCheck2,
      title: "Persistent Structured Report",
      desc: "Outcomes are serialized into standardized JSON, cataloged into history, and primed for before/after regression diffing.",
    },
  ];

  return (
    <section className="max-w-6xl mx-auto px-4 py-16 border-t border-slate-800/80">
      <div className="text-center space-y-2 mb-12">
        <h2 className="text-xs font-mono uppercase tracking-widest text-cyan-400">
          Auditing Pipeline
        </h2>
        <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          How SiteLens Operates
        </h3>
        <p className="text-sm text-slate-400 max-w-xl mx-auto">
          From target submission to structured reporting: transparent, reproducible execution at every phase.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {steps.map((st) => {
          const Icon = st.icon;
          return (
            <Card key={st.num} className="p-5 relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-2xl font-bold text-slate-700 select-none">
                  {st.num}
                </span>
                <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-cyan-400">
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <h4 className="text-base font-semibold text-slate-100">
                {st.title}
              </h4>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                {st.desc}
              </p>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
