import type { SiteLensAuditReport, AuditComparisonResult, DimensionComparison } from '@/lib/types/reports';
import type { AnalysisCategory } from '@/lib/types/analysis';

/**
 * Compare two SiteLens audit reports for the same normalized URL.
 * Returns a full AuditComparisonResult containing score deltas, grade changes,
 * per‑dimension changes, and lists of resolved / new / persisting issues.
 *
 * The function is deterministic – it only uses the data present in the reports.
 * If the reports belong to different URLs a comparison is not performed and
 * `null` is returned.
 */
export function compareReports(baseline: SiteLensAuditReport, current: SiteLensAuditReport): AuditComparisonResult | null {
  // Ensure both reports refer to the same target (normalized URL)
  if (baseline.normalizedUrl !== current.normalizedUrl) {
    return null;
  }

  const dimensions: DimensionComparison[] = [];
  const categories: AnalysisCategory[] = [
    'seo',
    'performance',
    'accessibility',
    'content',
    'mobile',
    'ux',
  ];

  // Helper to collect issue IDs per category
  const collectIds = (issues: any[]) => {
    const map = new Map<string, any>();
    for (const iss of issues) {
      if (iss.id) map.set(iss.id, iss);
    }
    return map;
  };

  const baselineIssueMap = collectIds(baseline.analysis.allIssues ?? []);
  const currentIssueMap = collectIds(current.analysis.allIssues ?? []);

  // Determine issue groups globally (used for the three top‑level arrays)
  const resolvedIssues: Array<{ id: string; title: string; category: string; severity: string }> = [];
  const newIssues: Array<{ id: string; title: string; category: string; severity: string }> = [];
  const persistingIssues: Array<{ id: string; title: string; category: string; severity: string }> = [];

  for (const [id, basIss] of baselineIssueMap.entries()) {
    if (!currentIssueMap.has(id)) {
      resolvedIssues.push({
        id,
        title: basIss.title,
        category: basIss.category,
        severity: basIss.severity,
      });
    } else {
      const curIss = currentIssueMap.get(id);
      persistingIssues.push({
        id,
        title: curIss.title,
        category: curIss.category,
        severity: curIss.severity,
      });
    }
  }

  for (const [id, curIss] of currentIssueMap.entries()) {
    if (!baselineIssueMap.has(id)) {
      newIssues.push({
        id,
        title: curIss.title,
        category: curIss.category,
        severity: curIss.severity,
      });
    }
  }

  // Per‑dimension comparison
  for (const cat of categories) {
    const baseScore = baseline.scores.categories[cat]?.score ?? 0;
    const curScore = current.scores.categories[cat]?.score ?? 0;
    const scoreDelta = curScore - baseScore;

    // Count issues per category for resolved / new
    const baseCatIssues = (baseline.analysis.allIssues ?? []).filter((i) => i.category === cat);
    const curCatIssues = (current.analysis.allIssues ?? []).filter((i) => i.category === cat);

    const baseIds = new Set(baseCatIssues.map((i) => i.id));
    const curIds = new Set(curCatIssues.map((i) => i.id));

    const resolvedCount = [...baseIds].filter((id) => !curIds.has(id)).length;
    const newCount = [...curIds].filter((id) => !baseIds.has(id)).length;

    dimensions.push({
      category: cat,
      scoreBefore: baseScore,
      scoreAfter: curScore,
      scoreDelta,
      resolvedIssuesCount: resolvedCount,
      newIssuesCount: newCount,
    });
  }

  return {
    comparisonId: `${baseline.id}~${current.id}`,
    url: baseline.targetUrl,
    baselineAuditId: baseline.id,
    currentAuditId: current.id,
    baselineDate: baseline.createdAt,
    currentDate: current.createdAt,
    overallScoreBefore: baseline.scores.overallScore,
    overallScoreAfter: current.scores.overallScore,
    overallScoreDelta: current.scores.overallScore - baseline.scores.overallScore,
    gradeBefore: baseline.scores.overallGrade,
    gradeAfter: current.scores.overallGrade,
    dimensions,
    resolvedIssues,
    newIssues,
    persistingIssues,
  };
}
