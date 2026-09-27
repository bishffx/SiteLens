import React from "react";
import { ReportShell } from "@/components/reports/ReportShell";
import type { Metadata } from "next";

interface ReportDetailPageProps {
  params: {
    id: string;
  };
}

export function generateMetadata({ params }: ReportDetailPageProps): Metadata {
  return {
    title: `Audit Report ${params.id} — SiteLens AI`,
    description: `Technical audit findings and scores for run ${params.id}.`,
  };
}

export default function ReportDetailPage({ params }: ReportDetailPageProps) {
  return <ReportShell reportId={params.id} />;
}
