import React from "react";
import {
  ShieldCheck,
  Cpu,
  BarChart3,
  GitCompare,
  FileCode2,
  Workflow,
} from "lucide-react";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";

export function FeatureOverview() {
  const features = [
    {
      icon: BarChart3,
      badge: "Mathematical",
      title: "Deterministic Scoring",
      description:
        "Every score from 0 to 100 is computed mathematically via rule-based deductions. Zero hallucinated metrics or arbitrary grade assignments.",
    },
    {
      icon: Cpu,
      badge: "Zero-Telemetry",
      title: "Local Ollama Interpretation",
      description:
        "Target URLs and source structures stay on your local workstation. Run recommendations through local Llama 3 or Qwen without third-party API keys.",
    },
    {
      icon: Workflow,
      badge: "Parallel",
      title: "6-Dimension Engine",
      description:
        "Evaluates SEO tags, network TTFB/payloads, WCAG 2.1 accessibility, content depth, mobile scaling, and UX hygiene in a single run.",
    },
    {
      icon: GitCompare,
      badge: "Regressions",
      title: "Before & After Comparison",
      description:
        "Track score deltas (Δ score) across releases. Instantly spot newly introduced issues, persisting bottlenecks, and verified fixes.",
    },
    {
      icon: ShieldCheck,
      badge: "Standards-Based",
      title: "WCAG & Web Vitals Alignment",
      description:
        "Audits adhere directly to W3C recommendations, schema.org specifications, and Core Web Vitals thresholds.",
    },
    {
      icon: FileCode2,
      badge: "CI/CD Ready",
      title: "Structured JSON Artifacts",
      description:
        "All audit outcomes serialize into a standardized, predictable JSON schema suitable for automated regression gates.",
    },
  ];

  return (
    <section className="max-w-6xl mx-auto px-4 py-16">
      <div className="text-center space-y-2 mb-12">
        <h2 className="text-xs font-mono uppercase tracking-widest text-cyan-400">
          Engine Architecture
        </h2>
        <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Built for Technical Precision
        </h3>
        <p className="text-sm text-slate-400 max-w-xl mx-auto">
          SiteLens replaces generic marketing checkers with developer-first deterministic auditing.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {features.map((feat) => {
          const Icon = feat.icon;
          return (
            <Card key={feat.title} hoverEffect className="space-y-3 p-5">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-cyan-400 shadow-inner">
                  <Icon className="w-4 h-4" />
                </div>
                <Badge variant="outline" size="sm">
                  {feat.badge}
                </Badge>
              </div>

              <div>
                <h4 className="text-base font-semibold text-slate-100">
                  {feat.title}
                </h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {feat.description}
                </p>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
