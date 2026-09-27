import React from "react";
import { CheckCircle2, Loader2, Circle, AlertCircle } from "lucide-react";
import { Badge } from "./Badge";

export interface PipelineStage {
  id: string;
  name: string;
  description: string;
  status: "pending" | "running" | "completed" | "failed";
}

export interface LoadingPipelineProps {
  url: string;
  stages?: PipelineStage[];
  currentStageIndex?: number;
  onCancel?: () => void;
}

const DEFAULT_STAGES: PipelineStage[] = [
  {
    id: "validate",
    name: "URL Normalization & DNS Verification",
    description: "Validating RFC-compliant target address and protocol reachability.",
    status: "completed",
  },
  {
    id: "crawl",
    name: "Server-Side Headless Crawler",
    description: "Initializing browser session, executing scripts, and capturing DOM state.",
    status: "running",
  },
  {
    id: "analyze",
    name: "Parallel 6-Dimension Analysis",
    description: "Evaluating SEO hierarchy, accessibility rules, performance metrics, and mobile fit.",
    status: "pending",
  },
  {
    id: "score",
    name: "Deterministic Mathematical Scoring",
    description: "Applying penalty deduction formulas and computing overall composite grade.",
    status: "pending",
  },
  {
    id: "ai",
    name: "Local Ollama Interpretation",
    description: "Generating offline actionable recommendations via local neural engine.",
    status: "pending",
  },
];

export function LoadingPipeline({
  url,
  stages = DEFAULT_STAGES,
  onCancel,
}: LoadingPipelineProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="info">Engine Active</Badge>
            <span className="text-xs font-mono text-slate-400 truncate max-w-sm">
              {url}
            </span>
          </div>
          <h3 className="text-base font-semibold text-slate-100">
            Executing Audit Pipeline
          </h3>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-xs text-slate-400 hover:text-slate-200 transition px-2.5 py-1 rounded-md border border-slate-700/80 hover:bg-slate-800"
          >
            Cancel Pipeline
          </button>
        )}
      </div>

      <div className="space-y-4">
        {stages.map((stage, idx) => {
          return (
            <div
              key={stage.id}
              className={`flex items-start gap-3.5 p-3 rounded-xl border transition-all ${
                stage.status === "running"
                  ? "bg-cyan-950/20 border-cyan-800/60"
                  : stage.status === "completed"
                  ? "bg-slate-950/40 border-slate-800/80"
                  : "bg-slate-950/20 border-transparent opacity-60"
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {stage.status === "completed" && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                )}
                {stage.status === "running" && (
                  <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                )}
                {stage.status === "pending" && (
                  <Circle className="w-5 h-5 text-slate-600" />
                )}
                {stage.status === "failed" && (
                  <AlertCircle className="w-5 h-5 text-rose-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-200">
                    {stage.name}
                  </span>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
                    Step {idx + 1}/5
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  {stage.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500 font-mono">
        <span>Deterministic Pipeline Mode</span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          Processing on Node.js Server
        </span>
      </div>
    </div>
  );
}
