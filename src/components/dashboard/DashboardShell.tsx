"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Layers,
  Activity,
  BarChart3,
  Plus,
  Server,
  Sparkles,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";
import { AuditHistoryTable } from "./AuditHistoryTable";
import type { AuditHistorySummary } from "@/lib/types";

export function DashboardShell() {
  const [history, setHistory] = useState<AuditHistorySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reports/history")
      .then((res) => (res.ok ? res.json() : { history: [] }))
      .then((data) => {
        setHistory(data.history || []);
      })
      .catch(() => {
        setHistory([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const totalAudits = history.length;
  const averageScore =
    totalAudits > 0
      ? Math.round(
          history.reduce((sum, h) => sum + h.overallScore, 0) / totalAudits
        )
      : null;
  const uniqueTargets = new Set(history.map((h) => h.targetUrl)).size;

  const averageGrade =
    averageScore === null
      ? null
      : averageScore >= 95
      ? "A+"
      : averageScore >= 85
      ? "A"
      : averageScore >= 70
      ? "B"
      : averageScore >= 55
      ? "C"
      : averageScore >= 40
      ? "D"
      : "F";

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline">Engine Dashboard</Badge>
            <span className="text-xs font-mono text-slate-500">
              Deterministic & Local AI Analytics
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Audit Workspace
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Overview of historical website evaluations, health trajectories, and monitored targets.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/reports">
            <Button variant="outline" size="md">
              <Layers className="w-4 h-4 mr-1.5" />
              All Reports
            </Button>
          </Link>
          <Link href="/">
            <Button variant="primary" size="md">
              <Plus className="w-4 h-4 mr-1.5" />
              New Website Audit
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary KPI Metric Cards (Real Computed Data) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Audits */}
        <Card className="p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase font-mono tracking-wider">
              Total Audits Run
            </span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">
            {isLoading ? (
              <span className="inline-block w-8 h-7 bg-slate-800 rounded animate-pulse" />
            ) : (
              totalAudits
            )}
          </div>
          <p className="text-[11px] text-slate-500">
            {totalAudits === 0
              ? "No audits executed yet"
              : `${totalAudits} verified audit ${totalAudits === 1 ? "run" : "runs"}`}
          </p>
        </Card>

        {/* Card 2: Average Health Score */}
        <Card className="p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase font-mono tracking-wider">
              Average Health Score
            </span>
            <BarChart3 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-100">
              {isLoading ? (
                <span className="inline-block w-16 h-7 bg-slate-800 rounded animate-pulse" />
              ) : averageScore !== null ? (
                `${averageScore}/100`
              ) : (
                "—"
              )}
            </span>
            {averageGrade && (
              <Badge
                variant={
                  averageGrade === "A+" || averageGrade === "A"
                    ? "success"
                    : averageGrade === "B"
                    ? "info"
                    : averageGrade === "C"
                    ? "warning"
                    : "error"
                }
                size="sm"
              >
                Grade {averageGrade}
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-slate-500">
            {averageScore !== null
              ? "Calculated from all completed runs"
              : "Pending initial audit"}
          </p>
        </Card>

        {/* Card 3: Monitored Targets */}
        <Card className="p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase font-mono tracking-wider">
              Monitored Targets
            </span>
            <Layers className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">
            {isLoading ? (
              <span className="inline-block w-8 h-7 bg-slate-800 rounded animate-pulse" />
            ) : (
              uniqueTargets
            )}
          </div>
          <p className="text-[11px] text-slate-500">
            {uniqueTargets === 0
              ? "0 unique website targets"
              : `${uniqueTargets} distinct target ${uniqueTargets === 1 ? "domain" : "domains"}`}
          </p>
        </Card>

        {/* Card 4: Engine Status */}
        <Card className="p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase font-mono tracking-wider">
              Engine Status
            </span>
            <Server className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 text-lg flex items-center gap-1.5 pt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Deterministic Ready
          </div>
          <p className="text-[11px] text-slate-500">
            Playwright + Cheerio + Local Ollama
          </p>
        </Card>
      </div>

      {/* Historical Audits Table with Empty State */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-200">
            Audit History & Regression Log
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            Persistent Registry
          </span>
        </div>

        <AuditHistoryTable />
      </div>
    </div>
  );
}
