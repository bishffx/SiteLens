"use client";

import React from "react";
import { HeroSection } from "@/components/landing/HeroSection";
import { UrlAuditInput } from "@/components/landing/UrlAuditInput";
import { FeatureOverview } from "@/components/landing/FeatureOverview";
import { AnalysisCategories } from "@/components/landing/AnalysisCategories";
import { HowItWorks } from "@/components/landing/HowItWorks";

export default function HomePage() {
  return (
    <div className="space-y-4">
      {/* Hero & URL Input Section */}
      <section className="relative overflow-hidden pt-4 pb-8">
        <HeroSection />
        <UrlAuditInput />
      </section>

      {/* Feature Overview */}
      <FeatureOverview />

      {/* 6 Analysis Categories Breakdown */}
      <AnalysisCategories />

      {/* Technical Pipeline: How SiteLens Works */}
      <HowItWorks />
    </div>
  );
}
