import type { SiteLensAuditReport } from '@/lib/types/reports';
import type { Roadmap, RoadmapTask, RoadmapWeek } from '@/lib/types/roadmap';
import { generateAuditId } from '@/lib/utils/id-generator';

/**
 * Generate a 30‑day improvement roadmap from a SiteLens audit report.
 * The roadmap groups issues into four weekly themes.
 * It does NOT fabricate any data – every task originates from a real issue.
 */
export function buildRoadmapFromReport(report: SiteLensAuditReport): Roadmap {
  const issues = report.analysis.allIssues ?? [];

  // Helper to map severity to priority (lower number = higher priority)
  const severityPriority: Record<string, number> = {
    critical: 1,
    warning: 2,
    info: 3,
    none: 4,
  };

  // Helper to guess estimated effort based on severity
  const effortMap: Record<string, string> = {
    critical: '1‑2 days',
    warning: '2‑3 days',
    info: '1 day',
    none: '1 day',
  };

  const weeks: RoadmapWeek[] = [
    { week: 1, title: 'Critical fixes', tasks: [] },
    { week: 2, title: 'Structural improvements', tasks: [] },
    { week: 3, title: 'Content and UX improvements', tasks: [] },
    { week: 4, title: 'Optimization and measurement', tasks: [] },
  ];

  for (const iss of issues) {
    // Determine week based on category and severity
    let targetWeek = 4; // default to week 4 (optimisation)
    const cat = iss.category?.toLowerCase();
    const sev = iss.severity?.toLowerCase();

    if (sev === 'critical' || sev === 'warning') {
      // Critical / warning issues that affect SEO or accessibility go to week 1
      if (cat === 'seo' || cat === 'accessibility') {
        targetWeek = 1;
      } else if (cat === 'performance') {
        targetWeek = 4;
      } else if (cat === 'content' || cat === 'mobile' || cat === 'ux') {
        targetWeek = 2;
      }
    } else if (cat === 'seo' || cat === 'accessibility' || cat === 'content') {
      targetWeek = 2;
    } else if (cat === 'mobile' || cat === 'ux') {
      targetWeek = 3;
    } else if (cat === 'performance') {
      targetWeek = 4;
    }

    const task: RoadmapTask = {
      id: iss.id,
      task: iss.title ?? `Address ${iss.id}`,
      reason: iss.explanation ?? 'No explanation provided',
      affectedCategory: cat ?? 'unknown',
      priority: severityPriority[sev] ?? 5,
      estimatedEffort: effortMap[sev] ?? '1 day',
      evidence: typeof iss.evidence === 'string' ? iss.evidence : iss.evidence ? JSON.stringify(iss.evidence) : 'No evidence supplied',
      status: 'not_started',
    };

    const weekObj = weeks.find((w) => w.week === targetWeek);
    weekObj?.tasks.push(task);
  }

  return {
    reportId: report.id,
    generatedAt: new Date().toISOString(),
    weeks,
  };
}
