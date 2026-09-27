import React from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard — SiteLens AI",
  description: "Monitor website audit histories, health grades, and regression timelines.",
};

export default function DashboardPage() {
  return <DashboardShell />;
}
