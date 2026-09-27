import { buildAuditReport } from '@/lib/reports/report-builder';
import { defaultReportStorage, defaultComparisonEngine } from '@/lib/reports';
import type { SiteLensAuditReport } from '@/lib/types/reports';
import { describe, it, before } from 'node:test';
import assert from 'node:assert';

// Helper to create a minimal report with custom scores and issues
function createMockReport(overrides: Partial<SiteLensAuditReport> = {}): SiteLensAuditReport {
  const base = buildAuditReport({
    targetUrl: 'https://example.com/page',
    durationMs: 100,
    scores: {
      overallScore: 80,
      overallGrade: 'B',
      categories: {
        seo: { category: 'seo', score: 85, grade: 'A', passedChecks: 5, warningChecks: 1, failedChecks: 0, unavailableChecks: 0, totalChecks: 6, evaluableChecks: 6, totalIssues: 1, criticalIssues: 0, warningIssues: 1, infoIssues: 0, weight: 1, isAvailable: true, deductions: [] },
        performance: { category: 'performance', score: 75, grade: 'B', passedChecks: 4, warningChecks: 2, failedChecks: 0, unavailableChecks: 0, totalChecks: 6, evaluableChecks: 6, totalIssues: 2, criticalIssues: 0, warningIssues: 2, infoIssues: 0, weight: 1, isAvailable: true, deductions: [] },
        accessibility: { category: 'accessibility', score: 90, grade: 'A', passedChecks: 6, warningChecks: 0, failedChecks: 0, unavailableChecks: 0, totalChecks: 6, evaluableChecks: 6, totalIssues: 0, criticalIssues: 0, warningIssues: 0, infoIssues: 0, weight: 1, isAvailable: true, deductions: [] },
        content: { category: 'content', score: 70, grade: 'C', passedChecks: 3, warningChecks: 2, failedChecks: 1, unavailableChecks: 0, totalChecks: 6, evaluableChecks: 6, totalIssues: 3, criticalIssues: 1, warningIssues: 2, infoIssues: 0, weight: 1, isAvailable: true, deductions: [] },
        mobile: { category: 'mobile', score: 78, grade: 'B', passedChecks: 5, warningChecks: 1, failedChecks: 0, unavailableChecks: 0, totalChecks: 6, evaluableChecks: 6, totalIssues: 1, criticalIssues: 0, warningIssues: 1, infoIssues: 0, weight: 1, isAvailable: true, deductions: [] },
        ux: { category: 'ux', score: 82, grade: 'B', passedChecks: 4, warningChecks: 1, failedChecks: 1, unavailableChecks: 0, totalChecks: 6, evaluableChecks: 6, totalIssues: 2, criticalIssues: 0, warningIssues: 1, infoIssues: 1, weight: 1, isAvailable: true, deductions: [] },
      },
      dimensionScores: {} as any, // unused in tests
      summary: {
        totalChecks: 36,
        passedChecks: 27,
        warningChecks: 5,
        failedChecks: 2,
        unavailableChecks: 0,
        totalIssues: 7,
        criticalIssues: 1,
        warningIssues: 5,
        infoIssues: 1,
      },
      weightsApplied: { seo: 1, performance: 1, accessibility: 1, content: 1, mobile: 1, ux: 1 },
      scoringMethod: 'deterministic_weighted_proportional',
      calculatedAt: new Date().toISOString(),
      disclaimer: '',
    },
    analysis: {
      analyzedUrl: 'https://example.com',
      timestamp: new Date().toISOString(),
      executionTimeMs: 100,
      allIssues: [], // will be overwritten below
    },
  });

  // Inject simple issues for categories
  base.analysis.allIssues = [
    { id: 'ISS1', title: 'Missing alt', category: 'seo', severity: 'warning', description: '', recommendation: '', impactScoreDeduction: 0 },
    { id: 'ISS2', title: 'Slow LCP', category: 'performance', severity: 'warning', description: '', recommendation: '', impactScoreDeduction: 0 },
    { id: 'ISS3', title: 'Low contrast', category: 'accessibility', severity: 'critical', description: '', recommendation: '', impactScoreDeduction: 0 },
  ];

  return { ...base, ...overrides } as SiteLensAuditReport;
}

describe('Historical report comparison', () => {
  let baseline: SiteLensAuditReport;
  let newer: SiteLensAuditReport;

  before(async () => {
    baseline = createMockReport();
    baseline.scores.overallScore = 78;
    baseline.scores.overallGrade = 'C';

    newer = createMockReport({
      analysis: {
        analyzedUrl: 'https://example.com',
        timestamp: new Date().toISOString(),
        executionTimeMs: 100,
        allIssues: [
          { id: 'ISS2', title: 'Slow LCP', category: 'performance', severity: 'warning', description: '', recommendation: '', impactScoreDeduction: 0 },
          { id: 'ISS4', title: 'New SEO issue', category: 'seo', severity: 'critical', description: '', recommendation: '', impactScoreDeduction: 0 },
        ],
      },
    });
    newer.scores.overallScore = 85;
    newer.scores.overallGrade = 'B';

    await defaultReportStorage.saveReport(baseline);
    await defaultReportStorage.saveReport(newer);
  });

  it('should compute comparison correctly', async () => {
    const comparison = defaultComparisonEngine.compare(baseline, newer);
    assert.strictEqual(comparison.overallScoreBefore, baseline.scores.overallScore);
    assert.strictEqual(comparison.overallScoreAfter, newer.scores.overallScore);
    assert.strictEqual(comparison.overallScoreDelta, newer.scores.overallScore - baseline.scores.overallScore);
    // Resolved Issues should contain ISS1 (missing in newer)
    assert.strictEqual(comparison.resolvedIssues.some((i) => i.id === 'ISS1'), true);
    // New Issues should contain ISS4
    assert.strictEqual(comparison.newIssues.some((i) => i.id === 'ISS4'), true);
    // Persisting Issues should contain ISS2
    assert.strictEqual(comparison.persistingIssues.some((i) => i.id === 'ISS2'), true);
    // Dimension delta for seo should reflect score change
    const seoDim = comparison.dimensions.find((d) => d.category === 'seo');
    assert.strictEqual(seoDim?.scoreDelta, newer.scores.categories.seo.score - baseline.scores.categories.seo.score);
  });
});
