"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  FileText,
  Search,
  Zap,
  Eye,
  Smartphone,
  Sparkles,
  ArrowLeft,
  Calendar,
  Layers,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Shield,
  Gauge,
  Activity,
  AlertOctagon,
  Info,
  RotateCcw,
  Code2,
  Terminal,
  Check,
  Globe,
  SlidersHorizontal,
  FolderGit2,
} from "lucide-react";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";
import { EmptyState } from "../ui/EmptyState";
import type {
  SiteLensAuditReport,
  AnalysisCategory,
  AnalysisIssue,
  IssueSeverity,
} from "@/lib/types";

export interface ReportShellProps {
  reportId?: string;
}

export function ReportShell({ reportId }: ReportShellProps) {
  const [report, setReport] = useState<SiteLensAuditReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!reportId);
  const [error, setError] = useState<string | null>(null);

  // Filters & UI state
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [expandedIssueIds, setExpandedIssueIds] = useState<Set<string>>(new Set());
  const [showPassedChecks, setShowPassedChecks] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"findings" | "dimensions" | "ai" | "passed">("findings");
  const [isRetryingAI, setIsRetryingAI] = useState<boolean>(false);

  useEffect(() => {
    if (!reportId) {
      // If no reportId provided, try to fetch the most recent audit from history
      fetch("/api/reports/history?limit=1")
        .then((res) => (res.ok ? res.json() : { history: [] }))
        .then((data) => {
          if (data.history && data.history.length > 0) {
            const latestId = data.history[0].id;
            loadReport(latestId);
          } else {
            setIsLoading(false);
          }
        })
        .catch(() => {
          setIsLoading(false);
        });
      return;
    }

    loadReport(reportId);
  }, [reportId]);

  const loadReport = (id: string) => {
    setIsLoading(true);
    setError(null);

    fetch(`/api/reports/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Report '${id}' not found or unreachable.`);
        return res.json();
      })
      .then((data) => {
        setReport(data.report || null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load audit report.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleRetryAI = async () => {
    if (!report) return;
    setIsRetryingAI(true);
    try {
      const res = await fetch(`/api/audit/jobs/${report.id}/ai`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.job?.aiReport) {
          setReport((prev) =>
            prev ? { ...prev, aiInterpretation: data.job.aiReport } : prev
          );
        }
      }
    } catch {
      // non-fatal
    } finally {
      setIsRetryingAI(false);
    }
  };

  const toggleIssueExpanded = (id: string) => {
    setExpandedIssueIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllExpanded = (expand: boolean) => {
    if (!report) return;
    if (expand) {
      setExpandedIssueIds(new Set(report.analysis.allIssues.map((i) => i.id)));
    } else {
      setExpandedIssueIds(new Set());
    }
  };

  // Filter issues based on category and severity
  const filteredIssues = useMemo(() => {
    if (!report) return [];
    return report.analysis.allIssues.filter((iss) => {
      if (selectedCategory !== "all" && iss.category !== selectedCategory) {
        return false;
      }
      if (severityFilter !== "all" && iss.severity !== severityFilter) {
        return false;
      }
      return true;
    });
  }, [report, selectedCategory, severityFilter]);

  // Aggregate issue counts
  const criticalCount = useMemo(() => {
    return report?.analysis.allIssues.filter((i) => i.severity === "critical").length ?? 0;
  }, [report]);

  const warningCount = useMemo(() => {
    return report?.analysis.allIssues.filter((i) => i.severity === "warning").length ?? 0;
  }, [report]);

  const infoCount = useMemo(() => {
    return report?.analysis.allIssues.filter((i) => i.severity === "info").length ?? 0;
  }, [report]);

  // Aggregate passed checks across analyzers
  const allPassedChecks = useMemo(() => {
    if (!report) return [];
    const list: Array<{ id: string; category: string; title: string; criteria?: string }> = [];

    if (report.seoReport) {
      for (const chk of report.seoReport.checks.filter((c) => c.status === "pass")) {
        list.push({
          id: chk.checkId,
          category: "SEO",
          title: chk.name,
          criteria: chk.explanation,
        });
      }
    }

    if (report.performanceReport) {
      for (const chk of (report.performanceReport as any).passedChecks || []) {
        list.push({
          id: chk.id,
          category: "Performance",
          title: chk.title,
          criteria: chk.description,
        });
      }
    }

    if (report.accessibilityReport) {
      for (const chk of (report.accessibilityReport.passedRules || []).map((r: any) => ({ id: r.id, title: r.description, description: r.helpUrl || '' }))) {
        list.push({
          id: chk.id,
          category: "Accessibility",
          title: chk.title,
          criteria: chk.description,
        });
      }
    }

    if (report.contentReport) {
      for (const chk of report.contentReport.checks.filter((c) => c.status === "pass")) {
        list.push({
          id: chk.checkId,
          category: "Content",
          title: chk.name,
          criteria: chk.explanation,
        });
      }
    }

    if (report.mobileUxReport) {
      for (const f of report.mobileUxReport.findings.filter((f) => f.status === "pass")) {
        list.push({
          id: f.id,
          category: f.category.toUpperCase(),
          title: f.title,
          criteria: f.explanation,
        });
      }
    }

    return list;
  }, [report]);

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 space-y-6 text-center">
        <div className="w-10 h-10 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-slate-200">
            Synthesizing Deterministic Audit Report...
          </h3>
          <p className="text-xs text-slate-500 font-mono">
            Loading DOM measurements, Core Web Vitals, and accessibility findings
          </p>
        </div>
      </div>
    );
  }

  // 2. Failure State
  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <div className="p-6 rounded-2xl bg-rose-950/30 border border-rose-800/60 space-y-4">
          <div className="flex items-start gap-3">
            <AlertOctagon className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h2 className="text-base font-bold text-rose-200">
                Audit Report Resolution Error
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">{error}</p>
            </div>
          </div>

          <div className="pt-2 flex items-center gap-3">
            {reportId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadReport(reportId)}
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Retry Loading
              </Button>
            )}
            <Link href="/">
              <Button variant="primary" size="sm">
                <Search className="w-3.5 h-3.5 mr-1.5" />
                Run New Audit
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Empty State (No reports exist yet)
  if (!report) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                Dashboard
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Audit Report Viewer
            </h1>
          </div>

          <Link href="/">
            <Button variant="primary" size="sm">
              <Search className="w-3.5 h-3.5 mr-1.5" />
              Start Website Audit
            </Button>
          </Link>
        </div>

        <EmptyState
          icon={FileText}
          title="No Audit Reports Found"
          description="SiteLens has not recorded any website audit runs in your local workspace yet. Run a website analysis from the homepage to generate deterministic scores, multi-category findings, and local AI roadmaps."
          actionLabel="Go to Website Auditor"
          onAction={() => {
            window.location.href = "/";
          }}
        />
      </div>
    );
  }

  const scores = report.scores;
  const ai = report.aiInterpretation;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Top Header Navigation & Meta */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <Link href="/dashboard" className="hover:text-cyan-400 transition">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-slate-500 truncate">Run #{report.id.slice(0, 16)}</span>
          </div>

          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-cyan-400 shrink-0" />
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight truncate">
              {report.targetUrl}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono pt-1">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              {new Date(report.createdAt).toLocaleString()}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              {report.durationMs}ms duration
            </span>
            <span>•</span>
            <Badge variant="outline" size="sm" className="font-mono text-[10px]">
              {report.meta?.environment || "production"}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              <Layers className="w-3.5 h-3.5 mr-1.5" />
              All Audits
            </Button>
          </Link>
          <Link href="/">
            <Button variant="primary" size="sm">
              <Search className="w-3.5 h-3.5 mr-1.5" />
              Audit Another URL
            </Button>
          </Link>
        </div>
      </div>

      {/* SECTION 1: Overall SiteLens Score & Executive Scorecard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Overall Scorecard Hero */}
        <Card className="lg:col-span-4 p-6 flex flex-col justify-between space-y-4 bg-gradient-to-b from-slate-900 to-slate-950 border-slate-800">
          <div className="space-y-1">
            <span className="text-xs uppercase font-mono tracking-wider text-slate-400 block">
              Overall SiteLens Quality Score
            </span>
            <p className="text-[11px] text-slate-500">
              Deterministic mathematical index across 6 technical dimensions
            </p>
          </div>

          <div className="flex items-center gap-5 my-2">
            <div
              className={`w-24 h-24 rounded-2xl border-4 flex flex-col items-center justify-center font-mono font-bold shadow-xl transition-transform ${
                scores.overallScore >= 85
                  ? "border-emerald-500 bg-emerald-950/30 text-emerald-300"
                  : scores.overallScore >= 70
                  ? "border-cyan-500 bg-cyan-950/30 text-cyan-300"
                  : scores.overallScore >= 55
                  ? "border-amber-500 bg-amber-950/30 text-amber-300"
                  : "border-rose-500 bg-rose-950/30 text-rose-300"
              }`}
            >
              <span className="text-3xl tracking-tight">{scores.overallScore}</span>
              <span className="text-[10px] text-slate-400 font-sans uppercase">out of 100</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    scores.overallGrade === "A+" || scores.overallGrade === "A"
                      ? "success"
                      : scores.overallGrade === "B"
                      ? "info"
                      : scores.overallGrade === "C"
                      ? "warning"
                      : "error"
                  }
                  size="md"
                  className="font-bold text-sm px-2.5 py-0.5"
                >
                  Grade {scores.overallGrade}
                </Badge>
              </div>
              <p className="text-xs text-slate-300">
                {scores.overallScore >= 85
                  ? "Exceptional technical baseline with minimal structural debt."
                  : scores.overallScore >= 70
                  ? "Sound architecture with moderate optimization opportunities."
                  : scores.overallScore >= 55
                  ? "Needs attention: detectable UX or performance bottlenecks."
                  : "Critical technical deficits requiring immediate remediation."}
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-4 gap-1.5 pt-3 border-t border-slate-800/80 font-mono text-center">
            <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-emerald-400 block font-bold">
                {scores.summary.passedChecks}
              </span>
              <span className="text-[9px] text-slate-500 uppercase">Passed</span>
            </div>
            <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-amber-400 block font-bold">
                {scores.summary.warningChecks}
              </span>
              <span className="text-[9px] text-slate-500 uppercase">Warnings</span>
            </div>
            <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-rose-400 block font-bold">
                {scores.summary.failedChecks}
              </span>
              <span className="text-[9px] text-slate-500 uppercase">Critical</span>
            </div>
            <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-bold">
                {scores.summary.unavailableChecks}
              </span>
              <span className="text-[9px] text-slate-500 uppercase">N/A</span>
            </div>
          </div>
        </Card>

        {/* SECTION 2: Category Scores (6 Dimension Breakdown) */}
        <Card className="lg:col-span-8 p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="space-y-0.5">
              <span className="text-xs uppercase font-mono tracking-wider text-slate-400">
                Dimension Category Scores
              </span>
              <p className="text-[11px] text-slate-500">
                Click any dimension below to filter issues and inspect specific audit rules
              </p>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Weighting 100% Normalized</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { id: "seo", label: "SEO", icon: Search, data: scores.categories.seo },
              { id: "performance", label: "Performance", icon: Gauge, data: scores.categories.performance },
              { id: "accessibility", label: "Accessibility", icon: Eye, data: scores.categories.accessibility },
              { id: "content", label: "Content", icon: FileText, data: scores.categories.content },
              { id: "mobile", label: "Mobile", icon: Smartphone, data: scores.categories.mobile },
              { id: "ux", label: "UX Standards", icon: Activity, data: scores.categories.ux },
            ].map(({ id, label, icon: Icon, data }) => {
              const isSelected = selectedCategory === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(selectedCategory === id ? "all" : id);
                    setActiveTab("findings");
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? "bg-slate-800/90 border-cyan-500 ring-1 ring-cyan-500/40 shadow-md"
                      : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 text-slate-400" />
                      {label}
                    </span>
                    <Badge
                      variant={
                        data.grade === "A+" || data.grade === "A"
                          ? "success"
                          : data.grade === "B"
                          ? "info"
                          : data.grade === "C"
                          ? "warning"
                          : "error"
                      }
                      size="sm"
                    >
                      {data.grade}
                    </Badge>
                  </div>

                  <div className="flex items-baseline justify-between font-mono">
                    <span className="text-xl font-bold text-slate-100">{data.score}</span>
                    <span className="text-[10px] text-slate-500">
                      {Math.round(data.weight * 100)}% weight
                    </span>
                  </div>

                  <div className="mt-2 text-[10px] text-slate-500 font-mono flex items-center justify-between border-t border-slate-800/60 pt-1.5">
                    <span className="text-emerald-400">{data.passedChecks} pass</span>
                    <span className="text-rose-400">{data.failedChecks} fail</span>
                    <span className="text-amber-400">{data.warningChecks} warn</span>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Main Tabbed Report Viewer */}
      <div className="space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("findings")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === "findings"
                  ? "bg-slate-800 text-cyan-300 shadow-sm border border-slate-700"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Issues & Remediation ({report.analysis.allIssues.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("dimensions")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === "dimensions"
                  ? "bg-slate-800 text-cyan-300 shadow-sm border border-slate-700"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Detailed Domain Audits (6)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("passed")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === "passed"
                  ? "bg-slate-800 text-emerald-300 shadow-sm border border-slate-700"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Passed Checks ({allPassedChecks.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("ai")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === "ai"
                  ? "bg-indigo-950/80 text-indigo-300 shadow-sm border border-indigo-700/60"
                  : "text-slate-400 hover:text-indigo-300"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>
                AI Interpretation
                {ai?.isAvailable ? " (Ready)" : ai?.status === "unavailable" ? " (Offline)" : ""}
              </span>
            </button>
          </div>

          {/* Quick Filter Pill Controls when on findings tab */}
          {activeTab === "findings" && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
                {(["all", "critical", "warning", "info"] as const).map((sev) => (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setSeverityFilter(sev)}
                    className={`px-2 py-1 rounded text-[11px] capitalize transition ${
                      severityFilter === sev
                        ? "bg-slate-800 text-slate-100 font-semibold"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {sev === "all" ? "All Severities" : sev}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => toggleAllExpanded(expandedIssueIds.size < filteredIssues.length)}
                className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded border border-slate-800 bg-slate-900 transition"
              >
                {expandedIssueIds.size < filteredIssues.length ? "Expand All" : "Collapse All"}
              </button>
            </div>
          )}
        </div>

        {/* TAB 1: Issues & Remediations (What is wrong / Why it matters / Evidence / What to do next) */}
        {activeTab === "findings" && (
          <div className="space-y-4">
            {/* Filter Breadcrumb Bar if filtered */}
            {(selectedCategory !== "all" || severityFilter !== "all") && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span>Filtered View:</span>
                  {selectedCategory !== "all" && (
                    <Badge variant="outline" size="sm" className="uppercase font-mono">
                      Category: {selectedCategory}
                    </Badge>
                  )}
                  {severityFilter !== "all" && (
                    <Badge variant="outline" size="sm" className="uppercase font-mono">
                      Severity: {severityFilter}
                    </Badge>
                  )}
                  <span>({filteredIssues.length} findings matching)</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory("all");
                    setSeverityFilter("all");
                  }}
                  className="text-cyan-400 hover:underline text-xs"
                >
                  Clear Filters
                </button>
              </div>
            )}

            {filteredIssues.length === 0 ? (
              <Card className="p-8 text-center space-y-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <h3 className="text-sm font-semibold text-slate-200">
                  No issues found matching criteria
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  All inspected rules for this filter passed with zero deductible violations.
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredIssues.map((iss) => {
                  const isExpanded = expandedIssueIds.has(iss.id);
                  const isCrit = iss.severity === "critical";
                  const isWarn = iss.severity === "warning";

                  return (
                    <div
                      key={iss.id}
                      className={`rounded-2xl border transition-all ${
                        isCrit
                          ? "border-rose-900/60 bg-rose-950/20"
                          : isWarn
                          ? "border-amber-900/60 bg-amber-950/20"
                          : "border-slate-800 bg-slate-950/40"
                      }`}
                    >
                      {/* Issue Header Bar */}
                      <div
                        onClick={() => toggleIssueExpanded(iss.id)}
                        className="p-4 cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 select-none"
                      >
                        <div className="flex items-start gap-3">
                          {/* Accessible Severity Icon + Monospace Tag (not relying only on color) */}
                          <div className="shrink-0 mt-0.5">
                            {isCrit ? (
                              <AlertOctagon className="w-5 h-5 text-rose-400" aria-label="Critical issue" />
                            ) : isWarn ? (
                              <AlertTriangle className="w-5 h-5 text-amber-400" aria-label="Warning issue" />
                            ) : (
                              <Info className="w-5 h-5 text-blue-400" aria-label="Informational finding" />
                            )}
                          </div>

                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              {/* Prominent Accessible Severity Monospace Indicator */}
                              <span
                                className={`text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border ${
                                  isCrit
                                    ? "bg-rose-950 text-rose-300 border-rose-800"
                                    : isWarn
                                    ? "bg-amber-950 text-amber-300 border-amber-800"
                                    : "bg-slate-900 text-slate-300 border-slate-700"
                                }`}
                              >
                                {isCrit ? "[CRITICAL]" : isWarn ? "[WARNING]" : "[INFO]"}
                              </span>

                              <Badge variant="outline" size="sm" className="uppercase font-mono text-[9px]">
                                {iss.category}
                              </Badge>

                              <h3 className="text-sm font-semibold text-slate-100">
                                {iss.title}
                              </h3>
                            </div>

                            {/* What is wrong summary */}
                            <p className="text-xs text-slate-300 leading-relaxed">
                              {iss.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                          {iss.impactScoreDeduction > 0 && (
                            <span className="font-mono text-xs font-bold text-rose-400">
                              -{iss.impactScoreDeduction} pts
                            </span>
                          )}

                          <button
                            type="button"
                            className="p-1 text-slate-400 hover:text-slate-200 transition"
                            aria-label={isExpanded ? "Collapse finding details" : "Expand finding details"}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Expandable Technical Detail (Why it matters, Evidence, What to do next) */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 border-t border-slate-800/80 space-y-3 text-xs">
                          {/* 1. WHY IT MATTERS */}
                          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold block">
                              Why This Matters
                            </span>
                            <p className="text-slate-300 leading-relaxed text-xs">
                              {isCrit
                                ? "Critical violations block search indexing, break screen-reader navigation, or significantly degrade Core Web Vitals, causing measurable bounce rate regressions."
                                : isWarn
                                ? "Warnings represent non-standard DOM implementations, missing semantics, or suboptimal assets that degrade crawler confidence and user experience."
                                : "Informational findings identify optimization opportunities to harden site architecture."}
                            </p>
                          </div>

                          {/* 2. CONCRETE EVIDENCE */}
                          {(iss.targetElement || iss.codeSnippet) && (
                            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2 font-mono">
                              <span className="text-[10px] uppercase text-cyan-400 font-semibold block">
                                Observable DOM Evidence
                              </span>
                              {iss.targetElement && (
                                <div className="text-[11px] text-slate-400 truncate">
                                  <span className="text-slate-600 font-bold">Selector: </span>
                                  <code>{iss.targetElement}</code>
                                </div>
                              )}
                              {iss.codeSnippet && (
                                <pre className="p-2 rounded bg-slate-900/90 text-slate-300 text-[11px] overflow-x-auto whitespace-pre-wrap border border-slate-800">
                                  {iss.codeSnippet}
                                </pre>
                              )}
                            </div>
                          )}

                          {/* 3. WHAT THE USER SHOULD DO NEXT */}
                          <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-900/40 space-y-1">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-semibold block">
                              Recommended Engineering Action
                            </span>
                            <p className="text-slate-200 leading-relaxed text-xs">
                              {iss.recommendation}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Detailed Domain Audits (SEO, Performance, A11y, Content, Mobile, UX) */}
        {activeTab === "dimensions" && (
          <div className="space-y-6">
            {/* Domain 1: SEO Report */}
            {report.seoReport && (
              <Card className="p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-semibold text-slate-100">
                      SEO Architecture & Indexability
                    </h3>
                  </div>
                  <Badge variant={report.seoReport.isIndexable ? "success" : "warning"}>
                    {report.seoReport.isIndexable ? "Indexable" : "Index Blocked"}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">Title Tag</span>
                    <span className="text-slate-200 font-bold">
                      {(report.seoReport as any).titleMeta?.length || 0} chars
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">Meta Description</span>
                    <span className="text-slate-200 font-bold">
                      {(report.seoReport as any).metaDescription?.length || 0} chars
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">H1 Count</span>
                    <span className="text-slate-200 font-bold">
                      {(report.seoReport as any).headingsSummary?.h1Count ?? 0}
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">JSON-LD Schemas</span>
                    <span className="text-slate-200 font-bold">
                      {(report.seoReport as any).structuredDataCount ?? 0}
                    </span>
                  </div>
                </div>
              </Card>
            )}

            {/* Domain 2: Performance Report */}
            {report.performanceReport && (
              <Card className="p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-semibold text-slate-100">
                      Performance & Core Web Vitals
                    </h3>
                  </div>
                  <Badge variant="outline">
                    {report.performanceReport.lighthouse?.isAvailable ? "Available" : "Limited"}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">TTFB</span>
                    <span className="text-slate-200 font-bold">
                      {report.performanceReport.metrics.ttfb.value}ms
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">LCP</span>
                    <span className="text-slate-200 font-bold">
                      {report.performanceReport.metrics.lcp.value !== null
                        ? `${report.performanceReport.metrics.lcp.value}s`
                        : "Unavailable"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">CLS</span>
                    <span className="text-slate-200 font-bold">
                      {report.performanceReport.metrics.cls.value !== null
                        ? report.performanceReport.metrics.cls.value
                        : "Unavailable"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">Total Weight</span>
                    <span className="text-slate-200 font-bold">
                      {report.performanceReport.resources?.totalSizeBytes != null ? `${Math.round(report.performanceReport.resources.totalSizeBytes / 1024)} KB` : "N/A"}
                    </span>
                  </div>
                </div>
              </Card>
            )}

            {/* Domain 3: Accessibility Report */}
            {report.accessibilityReport && (
              <Card className="p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-semibold text-slate-100">
                      Accessibility (a11y) Verification
                    </h3>
                  </div>
                  <Badge variant="outline">
                    {report.accessibilityReport.summary.automaticallyDetectableCount} detectable
                  </Badge>
                </div>

                <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400">
                  <Shield className="w-4 h-4 text-cyan-400 inline mr-1.5" />
                  {report.accessibilityReport.wcagDisclaimer}
                </div>
              </Card>
            )}

            {/* Domain 4: Content Report */}
            {report.contentReport && (
              <Card className="p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-semibold text-slate-100">
                      Content Quality & Readability
                    </h3>
                  </div>
                  <Badge variant="outline">
                    ~{report.contentReport.metrics.wordCount.toLocaleString()} words
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">Read Time</span>
                    <span className="text-slate-200 font-bold">
                      ~{report.contentReport.metrics.readingTimeMinutes} min
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">Text/HTML Ratio</span>
                    <span className="text-slate-200 font-bold">
                      {report.contentReport.metrics.textToHtmlRatioPercent}%
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">Reading Ease</span>
                    <span className="text-slate-200 font-bold">
                      {report.contentReport.metrics.readability?.fleschReadingEase ?? "N/A"}/100
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">CTAs Detected</span>
                    <span className="text-slate-200 font-bold">
                      {report.contentReport.metrics.callToActionSummary.detectedCtaCount}
                    </span>
                  </div>
                </div>
              </Card>
            )}

            {/* Domain 5: Mobile & UX Report */}
            {report.mobileUxReport && (
              <Card className="p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-semibold text-slate-100">
                      Mobile Optimization & UX Layout
                    </h3>
                  </div>
                  <Badge variant="outline">
                    {report.mobileUxReport.metrics.hasHorizontalOverflow ? "Overflow Detected" : "Layout Contained"}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">Viewport Tag</span>
                    <span className="text-slate-200 font-bold">
                      {report.mobileUxReport.metrics.viewportConfigured ? "Present" : "Missing"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">Min Tap Target</span>
                    <span className="text-slate-200 font-bold">
                      {report.mobileUxReport.metrics.undersizedTapTargetsCount} issues
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">Min Font Size</span>
                    <span className="text-slate-200 font-bold">
                      {report.mobileUxReport.metrics.minimumComputedFontSizePx !== null
                        ? `${report.mobileUxReport.metrics.minimumComputedFontSizePx}px`
                        : "N/A"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">Runtime JS Errors</span>
                    <span className="text-slate-200 font-bold">
                      {report.mobileUxReport.metrics.unhandledErrorsCount}
                    </span>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* TAB 3: Passed Checks (Verified Criteria) */}
        {activeTab === "passed" && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-slate-200">
                  Total Passing Rules: {allPassedChecks.length}
                </span>
              </div>
              <span className="text-slate-500 font-mono">Zero deductions applied</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {allPassedChecks.map((chk, idx) => (
                <div
                  key={chk.id || idx}
                  className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs flex items-start gap-2.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-200">{chk.title}</span>
                      <Badge variant="outline" size="sm" className="text-[9px] uppercase font-mono">
                        {chk.category}
                      </Badge>
                    </div>
                    {chk.criteria && (
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        {chk.criteria}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: Local AI Interpretation (Ollama Synthesis) */}
        {activeTab === "ai" && (
          <div className="space-y-6">
            {ai?.isAvailable && ai.data ? (
              <div className="space-y-6">
                {/* Header Banner */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-900/60 text-xs">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span className="font-semibold text-indigo-200">
                      Local Ollama AI Interpretation
                    </span>
                    <Badge variant="outline" size="sm" className="font-mono text-[10px] border-indigo-800 text-indigo-300">
                      {ai.provider}: {ai.model}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                    <span>Duration: {ai.executionDurationMs}ms</span>
                    <span>•</span>
                    <span className="text-emerald-400 font-medium">Zod Validated</span>
                  </div>
                </div>

                {/* 1. AI Executive Summary */}
                <Card className="p-6 space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-indigo-400" />
                    Executive Summary
                  </h3>
                  <p className="text-sm text-slate-200 leading-relaxed font-sans">
                    {ai.data.executiveSummary}
                  </p>
                </Card>

                {/* 2. Business Impact Interpretation */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Business Impact Interpretation
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                      <span className="text-slate-400 font-medium text-xs block">Technical Debt</span>
                      <p className="text-slate-300 leading-relaxed">
                        {ai.data.businessImpactInterpretation.technicalDebtSummary}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                      <span className="text-slate-400 font-medium text-xs block">User Experience Friction</span>
                      <p className="text-slate-300 leading-relaxed">
                        {ai.data.businessImpactInterpretation.userExperienceImpact}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                      <span className="text-slate-400 font-medium text-xs block">Search Visibility Impact</span>
                      <p className="text-slate-300 leading-relaxed">
                        {ai.data.businessImpactInterpretation.searchVisibilityImpact}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                      <span className="text-slate-400 font-medium text-xs block">Conversion Friction</span>
                      <p className="text-slate-300 leading-relaxed">
                        {ai.data.businessImpactInterpretation.conversionFriction}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Quick Wins (1-3 Days) */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-emerald-400" />
                    Quick Wins (1–3 Days Resolution)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {ai.data.quickWins.map((w, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl bg-slate-950 border border-emerald-900/40 space-y-2 text-xs"
                      >
                        <div className="font-semibold text-emerald-300">{w.title}</div>
                        <p className="text-slate-300 text-[11px] leading-relaxed">{w.impact}</p>
                        <div className="text-[10px] text-emerald-400 font-mono pt-1 border-t border-slate-800">
                          {w.guidance}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. 30-Day Growth Roadmap */}
                {ai.data.growthRoadmap30Day && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <FolderGit2 className="w-3.5 h-3.5 text-cyan-400" />
                      Suggested 30-Day Growth Roadmap
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                      {[
                        {
                          phase: "Phase 1: Foundation",
                          range: "Days 1–7",
                          items: ai.data.growthRoadmap30Day.phase1Days1To7,
                        },
                        {
                          phase: "Phase 2: Acceleration",
                          range: "Days 8–14",
                          items: ai.data.growthRoadmap30Day.phase2Days8To14,
                        },
                        {
                          phase: "Phase 3: Experience",
                          range: "Days 15–21",
                          items: ai.data.growthRoadmap30Day.phase3Days15To21,
                        },
                        {
                          phase: "Phase 4: Scale",
                          range: "Days 22–30",
                          items: ai.data.growthRoadmap30Day.phase4Days22To30,
                        },
                      ].map((p, pIdx) => (
                        <div
                          key={pIdx}
                          className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5"
                        >
                          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                            <span className="font-semibold text-slate-200">{p.phase}</span>
                            <span className="text-[10px] font-mono text-cyan-400">{p.range}</span>
                          </div>
                          <div className="space-y-2">
                            {p.items?.map((m, mIdx) => (
                              <div
                                key={mIdx}
                                className="p-2 rounded bg-slate-900/70 border border-slate-800/80 text-[11px] space-y-1"
                              >
                                <div className="text-slate-200 leading-snug">{m.task}</div>
                                <Badge variant="outline" size="sm" className="text-[9px] uppercase tracking-wider text-slate-400">
                                  {m.targetDimension}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Local Ollama Offline / Unavailable State */
              <div className="p-6 rounded-2xl bg-slate-950 border border-amber-800/60 space-y-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-amber-200">
                      Local Ollama AI Interpretation Offline
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {ai?.unavailableReason ||
                        "SiteLens operates on a private, local-first architecture. The local Ollama daemon is currently not running on http://localhost:11434."}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                  <span className="font-medium text-slate-200 block">
                    To start local AI synthesis:
                  </span>
                  <code className="block p-2 rounded bg-slate-950 text-cyan-300 font-mono text-[11px]">
                    ollama run llama3:8b
                  </code>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2 text-xs text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>The deterministic audit report is 100% complete and unaffected.</span>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRetryAI}
                    isLoading={isRetryingAI}
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                    Retry AI Interpretation
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
