import React from "react";
import { ReportShell } from "@/components/reports/ReportShell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Audit Reports — SiteLens AI",
  description: "Detailed findings, scoring breakdowns, and actionable remediation plans.",
};

export default function ReportsPage() {
  return <ReportShell />;
}
