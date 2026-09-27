"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { History, ExternalLink, ArrowRight, RefreshCw, AlertCircle } from "lucide-react";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import type { AuditHistorySummary } from "@/lib/types";

export function AuditHistoryTable() {
  const [history, setHistory] = useState<AuditHistorySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reports/history");
      if (!res.ok) throw new Error("Failed to load historical audits");
      const data = await res.json();
      setHistory(data.history || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching history");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center text-slate-400 text-xs">
        <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin text-cyan-400" />
        <span>Loading audit registry...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-800/40 bg-rose-950/20 p-6 text-xs text-rose-400 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
        <Button variant="outline" size="sm" onClick={fetchHistory}>
          Retry
        </Button>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No Recorded Audits"
        description="Your workspace has not executed any website audits yet. Enter a URL on the auditor page to generate your first baseline report."
        actionLabel="Start New Audit"
        onAction={() => {
          window.location.href = "/";
        }}
      />
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-lg">
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">Recent Audit Records</h3>
        <span className="text-xs font-mono text-slate-500">
          {history.length} {history.length === 1 ? "run" : "runs"}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/60 border-b border-slate-800 font-mono uppercase text-slate-500 text-[10px] tracking-wider">
            <tr>
              <th className="py-3 px-4">Target URL</th>
              <th className="py-3 px-4">Date & Time</th>
              <th className="py-3 px-4">Score</th>
              <th className="py-3 px-4">Grade</th>
              <th className="py-3 px-4">Issues Found</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {history.map((record) => (
              <tr key={record.id} className="hover:bg-slate-800/30 transition">
                <td className="py-3.5 px-4 font-mono font-medium text-slate-200 truncate max-w-xs">
                  {record.targetUrl}
                </td>
                <td className="py-3.5 px-4 text-slate-400 font-mono">
                  {new Date(record.createdAt).toLocaleDateString()}
                </td>
                <td className="py-3.5 px-4 font-mono font-bold text-cyan-400">
                  {record.overallScore}/100
                </td>
                <td className="py-3.5 px-4">
                  <Badge variant={record.overallGrade === "F" ? "error" : "info"}>
                    {record.overallGrade}
                  </Badge>
                </td>
                <td className="py-3.5 px-4 font-mono text-slate-400">
                  <span className="text-rose-400 font-semibold">{record.issuesCount.critical} crit</span> /{" "}
                  <span className="text-amber-400">{record.issuesCount.warning} warn</span>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <Link
                    href={`/reports/${record.id}`}
                    className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-medium"
                  >
                    <span>View Report</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
