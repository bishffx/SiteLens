import React from "react";
import {
  Search,
  Zap,
  Eye,
  FileText,
  Smartphone,
  MousePointerClick,
  Check,
} from "lucide-react";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";

export function AnalysisCategories() {
  const dimensions = [
    {
      id: "performance",
      icon: Zap,
      weight: "25% Weight",
      title: "Performance & TTFB",
      summary: "Server latency, network payloads, script thread blocking, and CLS image dimensions.",
      checks: [
        "Time To First Byte (TTFB ≤ 800ms)",
        "HTML Document Payload Threshold (≤ 100KB)",
        "External Script Bloat (≤ 20 bundles)",
        "Image Aspect Ratio & Explicit Dimensions",
      ],
    },
    {
      id: "seo",
      icon: Search,
      weight: "20% Weight",
      title: "SEO Architecture",
      summary: "Title length bounds, canonical verification, H1-H6 hierarchy, Open Graph, and JSON-LD schema.",
      checks: [
        "Title Tag Presence (30–60 characters)",
        "Meta Description (120–160 characters)",
        "Canonical URL Integrity",
        "Single H1 Heading & Semantic Nesting",
      ],
    },
    {
      id: "accessibility",
      icon: Eye,
      weight: "20% Weight",
      title: "WCAG 2.1 Accessibility",
      summary: "Screen reader usability, non-text content alternatives, link text clarity, and label pairings.",
      checks: [
        "HTML 'lang' Attribute Declaration",
        "Image 'alt' Text Coverage",
        "Discernible Link Anchor Text",
        "Form Input & Explicit Label Association",
      ],
    },
    {
      id: "content",
      icon: FileText,
      weight: "15% Weight",
      title: "Content & Depth",
      summary: "Thin content detection, reading time metrics, and text-to-code markup ratios.",
      checks: [
        "Word Count Depth Thresholds (≥ 300 words)",
        "Text-to-HTML Markup Ratio (≥ 15%)",
        "Estimated Reading Time Calculation",
        "Boilerplate vs Body Content Balance",
      ],
    },
    {
      id: "mobile",
      icon: Smartphone,
      weight: "10% Weight",
      title: "Mobile Optimization",
      summary: "Viewport tag declarations, pinch-to-zoom accessibility, and responsive layout constraints.",
      checks: [
        "Viewport Meta Tag Tagging (width=device-width)",
        "Scalability Restrictions (no maximum-scale=1 locks)",
        "Touch Target Sizing Conformity",
        "Viewport Overflow & Horizontal Scroll Guard",
      ],
    },
    {
      id: "ux",
      icon: MousePointerClick,
      weight: "10% Weight",
      title: "UX Hygiene & Standards",
      summary: "Favicon presence, clear visual action paths, and avoidance of broken anchor anti-patterns.",
      checks: [
        "Valid Favicon Reference in Head",
        "Prominent Call-to-Action (CTA) Detection",
        "Elimination of 'javascript:void(0)' Anchors",
        "Navigation Flow & Landmark Consistency",
      ],
    },
  ];

  return (
    <section className="max-w-6xl mx-auto px-4 py-16 border-t border-slate-800/80">
      <div className="text-center space-y-2 mb-12">
        <h2 className="text-xs font-mono uppercase tracking-widest text-cyan-400">
          Inspection Dimensions
        </h2>
        <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Comprehensive Quality Verification
        </h3>
        <p className="text-sm text-slate-400 max-w-xl mx-auto">
          Every audited URL is evaluated simultaneously across 6 standardized dimensions with isolated scoring weights.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {dimensions.map((dim) => {
          const Icon = dim.icon;
          return (
            <Card key={dim.id} hoverEffect className="p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-cyan-400">
                    <Icon className="w-4 h-4" />
                  </div>
                  <Badge variant="outline" size="sm" className="font-mono">
                    {dim.weight}
                  </Badge>
                </div>

                <h4 className="text-base font-semibold text-slate-100">
                  {dim.title}
                </h4>
                <p className="text-xs text-slate-400 mt-1 mb-4 leading-relaxed">
                  {dim.summary}
                </p>

                <div className="space-y-2 pt-3 border-t border-slate-800/60">
                  {dim.checks.map((chk) => (
                    <div key={chk} className="flex items-start gap-2 text-[11px] text-slate-300">
                      <Check className="w-3.5 h-3.5 text-cyan-400 mt-0.5 shrink-0" />
                      <span>{chk}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
