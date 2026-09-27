"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Globe,
  Search,
  Monitor,
  Smartphone,
  Sparkles,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Clock,
  RotateCcw,
  ExternalLink,
  Shield,
  Layers,
  FileText,
  Image as ImageIcon,
  Link2,
  Code2,
  Heading,
  Gauge,
  Zap,
  Activity,
  Eye,
} from "lucide-react";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import type { AnalysisJob } from "@/lib/types";
import { validateAndNormalizeUrl } from "@/lib/validation/url";

export function UrlAuditInput() {
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [deviceType, setDeviceType] = useState<"desktop" | "mobile">("desktop");
  const [requestAI, setRequestAI] = useState(true);
  const [showOptions, setShowOptions] = useState(false);
  const [showCrawlDetails, setShowCrawlDetails] = useState(false);
  const [activeAuditTab, setActiveAuditTab] = useState<
    "seo" | "performance" | "accessibility" | "content" | "mobile_ux" | "crawl" | "ai"
  >("seo");

  // Active Job State
  const [currentJob, setCurrentJob] = useState<AnalysisJob | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInterpretingAI, setIsInterpretingAI] = useState(false);

  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    "seo",
    "performance",
    "accessibility",
    "content",
    "mobile",
    "ux",
  ]);

  const inputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Keyboard shortcut: '/' to focus the URL input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        document.activeElement !== inputRef.current &&
        !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName || "")
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const validateInput = (value: string): boolean => {
    const res = validateAndNormalizeUrl(value);
    if (!res.isValid) {
      setUrlError(res.errorMessage || "Please enter a valid website address.");
      return false;
    }
    setUrlError(null);
    return true;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUrl(val);
    if (urlError) {
      validateInput(val);
    }
  };

  // Poll Job Status until completed or failed
  const startPollingJob = (jobId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/audit/jobs/${jobId}`);
        if (!res.ok) {
          if (pollingRef.current) clearInterval(pollingRef.current);
          return;
        }

        const data = (await res.json()) as { success: boolean; job: AnalysisJob };
        if (data.job) {
          setCurrentJob(data.job);

          if (data.job.status === "completed" || data.job.status === "failed") {
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
          }
        }
      } catch {
        // network retry on next tick
      }
    }, 800);
  };

  const handleAuditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInput(url)) return;

    setIsSubmitting(true);
    setCurrentJob(null);
    setShowCrawlDetails(false);

    try {
      const res = await fetch("/api/audit/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          deviceType,
          enabledCategories: selectedCategories,
          requestAI,
        }),
      });

      const data = (await res.json()) as { success: boolean; job: AnalysisJob; error?: string };

      if (!res.ok || !data.job) {
        setUrlError(data.error || "Failed to initialize audit job.");
        setIsSubmitting(false);
        return;
      }

      setCurrentJob(data.job);
      setIsSubmitting(false);

      if (data.job.status !== "completed" && data.job.status !== "failed") {
        startPollingJob(data.job.jobId);
      }
    } catch (err) {
      setIsSubmitting(false);
      setUrlError(
        err instanceof Error ? err.message : "Unable to contact audit server."
      );
    }
  };

  const resetAudit = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setCurrentJob(null);
    setUrlError(null);
    setShowCrawlDetails(false);
  };

  const handleRunAIInterpretation = async () => {
    if (!currentJob || currentJob.status !== "completed") return;
    setIsInterpretingAI(true);
    try {
      const res = await fetch(`/api/audit/jobs/${currentJob.jobId}/ai`, {
        method: "POST",
      });
      const data = (await res.json()) as { success: boolean; job?: AnalysisJob };
      if (data.job) {
        setCurrentJob(data.job);
      }
    } catch {
      // keep current state
    } finally {
      setIsInterpretingAI(false);
    }
  };

  const categories = [
    { id: "seo", label: "SEO Hierarchy" },
    { id: "performance", label: "Performance & TTFB" },
    { id: "accessibility", label: "Accessibility (a11y)" },
    { id: "content", label: "Content Quality" },
    { id: "mobile", label: "Mobile Optimization" },
    { id: "ux", label: "UX Standards" },
  ];

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const isJobActive = Boolean(
    currentJob &&
      currentJob.status !== "completed" &&
      currentJob.status !== "failed"
  );

  const crawl = currentJob?.crawlerResult;

  return (
    <div className="max-w-3xl mx-auto px-4 w-full">
      {/* Real Server-Side Job Progress / Status Display */}
      {currentJob && (
        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-2xl backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-slate-400">
                Job #{currentJob.jobId.slice(0, 14)}
              </span>
              <Badge
                variant={
                  currentJob.status === "completed"
                    ? "success"
                    : currentJob.status === "failed"
                    ? "error"
                    : "info"
                }
              >
                {currentJob.status}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              {currentJob.status === "completed" && (
                <a
                  href={`/reports/${currentJob.reportId || currentJob.jobId}`}
                  className="text-xs text-cyan-400 hover:text-cyan-300 transition flex items-center gap-1.5 px-3 py-1 rounded-md border border-cyan-800/80 bg-slate-900 font-medium"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Open in Full Dashboard</span>
                </a>
              )}

              <button
                onClick={resetAudit}
                className="text-xs text-slate-400 hover:text-slate-200 transition flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-700/80 hover:bg-slate-800"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Active Processing Indicator */}
          {isJobActive && (
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-cyan-400 animate-spin shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-slate-200">
                    {currentJob.currentStageMessage}
                  </p>
                  <p className="text-xs font-mono text-slate-500">
                    Target: {currentJob.normalizedUrl || currentJob.targetUrl}
                  </p>
                </div>
              </div>

              {/* Real Stages State Matrix */}
              <div className="grid grid-cols-3 gap-2 pt-2 text-[11px] font-mono text-slate-400">
                <div
                  className={`p-2 rounded border ${
                    currentJob.status === "validating"
                      ? "border-cyan-500 text-cyan-300 bg-cyan-950/20"
                      : "border-slate-800 text-slate-500"
                  }`}
                >
                  1. Validating
                </div>
                <div
                  className={`p-2 rounded border ${
                    currentJob.status === "crawling"
                      ? "border-cyan-500 text-cyan-300 bg-cyan-950/20"
                      : "border-slate-800 text-slate-500"
                  }`}
                >
                  2. Headless Crawling
                </div>
                <div
                  className={`p-2 rounded border ${
                    currentJob.status === "completed"
                      ? "border-cyan-500 text-cyan-300 bg-cyan-950/20"
                      : "border-slate-800 text-slate-500"
                  }`}
                >
                  3. Ingested
                </div>
              </div>
            </div>
          )}

          {/* Success State */}
          {currentJob.status === "completed" && (
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/50 space-y-4 text-emerald-300">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-emerald-200">
                      Single-Page Crawl Completed Successfully
                    </h4>
                    <p className="text-xs text-slate-400">
                      {currentJob.currentStageMessage}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowCrawlDetails(!showCrawlDetails)}
                  className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition px-2.5 py-1 rounded border border-cyan-800/60 bg-slate-900"
                >
                  <span>{showCrawlDetails ? "Hide Extraction" : "View Extracted Data"}</span>
                  {showCrawlDetails ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
              </div>

              {/* Core HTTP & Timing Metrics Grid */}
              {currentJob.targetMetadata && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-emerald-900/40 text-xs font-mono">
                  <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">HTTP Status</span>
                    <span className="text-slate-200 font-bold">
                      {currentJob.targetMetadata.statusCode} {currentJob.targetMetadata.statusText}
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Load Duration</span>
                    <span className="text-slate-200 font-bold">
                      {currentJob.targetMetadata.responseTimeMs}ms
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">HTML Payload</span>
                    <span className="text-slate-200 font-bold">
                      {Math.round(currentJob.targetMetadata.contentLengthBytes / 1024)} KB
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Security</span>
                    <span className="text-slate-200 font-bold">
                      {currentJob.targetMetadata.isHttps ? "HTTPS TLS" : "Plain HTTP"}
                    </span>
                  </div>
                </div>
              )}

              {/* Deterministic Quality Scorecard */}
              {currentJob.scoreResult && (
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-900 border border-cyan-800/80 flex items-center justify-center font-bold text-lg text-cyan-300 font-mono shadow-inner">
                        {currentJob.scoreResult.overallScore}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-100 text-sm">
                            Deterministic Quality Score
                          </span>
                          <Badge
                            variant={
                              currentJob.scoreResult.overallGrade === "A+" ||
                              currentJob.scoreResult.overallGrade === "A"
                                ? "success"
                                : currentJob.scoreResult.overallGrade === "B"
                                ? "info"
                                : currentJob.scoreResult.overallGrade === "C"
                                ? "warning"
                                : "error"
                            }
                            size="sm"
                          >
                            Grade {currentJob.scoreResult.overallGrade}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Reproducible mathematical score derived from real DOM & network signals.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="text-emerald-400 font-bold">
                        {currentJob.scoreResult.summary.passedChecks} Pass
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="text-amber-400 font-bold">
                        {currentJob.scoreResult.summary.warningChecks} Warning
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="text-rose-400 font-bold">
                        {currentJob.scoreResult.summary.failedChecks} Fail
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="text-slate-400">
                        {currentJob.scoreResult.summary.unavailableChecks} N/A
                      </span>
                    </div>
                  </div>

                  {/* 6 Category Dimension Scores Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-2 border-t border-slate-800/80 font-mono text-center">
                    {(
                      [
                        { key: "seo", label: "SEO", data: currentJob.scoreResult.categories.seo },
                        { key: "performance", label: "Performance", data: currentJob.scoreResult.categories.performance },
                        { key: "accessibility", label: "Accessibility", data: currentJob.scoreResult.categories.accessibility },
                        { key: "content", label: "Content", data: currentJob.scoreResult.categories.content },
                        { key: "mobile", label: "Mobile", data: currentJob.scoreResult.categories.mobile },
                        { key: "ux", label: "UX", data: currentJob.scoreResult.categories.ux },
                      ] as const
                    ).map(({ key, label, data }) => (
                      <div key={key} className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                        <span className="text-slate-500 text-[10px] block uppercase">{label}</span>
                        <div className="flex items-center justify-center gap-1.5 my-0.5">
                          <span className="font-bold text-slate-200 text-sm">{data.score}</span>
                          <span className={`text-[10px] font-bold ${
                            data.grade === "A+" || data.grade === "A"
                              ? "text-emerald-400"
                              : data.grade === "B"
                              ? "text-cyan-400"
                              : data.grade === "C"
                              ? "text-amber-400"
                              : "text-rose-400"
                          }`}>
                            {data.grade}
                          </span>
                        </div>
                        <span className="text-[9px] text-slate-500 block truncate">
                          {data.passedChecks} pass / {data.evaluableChecks} eval
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Page Identity Summary */}
              <div className="space-y-1 text-xs text-slate-300">
                <div>
                  <span className="text-slate-500 font-mono">Page Title: </span>
                  <span className="font-medium text-slate-100 italic">
                    {crawl?.pageTitle ? `"${crawl.pageTitle}"` : "(No <title> tag found)"}
                  </span>
                </div>
                {crawl?.metaDescription && (
                  <div>
                    <span className="text-slate-500 font-mono">Meta Description: </span>
                    <span className="text-slate-300">
                      "{crawl.metaDescription}"
                    </span>
                  </div>
                )}
                {crawl?.canonicalUrl && (
                  <div>
                    <span className="text-slate-500 font-mono">Canonical: </span>
                    <span className="font-mono text-cyan-400">
                      {crawl.canonicalUrl}
                    </span>
                  </div>
                )}
              </div>

              {/* Expandable Deep Extraction Inspection Panel */}
              {showCrawlDetails && crawl && (
                <div className="space-y-4 pt-3 border-t border-slate-800 text-xs">
                  {/* Category Sub-Tabs */}
                  <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => setActiveAuditTab("seo")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                        activeAuditTab === "seo"
                          ? "bg-slate-800 text-cyan-300 shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>SEO Rules ({currentJob.seoReport?.checks.length || 0})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveAuditTab("performance")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                        activeAuditTab === "performance"
                          ? "bg-slate-800 text-cyan-300 shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Gauge className="w-3.5 h-3.5" />
                      <span>Performance ({currentJob.performanceReport?.issues.length ?? 0} issues)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveAuditTab("accessibility")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                        activeAuditTab === "accessibility"
                          ? "bg-slate-800 text-cyan-300 shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Accessibility ({currentJob.accessibilityReport?.summary.totalFindings ?? 0})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveAuditTab("content")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                        activeAuditTab === "content"
                          ? "bg-slate-800 text-cyan-300 shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Content ({currentJob.contentReport?.checks.length || 0})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveAuditTab("mobile_ux")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                        activeAuditTab === "mobile_ux"
                          ? "bg-slate-800 text-cyan-300 shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Mobile & UX ({currentJob.mobileUxReport?.findings.length || 0})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveAuditTab("crawl")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                        activeAuditTab === "crawl"
                          ? "bg-slate-800 text-cyan-300 shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Crawl Data</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveAuditTab("ai")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                        activeAuditTab === "ai"
                          ? "bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 shadow-sm"
                          : "text-slate-400 hover:text-indigo-300"
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span>
                        AI Interpretation
                        {currentJob.aiReport?.isAvailable
                          ? " (Ready)"
                          : currentJob.aiReport?.status === "unavailable"
                          ? " (Offline)"
                          : ""}
                      </span>
                    </button>
                  </div>

                  {/* Tab 1: SEO Report */}
                  {activeAuditTab === "seo" && currentJob.seoReport && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-200">
                            SEO Rule Verification:
                          </span>
                          <Badge
                            variant={
                              currentJob.seoReport.isIndexable
                                ? "success"
                                : "warning"
                            }
                          >
                            {currentJob.seoReport.isIndexable
                              ? "Indexable"
                              : "Index Blocked"}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          <span className="text-emerald-400 font-bold">
                            {currentJob.seoReport.summary.passedCount} Pass
                          </span>
                          <span className="text-slate-600">•</span>
                          <span className="text-amber-400 font-bold">
                            {currentJob.seoReport.summary.warningCount} Warning
                          </span>
                          <span className="text-slate-600">•</span>
                          <span className="text-rose-400 font-bold">
                            {currentJob.seoReport.summary.failedCount} Fail
                          </span>
                          <span className="text-slate-600">•</span>
                          <span className="text-slate-400">
                            {currentJob.seoReport.summary.notCheckedCount} N/A
                          </span>
                        </div>
                      </div>

                      {/* Individual SEO Checks List */}
                      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                        {currentJob.seoReport.checks.map((chk) => (
                          <div
                            key={chk.checkId}
                            className={`p-3 rounded-xl border transition ${
                              chk.status === "pass"
                                ? "bg-slate-950/40 border-slate-800/80"
                                : chk.status === "fail"
                                ? "bg-rose-950/20 border-rose-800/40"
                                : chk.status === "warning"
                                ? "bg-amber-950/20 border-amber-800/40"
                                : "bg-slate-950/20 border-slate-800/40 text-slate-500"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="font-semibold text-slate-200">
                                {chk.name}
                              </span>
                              <Badge
                                variant={
                                  chk.status === "pass"
                                    ? "success"
                                    : chk.status === "fail"
                                    ? "error"
                                    : chk.status === "warning"
                                    ? "warning"
                                    : "outline"
                                }
                              >
                                {chk.status.replace("_", " ")}
                              </Badge>
                            </div>

                            <p className="text-slate-400 leading-relaxed">
                              {chk.explanation}
                            </p>

                            {chk.evidence && (
                              <div className="mt-1.5 p-2 rounded bg-slate-900 border border-slate-800/80 font-mono text-[11px] text-slate-300 overflow-x-auto">
                                <span className="text-slate-500">Evidence: </span>
                                {typeof chk.evidence === "string"
                                  ? chk.evidence
                                  : JSON.stringify(chk.evidence)}
                              </div>
                            )}

                            {chk.recommendation && (
                              <div className="mt-1.5 text-[11px] text-cyan-300 font-medium">
                                Recommendation: {chk.recommendation}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tab 2: Performance Report */}
                  {activeAuditTab === "performance" && currentJob.performanceReport && (
                    <div className="space-y-4">
                      {/* Engine Header & Summary */}
                      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                        <div className="flex items-center gap-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-200">Lighthouse Engine:</span>
                            <Badge
                              variant={
                                currentJob.performanceReport.lighthouse.isAvailable
                                  ? "success"
                                  : "warning"
                              }
                            >
                              {currentJob.performanceReport.lighthouse.isAvailable
                                ? `v${currentJob.performanceReport.lighthouse.version || "13"}`
                                : "Unavailable"}
                            </Badge>
                          </div>

                          {currentJob.performanceReport.lighthouse.performanceScore !== null ? (
                            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
                              <span className="text-slate-400">Score:</span>
                              <span
                                className={`font-mono font-bold text-sm ${
                                  currentJob.performanceReport.lighthouse.performanceScore >= 90
                                    ? "text-emerald-400"
                                    : currentJob.performanceReport.lighthouse.performanceScore >= 50
                                    ? "text-amber-400"
                                    : "text-rose-400"
                                }`}
                              >
                                {currentJob.performanceReport.lighthouse.performanceScore}/100
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-[11px] pl-2 border-l border-slate-800">
                              Score Unavailable
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          <span className="text-rose-400 font-bold">
                            {currentJob.performanceReport.summary.criticalCount} Critical
                          </span>
                          <span className="text-slate-600">•</span>
                          <span className="text-amber-400 font-bold">
                            {currentJob.performanceReport.summary.warningCount} Warning
                          </span>
                          <span className="text-slate-600">•</span>
                          <span className="text-cyan-400">
                            {currentJob.performanceReport.summary.infoCount} Info
                          </span>
                        </div>
                      </div>

                      {/* Real Performance Metrics Grid */}
                      <div>
                        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                          Core Real Timing & Vitals Measurements
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {Object.entries(currentJob.performanceReport.metrics).map(
                            ([key, m]) => (
                              <div
                                key={key}
                                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1"
                              >
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="text-slate-400 truncate font-medium">
                                    {m.name.split(" ")[0]}
                                  </span>
                                  <Badge
                                    variant={
                                      m.status === "good"
                                        ? "success"
                                        : m.status === "poor"
                                        ? "error"
                                        : m.status === "needs-improvement"
                                        ? "warning"
                                        : "outline"
                                    }
                                    size="sm"
                                  >
                                    {m.status === "needs-improvement" ? "Improve" : m.status}
                                  </Badge>
                                </div>
                                <div className="font-mono text-sm font-bold text-slate-100">
                                  {m.available && m.displayValue !== null
                                    ? m.displayValue
                                    : "Unavailable"}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>

                      {/* Resource Breakdown Card */}
                      <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          Resource & Payload Measurements
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                          <div>
                            <span className="text-slate-500 block">Total Weight:</span>
                            <span className="text-slate-200 font-bold">
                              {currentJob.performanceReport.resources.totalSizeBytes !== null
                                ? `${(
                                    currentJob.performanceReport.resources.totalSizeBytes / 1024
                                  ).toFixed(1)} kB`
                                : "Unavailable"}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">HTML Size:</span>
                            <span className="text-slate-200 font-bold">
                              {currentJob.performanceReport.resources.htmlSizeBytes !== null
                                ? `${(
                                    currentJob.performanceReport.resources.htmlSizeBytes / 1024
                                  ).toFixed(1)} kB`
                                : "Unavailable"}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Scripts:</span>
                            <span className="text-slate-200 font-bold">
                              {currentJob.performanceReport.resources.totalScripts} (
                              {currentJob.performanceReport.resources.renderBlockingScripts} blocking)
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Stylesheets:</span>
                            <span className="text-slate-200 font-bold">
                              {currentJob.performanceReport.resources.totalStylesheets} (
                              {currentJob.performanceReport.resources.renderBlockingStylesheets} blocking)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Performance Issues List */}
                      {currentJob.performanceReport.issues.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            Identified Performance Issues ({currentJob.performanceReport.issues.length})
                          </h4>
                          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                            {currentJob.performanceReport.issues.map((issue) => (
                              <div
                                key={issue.id}
                                className={`p-3 rounded-xl border transition ${
                                  issue.severity === "critical"
                                    ? "bg-rose-950/20 border-rose-800/40"
                                    : issue.severity === "warning"
                                    ? "bg-amber-950/20 border-amber-800/40"
                                    : "bg-slate-950/30 border-slate-800/60"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <span className="font-semibold text-slate-200">
                                    {issue.id.replace("perf_", "").replace(/_/g, " ").toUpperCase()}
                                  </span>
                                  <Badge
                                    variant={
                                      issue.severity === "critical"
                                        ? "error"
                                        : issue.severity === "warning"
                                        ? "warning"
                                        : "outline"
                                    }
                                  >
                                    {issue.severity}
                                  </Badge>
                                </div>
                                <div className="font-mono text-[11px] text-cyan-400 mb-1">
                                  {issue.metric}
                                </div>
                                <p className="text-slate-400 leading-relaxed mb-1.5">
                                  {issue.explanation}
                                </p>
                                <div className="text-[11px] text-emerald-300 font-medium">
                                  Recommendation: {issue.recommendation}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab 3: Accessibility Report */}
                  {activeAuditTab === "accessibility" && currentJob.accessibilityReport && (
                    <div className="space-y-4">
                      {/* Engine Header & Summary */}
                      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                        <div className="flex items-center gap-2.5">
                          <span className="font-semibold text-slate-200">Engine:</span>
                          <Badge variant="outline">
                            {currentJob.accessibilityReport.engine.name}{" "}
                            {currentJob.accessibilityReport.engine.version}
                          </Badge>
                          <span className="text-slate-600">•</span>
                          <span className="text-emerald-400 font-mono text-[11px] font-bold">
                            {currentJob.accessibilityReport.summary.passedRulesCount} Rules Passed
                          </span>
                        </div>

                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          <span className="text-indigo-400 font-bold">
                            {currentJob.accessibilityReport.summary.automaticallyDetectableCount} Detectable
                          </span>
                          <span className="text-slate-600">•</span>
                          <span className="text-amber-400 font-bold">
                            {currentJob.accessibilityReport.summary.requiresManualReviewCount} Manual Review
                          </span>
                        </div>
                      </div>

                      {/* Explicit WCAG Compliance Disclaimer */}
                      <div className="p-3 rounded-xl bg-slate-950 border border-amber-900/40 text-amber-300/90 text-[11px] leading-relaxed flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-amber-200 block mb-0.5">Automated Testing Scope Notice</strong>
                          {currentJob.accessibilityReport.wcagDisclaimer}
                        </div>
                      </div>

                      {/* Findings List */}
                      {currentJob.accessibilityReport.findings.length > 0 ? (
                        <div className="space-y-2">
                          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            Accessibility Findings ({currentJob.accessibilityReport.findings.length})
                          </h4>
                          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                            {currentJob.accessibilityReport.findings.map((f) => (
                              <div
                                key={f.id}
                                className={`p-3 rounded-xl border transition ${
                                  f.type === "requires_manual_review"
                                    ? "bg-amber-950/15 border-amber-800/40"
                                    : f.severity === "critical"
                                    ? "bg-rose-950/20 border-rose-800/40"
                                    : f.severity === "warning"
                                    ? "bg-amber-950/15 border-amber-800/30"
                                    : "bg-slate-950/30 border-slate-800/60"
                                }`}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-slate-200">
                                      {f.title}
                                    </span>
                                    <Badge
                                      variant={
                                        f.type === "automatically_detectable"
                                          ? "info"
                                          : "warning"
                                      }
                                      size="sm"
                                    >
                                      {f.type === "automatically_detectable"
                                        ? "Automatically Detectable"
                                        : "Requires Manual Review"}
                                    </Badge>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <Badge
                                      variant={
                                        f.severity === "critical"
                                          ? "error"
                                          : f.severity === "warning"
                                          ? "warning"
                                          : "outline"
                                      }
                                      size="sm"
                                    >
                                      {f.severity}
                                    </Badge>
                                    <span className="font-mono text-[10px] text-slate-500">
                                      {f.engineRuleId}
                                    </span>
                                  </div>
                                </div>

                                <p className="text-slate-400 leading-relaxed mb-2">
                                  {f.explanation}
                                </p>

                                {/* Concrete Evidence Box */}
                                {f.evidence && f.evidence.affectedElementsCount > 0 && (
                                  <div className="p-2 rounded bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1 my-1.5">
                                    <div className="text-slate-500 text-[10px]">
                                      Affected Elements ({f.evidence.affectedElementsCount}):
                                    </div>
                                    {f.evidence.sampleSelectors.map((sel, idx) => (
                                      <div key={idx} className="text-cyan-300 truncate">
                                        Target: {sel}
                                      </div>
                                    ))}
                                    {f.evidence.sampleSnippets.length > 0 && (
                                      <pre className="text-slate-400 text-[10px] overflow-x-auto whitespace-pre-wrap mt-1">
                                        {f.evidence.sampleSnippets[0]}
                                      </pre>
                                    )}
                                  </div>
                                )}

                                <div className="text-[11px] text-emerald-300 font-medium mt-1">
                                  Recommendation: {f.recommendation}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-slate-400">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
                          <p className="font-medium text-slate-200">No automated accessibility violations detected</p>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Manual assistive testing is still recommended to verify keyboard focus and screen reader experience.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab: Content & Readability Audit */}
                  {activeAuditTab === "content" && currentJob.contentReport && (
                    <div className="space-y-4">
                      {/* Content Header & Summary Counts */}
                      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-cyan-400" />
                          <span className="font-semibold text-slate-200 text-xs">
                            Content & Lexical Analysis
                          </span>
                        </div>

                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          <span className="text-emerald-400 font-bold">
                            {currentJob.contentReport.summary.passedCount} Pass
                          </span>
                          <span className="text-slate-600">•</span>
                          <span className="text-amber-400 font-bold">
                            {currentJob.contentReport.summary.warningCount} Warning
                          </span>
                          <span className="text-slate-600">•</span>
                          <span className="text-rose-400 font-bold">
                            {currentJob.contentReport.summary.failedCount} Fail
                          </span>
                          <span className="text-slate-600">•</span>
                          <span className="text-slate-400">
                            {currentJob.contentReport.summary.notCheckedCount} N/A
                          </span>
                        </div>
                      </div>

                      {/* Content Key Metrics Overview */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                          <span className="text-slate-500 text-[10px] block">Word Count</span>
                          <span className="text-slate-100 font-bold text-sm">
                            {currentJob.contentReport.metrics.wordCount.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            ~{currentJob.contentReport.metrics.readingTimeMinutes} min read
                          </span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                          <span className="text-slate-500 text-[10px] block">Text-to-HTML</span>
                          <span className="text-slate-100 font-bold text-sm">
                            {currentJob.contentReport.metrics.textToHtmlRatioPercent}%
                          </span>
                          <span className="text-[10px] text-slate-500 block">content ratio</span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                          <span className="text-slate-500 text-[10px] block">Flesch Reading Ease</span>
                          <span className="text-slate-100 font-bold text-sm">
                            {currentJob.contentReport.metrics.readability?.fleschReadingEase !== null &&
                            currentJob.contentReport.metrics.readability?.fleschReadingEase !== undefined
                              ? `${currentJob.contentReport.metrics.readability.fleschReadingEase} / 100`
                              : "N/A"}
                          </span>
                          <span className="text-[10px] text-slate-500 block truncate">
                            {currentJob.contentReport.metrics.readability?.fleschKincaidGradeLevel !== null &&
                            currentJob.contentReport.metrics.readability?.fleschKincaidGradeLevel !== undefined
                              ? `Grade ${currentJob.contentReport.metrics.readability.fleschKincaidGradeLevel}`
                              : "Non-English / short"}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                          <span className="text-slate-500 text-[10px] block">Action Signals</span>
                          <span className="text-slate-100 font-bold text-sm">
                            {currentJob.contentReport.metrics.callToActionSummary.detectedCtaCount} CTAs
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            {currentJob.contentReport.metrics.paragraphCount} paragraphs
                          </span>
                        </div>
                      </div>

                      {/* Explicit Content Analysis Disclaimer */}
                      <div className="p-3 rounded-lg bg-slate-950/90 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2.5">
                        <Shield className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-slate-300 block mb-0.5">
                            Deterministic Lexical Scope
                          </span>
                          <p className="leading-relaxed">
                            {currentJob.contentReport.disclaimer}
                          </p>
                        </div>
                      </div>

                      {/* Content Checks List */}
                      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                        {currentJob.contentReport.checks.map((chk) => (
                          <div
                            key={chk.checkId}
                            className={`p-3 rounded-xl border transition ${
                              chk.status === "pass"
                                ? "bg-slate-950/40 border-slate-800/80"
                                : chk.status === "fail"
                                ? "bg-rose-950/20 border-rose-800/40"
                                : chk.status === "warning"
                                ? "bg-amber-950/20 border-amber-800/40"
                                : "bg-slate-950/20 border-slate-800/40"
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-200">
                                  {chk.name}
                                </span>
                                <Badge
                                  variant={
                                    chk.status === "pass"
                                      ? "success"
                                      : chk.status === "warning"
                                      ? "warning"
                                      : chk.status === "fail"
                                      ? "error"
                                      : "outline"
                                  }
                                  size="sm"
                                >
                                  {chk.status}
                                </Badge>
                              </div>

                              {chk.severity !== "none" && (
                                <Badge
                                  variant={
                                    chk.severity === "critical"
                                      ? "error"
                                      : chk.severity === "warning"
                                      ? "warning"
                                      : "info"
                                  }
                                  size="sm"
                                >
                                  {chk.severity}
                                </Badge>
                              )}
                            </div>

                            <p className="text-slate-300 text-xs leading-relaxed mb-2">
                              {chk.explanation}
                            </p>

                            {/* Structured Evidence Preview */}
                            {chk.evidence && (
                              <div className="mb-2 p-2 rounded bg-slate-950 border border-slate-800/70 font-mono text-[11px] text-slate-400">
                                <div className="text-slate-500 text-[10px] mb-1 font-semibold uppercase">
                                  Observable Evidence:
                                </div>
                                <pre className="whitespace-pre-wrap overflow-x-auto text-[10px] text-slate-300">
                                  {JSON.stringify(chk.evidence, null, 2)}
                                </pre>
                              </div>
                            )}

                            {chk.recommendation && (
                              <div className="text-[11px] text-emerald-400 font-medium">
                                Recommendation: {chk.recommendation}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tab: Mobile & UX Analysis */}
                  {activeAuditTab === "mobile_ux" && currentJob.mobileUxReport && (
                    <div className="space-y-4">
                      {/* Mobile & UX Header */}
                      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                        <div className="flex items-center gap-2">
                          <Smartphone className="w-4 h-4 text-cyan-400" />
                          <span className="font-semibold text-slate-200 text-xs">
                            Mobile & UX Evaluation
                          </span>
                          <Badge variant="outline" size="sm">
                            {currentJob.mobileUxReport.engine.name}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          <span className="text-cyan-400 font-bold">
                            {currentJob.mobileUxReport.summary.measuredCount} Measured
                          </span>
                          <span className="text-slate-600">•</span>
                          <span className="text-slate-300 font-bold">
                            {currentJob.mobileUxReport.summary.heuristicCount} Heuristic
                          </span>
                          <span className="text-slate-600">•</span>
                          <span className="text-amber-400 font-bold">
                            {currentJob.mobileUxReport.summary.manualReviewCount} Manual Review
                          </span>
                        </div>
                      </div>

                      {/* Key Metrics Overview */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                          <span className="text-slate-500 text-[10px] block">Viewport Config</span>
                          <span className="text-slate-100 font-bold text-sm">
                            {currentJob.mobileUxReport.metrics.viewportConfigured ? "Responsive" : "Missing"}
                          </span>
                          <span className="text-[10px] text-slate-500 block truncate">
                            {currentJob.mobileUxReport.metrics.userScalableDisabled ? "Zoom restricted" : "Zoom enabled"}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                          <span className="text-slate-500 text-[10px] block">Horizontal Overflow</span>
                          <span className={`font-bold text-sm ${currentJob.mobileUxReport.metrics.hasHorizontalOverflow ? "text-rose-400" : "text-emerald-400"}`}>
                            {currentJob.mobileUxReport.metrics.hasHorizontalOverflow ? `+${currentJob.mobileUxReport.metrics.horizontalOverflowPx}px` : "None (0px)"}
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            {currentJob.mobileUxReport.metrics.mobileScrollWidth ? `${currentJob.mobileUxReport.metrics.mobileScrollWidth}px / 375px` : "375px mobile"}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                          <span className="text-slate-500 text-[10px] block">Tap Targets</span>
                          <span className="text-slate-100 font-bold text-sm">
                            {currentJob.mobileUxReport.metrics.tapTargetsEvaluated} evaluated
                          </span>
                          <span className={`text-[10px] block ${currentJob.mobileUxReport.metrics.undersizedTapTargetsCount > 0 ? "text-amber-400" : "text-slate-500"}`}>
                            {currentJob.mobileUxReport.metrics.undersizedTapTargetsCount} undersized
                          </span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                          <span className="text-slate-500 text-[10px] block">Font Legibility</span>
                          <span className="text-slate-100 font-bold text-sm">
                            {currentJob.mobileUxReport.metrics.minimumComputedFontSizePx !== null ? `${currentJob.mobileUxReport.metrics.minimumComputedFontSizePx}px min` : "Standard"}
                          </span>
                          <span className={`text-[10px] block ${currentJob.mobileUxReport.metrics.smallFontElementsCount > 0 ? "text-amber-400" : "text-slate-500"}`}>
                            {currentJob.mobileUxReport.metrics.smallFontElementsCount} below 12px
                          </span>
                        </div>
                      </div>

                      {/* Explicit Scope Disclaimer */}
                      <div className="p-3 rounded-lg bg-slate-950/90 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2.5">
                        <Shield className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-slate-300 block mb-0.5">
                            Multi-Viewport Evaluation Scope
                          </span>
                          <p className="leading-relaxed">
                            {currentJob.mobileUxReport.disclaimer}
                          </p>
                        </div>
                      </div>

                      {/* Findings List */}
                      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                        {currentJob.mobileUxReport.findings.map((f) => (
                          <div
                            key={f.id}
                            className={`p-3 rounded-xl border transition ${
                              f.status === "pass"
                                ? "bg-slate-950/40 border-slate-800/80"
                                : f.status === "fail"
                                ? "bg-rose-950/20 border-rose-800/40"
                                : f.status === "warning"
                                ? "bg-amber-950/20 border-amber-800/40"
                                : "bg-slate-950/20 border-slate-800/40"
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-200">
                                  {f.title}
                                </span>
                                <Badge
                                  variant={
                                    f.type === "measured"
                                      ? "info"
                                      : f.type === "heuristic"
                                      ? "default"
                                      : "warning"
                                  }
                                  size="sm"
                                >
                                  {f.type === "measured" ? "Measured" : f.type === "heuristic" ? "Heuristic" : "Manual Review"}
                                </Badge>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <Badge
                                  variant={
                                    f.status === "pass"
                                      ? "success"
                                      : f.status === "warning"
                                      ? "warning"
                                      : f.status === "fail"
                                      ? "error"
                                      : "outline"
                                  }
                                  size="sm"
                                >
                                  {f.status}
                                </Badge>
                                {f.severity !== "none" && (
                                  <Badge
                                    variant={
                                      f.severity === "critical"
                                        ? "error"
                                        : f.severity === "warning"
                                        ? "warning"
                                        : "info"
                                    }
                                    size="sm"
                                  >
                                    {f.severity}
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <p className="text-slate-300 text-xs leading-relaxed mb-2">
                              {f.explanation}
                            </p>

                            {/* Structured Evidence Preview */}
                            {f.evidence && (
                              <div className="mb-2 p-2 rounded bg-slate-950 border border-slate-800/70 font-mono text-[11px] text-slate-400">
                                <div className="text-slate-500 text-[10px] mb-1 font-semibold uppercase">
                                  Measurement Evidence:
                                </div>
                                <pre className="whitespace-pre-wrap overflow-x-auto text-[10px] text-slate-300">
                                  {JSON.stringify(f.evidence, null, 2)}
                                </pre>
                              </div>
                            )}

                            {f.recommendation && (
                              <div className="text-[11px] text-emerald-400 font-medium">
                                Recommendation: {f.recommendation}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tab 4: Core Crawl Hierarchy & Headings Preview */}
                  {activeAuditTab === "crawl" && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                      <div className="p-2 rounded bg-slate-950 border border-slate-800">
                        <span className="text-slate-500 text-[10px] block">H1 Headings</span>
                        <span className="text-slate-200 font-bold">
                          {crawl.headings.h1.length}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-slate-950 border border-slate-800">
                        <span className="text-slate-500 text-[10px] block">Links</span>
                        <span className="text-slate-200 font-bold">
                          {crawl.links.length} total
                        </span>
                      </div>
                      <div className="p-2 rounded bg-slate-950 border border-slate-800">
                        <span className="text-slate-500 text-[10px] block">Images</span>
                        <span className="text-slate-200 font-bold">
                          {crawl.images.length} ({crawl.images.filter((i) => !i.alt).length} missing alt)
                        </span>
                      </div>
                      <div className="p-2 rounded bg-slate-950 border border-slate-800">
                        <span className="text-slate-500 text-[10px] block">Structured Data</span>
                        <span className="text-slate-200 font-bold">
                          {crawl.structuredData.length} JSON-LD
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Tab 7: AI Interpretation (Local Ollama) */}
                  {activeAuditTab === "ai" && (
                    <div className="space-y-4">
                      {/* Case 1: AI interpretation available & validated */}
                      {currentJob.aiReport?.isAvailable && currentJob.aiReport.data ? (
                        <div className="space-y-4">
                          {/* Header Metadata Banner */}
                          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-indigo-950/40 border border-indigo-900/60 text-xs">
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-indigo-400" />
                              <span className="font-semibold text-indigo-200">
                                Local AI Interpretation
                              </span>
                              <Badge
                                variant="outline"
                                size="sm"
                                className="font-mono text-[10px] border-indigo-800 text-indigo-300"
                              >
                                {currentJob.aiReport.provider}: {currentJob.aiReport.model}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                              <span>Inference: {currentJob.aiReport.executionDurationMs}ms</span>
                              <span>•</span>
                              <span className="text-emerald-400 font-medium">Zod Validated</span>
                            </div>
                          </div>

                          {/* Executive Summary */}
                          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                              <FileText className="w-3.5 h-3.5 text-indigo-400" />
                              Executive Summary
                            </div>
                            <p className="text-sm text-slate-200 leading-relaxed">
                              {currentJob.aiReport.data.executiveSummary}
                            </p>
                          </div>

                          {/* Business Impact Interpretation (4 Cards Grid) */}
                          <div className="space-y-2">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                              Business Impact Interpretation
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                                <span className="text-slate-400 font-medium text-[11px] block">
                                  Technical Debt
                                </span>
                                <p className="text-slate-300 leading-relaxed">
                                  {currentJob.aiReport.data.businessImpactInterpretation.technicalDebtSummary}
                                </p>
                              </div>

                              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                                <span className="text-slate-400 font-medium text-[11px] block">
                                  User Experience Friction
                                </span>
                                <p className="text-slate-300 leading-relaxed">
                                  {currentJob.aiReport.data.businessImpactInterpretation.userExperienceImpact}
                                </p>
                              </div>

                              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                                <span className="text-slate-400 font-medium text-[11px] block">
                                  Search Visibility Impact
                                </span>
                                <p className="text-slate-300 leading-relaxed">
                                  {currentJob.aiReport.data.businessImpactInterpretation.searchVisibilityImpact}
                                </p>
                              </div>

                              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                                <span className="text-slate-400 font-medium text-[11px] block">
                                  Conversion Friction
                                </span>
                                <p className="text-slate-300 leading-relaxed">
                                  {currentJob.aiReport.data.businessImpactInterpretation.conversionFriction}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Prioritized Explanations */}
                          {currentJob.aiReport.data.prioritizedExplanations?.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                Prioritized Explanations ({currentJob.aiReport.data.prioritizedExplanations.length})
                              </h4>
                              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                {currentJob.aiReport.data.prioritizedExplanations.map((exp, idx) => (
                                  <div
                                    key={exp.id || idx}
                                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1"
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono text-slate-500 font-bold">
                                          #{exp.priority || idx + 1}
                                        </span>
                                        <span className="font-medium text-slate-200">
                                          {exp.title}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <Badge variant="outline" size="sm" className="uppercase text-[9px]">
                                          {exp.category}
                                        </Badge>
                                        <Badge
                                          variant={
                                            exp.severity === "critical"
                                              ? "error"
                                              : exp.severity === "warning"
                                              ? "warning"
                                              : "info"
                                          }
                                          size="sm"
                                        >
                                          {exp.severity}
                                        </Badge>
                                      </div>
                                    </div>
                                    <p className="text-slate-400 leading-relaxed">
                                      {exp.explanation}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Actionable Recommendations */}
                          {currentJob.aiReport.data.actionableRecommendations?.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                Actionable Technical Recommendations ({currentJob.aiReport.data.actionableRecommendations.length})
                              </h4>
                              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                {currentJob.aiReport.data.actionableRecommendations.map((rec, idx) => (
                                  <div
                                    key={rec.id || idx}
                                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1.5"
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                                      <span className="font-medium text-slate-200">
                                        {rec.title}
                                      </span>
                                      <div className="flex items-center gap-1.5">
                                        <Badge variant="outline" size="sm" className="uppercase text-[9px]">
                                          {rec.category}
                                        </Badge>
                                        <Badge
                                          variant={
                                            rec.priority === "high"
                                              ? "error"
                                              : rec.priority === "medium"
                                              ? "warning"
                                              : "info"
                                          }
                                          size="sm"
                                        >
                                          {rec.priority} priority
                                        </Badge>
                                      </div>
                                    </div>
                                    <p className="text-slate-300 leading-relaxed font-mono text-[11px] bg-slate-900/60 p-2 rounded border border-slate-800">
                                      {rec.technicalGuidance}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Phased Improvements: Quick Wins / Medium-Term / Longer-Term */}
                          <div className="space-y-2">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                              Phased Improvement Action Items
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {/* Quick Wins */}
                              <div className="p-3 rounded-xl bg-slate-950/80 border border-emerald-900/40 space-y-2">
                                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                                  <span className="text-xs font-semibold text-emerald-400">
                                    Quick Wins
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-mono">1–3 Days</span>
                                </div>
                                <div className="space-y-2">
                                  {currentJob.aiReport.data.quickWins?.map((w, idx) => (
                                    <div key={idx} className="text-xs space-y-1">
                                      <div className="font-medium text-slate-200">{w.title}</div>
                                      <div className="text-[11px] text-slate-400">{w.impact}</div>
                                      <div className="text-[10px] text-emerald-400 font-mono">{w.guidance}</div>
                                    </div>
                                  ))}
                                  {(!currentJob.aiReport.data.quickWins || currentJob.aiReport.data.quickWins.length === 0) && (
                                    <span className="text-slate-500 text-xs italic">No immediate quick wins identified.</span>
                                  )}
                                </div>
                              </div>

                              {/* Medium-Term */}
                              <div className="p-3 rounded-xl bg-slate-950/80 border border-cyan-900/40 space-y-2">
                                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                                  <span className="text-xs font-semibold text-cyan-400">
                                    Medium-Term
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-mono">1–2 Weeks</span>
                                </div>
                                <div className="space-y-2">
                                  {currentJob.aiReport.data.mediumTermImprovements?.map((m, idx) => (
                                    <div key={idx} className="text-xs space-y-1">
                                      <div className="font-medium text-slate-200">{m.title}</div>
                                      <div className="text-[11px] text-slate-400">{m.impact}</div>
                                      <div className="text-[10px] text-cyan-400 font-mono">{m.guidance}</div>
                                    </div>
                                  ))}
                                  {(!currentJob.aiReport.data.mediumTermImprovements || currentJob.aiReport.data.mediumTermImprovements.length === 0) && (
                                    <span className="text-slate-500 text-xs italic">No medium-term items found.</span>
                                  )}
                                </div>
                              </div>

                              {/* Longer-Term */}
                              <div className="p-3 rounded-xl bg-slate-950/80 border border-indigo-900/40 space-y-2">
                                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                                  <span className="text-xs font-semibold text-indigo-400">
                                    Longer-Term
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-mono">2–4 Weeks</span>
                                </div>
                                <div className="space-y-2">
                                  {currentJob.aiReport.data.longerTermImprovements?.map((l, idx) => (
                                    <div key={idx} className="text-xs space-y-1">
                                      <div className="font-medium text-slate-200">{l.title}</div>
                                      <div className="text-[11px] text-slate-400">{l.impact}</div>
                                      <div className="text-[10px] text-indigo-400 font-mono">{l.guidance}</div>
                                    </div>
                                  ))}
                                  {(!currentJob.aiReport.data.longerTermImprovements || currentJob.aiReport.data.longerTermImprovements.length === 0) && (
                                    <span className="text-slate-500 text-xs italic">No longer-term items found.</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* 30-Day Growth Roadmap */}
                          {currentJob.aiReport.data.growthRoadmap30Day && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                Suggested 30-Day Growth Roadmap
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                                {[
                                  {
                                    title: "Phase 1: Foundation",
                                    days: "Days 1–7",
                                    items: currentJob.aiReport.data.growthRoadmap30Day.phase1Days1To7 || [],
                                  },
                                  {
                                    title: "Phase 2: Acceleration",
                                    days: "Days 8–14",
                                    items: currentJob.aiReport.data.growthRoadmap30Day.phase2Days8To14 || [],
                                  },
                                  {
                                    title: "Phase 3: Experience",
                                    days: "Days 15–21",
                                    items: currentJob.aiReport.data.growthRoadmap30Day.phase3Days15To21 || [],
                                  },
                                  {
                                    title: "Phase 4: Scale",
                                    days: "Days 22–30",
                                    items: currentJob.aiReport.data.growthRoadmap30Day.phase4Days22To30 || [],
                                  },
                                ].map((phase, pIdx) => (
                                  <div key={pIdx} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                                    <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                                      <span className="font-medium text-slate-200 text-xs">{phase.title}</span>
                                      <span className="text-[10px] font-mono text-cyan-400">{phase.days}</span>
                                    </div>
                                    <div className="space-y-1.5">
                                      {phase.items.map((m, mIdx) => (
                                        <div key={mIdx} className="p-1.5 rounded bg-slate-900/60 border border-slate-800/80 text-[11px] space-y-1">
                                          <div className="text-slate-200 leading-snug">{m.task}</div>
                                          <Badge variant="outline" size="sm" className="text-[9px] uppercase tracking-wider text-slate-400">
                                            {m.targetDimension}
                                          </Badge>
                                        </div>
                                      ))}
                                      {phase.items.length === 0 && (
                                        <span className="text-slate-500 text-[11px] italic">No milestones defined.</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Anti-Hallucination & Integrity Banner */}
                          <div className="p-3 rounded-lg bg-slate-950/90 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2.5">
                            <Shield className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-semibold text-slate-300 block mb-0.5">
                                AI Interpretation Integrity Policy
                              </span>
                              <p className="leading-relaxed">
                                All interpretations are strictly synthesized from real DOM and network signals collected by SiteLens. The AI layer does not alter deterministic scores ({currentJob.scoreResult?.overallScore}/100), fabricate metrics, or simulate non-existent traffic.
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : currentJob.aiReport && (!currentJob.aiReport.isAvailable || currentJob.aiReport.status !== "completed") ? (
                        /* Case 2: Local Ollama is offline or unavailable */
                        <div className="p-5 rounded-xl bg-slate-950/90 border border-amber-800/50 space-y-4">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-semibold text-amber-200">
                                  Local Ollama AI Interpretation Offline
                                </h4>
                                <Badge variant="warning" size="sm">
                                  {currentJob.aiReport.status}
                                </Badge>
                              </div>
                              <p className="text-xs text-slate-300 leading-relaxed">
                                {currentJob.aiReport.unavailableReason ||
                                  "SiteLens communicates directly with your local Ollama daemon for 100% private, zero-cloud AI synthesis. The daemon is currently not responding on http://localhost:11434."}
                              </p>
                            </div>
                          </div>

                          {/* Quick Setup Instructions */}
                          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2 text-xs">
                            <div className="font-medium text-slate-200 flex items-center gap-1.5">
                              <span>To enable local AI interpretation:</span>
                            </div>
                            <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px]">
                              <li>Ensure Ollama is installed (<a href="https://ollama.com" target="_blank" rel="noreferrer" className="text-cyan-400 underline">ollama.com</a>).</li>
                              <li>
                                Run the local model in your terminal:
                                <code className="block mt-1 p-2 rounded bg-slate-950 text-cyan-300 font-mono text-[11px]">
                                  ollama run llama3:8b
                                </code>
                              </li>
                              <li>Once running, click Retry below to synthesize your audit interpretations.</li>
                            </ol>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                            <div className="flex items-center gap-2 text-[11px] text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Deterministic audit scores & checks are 100% complete and unaffected.</span>
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleRunAIInterpretation}
                              isLoading={isInterpretingAI}
                              className="text-xs"
                            >
                              <RotateCcw className="w-3 h-3 mr-1" />
                              Retry AI Interpretation
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* Case 3: AI was not requested for this audit run */
                        <div className="p-5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-4 text-center">
                          <div className="max-w-md mx-auto space-y-2">
                            <Sparkles className="w-6 h-6 text-indigo-400 mx-auto" />
                            <h4 className="text-sm font-semibold text-slate-200">
                              Local AI Interpretation Not Yet Run
                            </h4>
                            <p className="text-xs text-slate-400 leading-relaxed">
                              Run local Ollama to receive an executive summary, prioritized issue explanations, business impact breakdown, and a 30-day growth roadmap grounded on your deterministic audit findings.
                            </p>
                          </div>

                          <div>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={handleRunAIInterpretation}
                              isLoading={isInterpretingAI}
                              className="text-xs"
                            >
                              <Sparkles className="w-3 h-3 mr-1.5" />
                              Run AI Interpretation with Ollama
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Failure State */}
          {currentJob.status === "failed" && currentJob.error && (
            <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-800/60 space-y-2 text-rose-300">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-rose-200">
                      Audit Failed: {currentJob.error.code}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {currentJob.error.userMessage}
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAuditSubmit}
                  className="text-xs"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Retry Analysis
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Input Form */}
      <form
        onSubmit={handleAuditSubmit}
        className="rounded-2xl border border-slate-800 bg-slate-900/90 p-3 sm:p-4 shadow-xl backdrop-blur-md transition-all focus-within:border-slate-700"
      >
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <Globe className="w-5 h-5" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={url}
              onChange={handleInputChange}
              onBlur={() => url && validateInput(url)}
              placeholder="Enter target URL (e.g. stripe.com or https://example.org)"
              className="w-full pl-11 pr-14 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-sm sm:text-base focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/60 transition"
              aria-label="Website URL"
              disabled={isSubmitting || isJobActive}
            />
            <div className="absolute inset-y-0 right-0 pr-3 hidden sm:flex items-center pointer-events-none">
              <kbd className="px-1.5 py-0.5 text-[11px] font-mono font-medium text-slate-500 bg-slate-900 border border-slate-700 rounded">
                /
              </kbd>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isSubmitting || isJobActive}
            disabled={isSubmitting || isJobActive || !url.trim()}
            className="w-full sm:w-auto shrink-0 font-medium"
          >
            <Search className="w-4 h-4 mr-1.5" />
            Analyze a website
          </Button>
        </div>

        {/* Validation Error Message */}
        {urlError && (
          <div className="mt-2.5 px-2 flex items-center gap-1.5 text-xs text-rose-400">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>{urlError}</span>
          </div>
        )}

        {/* Options Bar Toggle */}
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 px-1">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setDeviceType(deviceType === "desktop" ? "mobile" : "desktop")}
              className="inline-flex items-center gap-1.5 hover:text-slate-200 transition py-0.5"
            >
              {deviceType === "desktop" ? (
                <>
                  <Monitor className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Desktop (1440px)</span>
                </>
              ) : (
                <>
                  <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Mobile (390px)</span>
                </>
              )}
            </button>

            <span className="text-slate-700">|</span>

            <button
              type="button"
              onClick={() => setRequestAI(!requestAI)}
              className={`inline-flex items-center gap-1.5 transition py-0.5 ${
                requestAI ? "text-indigo-400 font-medium" : "hover:text-slate-200"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{requestAI ? "Local Ollama Active" : "Enable Local Ollama"}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowOptions(!showOptions)}
            className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-300 transition"
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>Options</span>
            {showOptions ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
        </div>

        {/* Expandable Advanced Options Drawer */}
        {showOptions && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-3 px-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                Audited Dimensions
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {selectedCategories.length} of 6 active
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categories.map((cat) => {
                const checked = selectedCategories.includes(cat.id);
                return (
                  <label
                    key={cat.id}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer select-none transition ${
                      checked
                        ? "bg-slate-800/60 border-slate-700 text-slate-200"
                        : "bg-slate-950/40 border-slate-800/60 text-slate-500 hover:border-slate-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCategory(cat.id)}
                      className="rounded accent-cyan-500"
                    />
                    <span>{cat.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
