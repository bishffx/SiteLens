import type {
  AuditComparisonResult,
  DimensionComparison,
  SiteLensAuditReport,
} from "../types/reports";
import type { AnalysisCategory } from "../types/analysis";
import { generateComparisonId } from "../utils/id-generator";
import { calculateDelta } from "../utils/math";

export class ComparisonEngine {
  compare(
    baselineReport: SiteLensAuditReport,
    currentReport: SiteLensAuditReport
  ): AuditComparisonResult {
    const categories: AnalysisCategory[] = [
      "seo",
      "performance",
      "accessibility",
      "content",
      "mobile",
      "ux",
    ];

    const baselineIssues = baselineReport.analysis.allIssues || [];
    const currentIssues = currentReport.analysis.allIssues || [];

    const baselineIssueIds = new Set(baselineIssues.map((i) => i.id));
    const currentIssueIds = new Set(currentIssues.map((i) => i.id));

    // Resolved issues: in baseline, but not in current
    const resolvedIssues = baselineIssues
      .filter((i) => !currentIssueIds.has(i.id))
      .map((i) => ({
        id: i.id,
        title: i.title,
        category: i.category,
        severity: i.severity,
      }));

    // New issues: in current, but not in baseline
    const newIssues = currentIssues
      .filter((i) => !baselineIssueIds.has(i.id))
      .map((i) => ({
        id: i.id,
        title: i.title,
        category: i.category,
        severity: i.severity,
      }));

    // Persisting issues: in both
    const persistingIssues = currentIssues
      .filter((i) => baselineIssueIds.has(i.id))
      .map((i) => ({
        id: i.id,
        title: i.title,
        category: i.category,
        severity: i.severity,
      }));

    const dimensions: DimensionComparison[] = categories.map((cat) => {
      const scoreBefore =
        baselineReport.scores.dimensionScores?.[cat]?.score ??
        baselineReport.scores.categories?.[cat]?.score ??
        0;
      const scoreAfter =
        currentReport.scores.dimensionScores?.[cat]?.score ??
        currentReport.scores.categories?.[cat]?.score ??
        0;
      const delta = calculateDelta(scoreAfter, scoreBefore);

      const catResolved = resolvedIssues.filter((i) => i.category === cat).length;
      const catNew = newIssues.filter((i) => i.category === cat).length;

      return {
        category: cat,
        scoreBefore,
        scoreAfter,
        scoreDelta: delta,
        resolvedIssuesCount: catResolved,
        newIssuesCount: catNew,
      };
    });

    const overallScoreBefore = baselineReport.scores.overallScore;
    const overallScoreAfter = currentReport.scores.overallScore;
    const overallScoreDelta = calculateDelta(overallScoreAfter, overallScoreBefore);

    return {
      comparisonId: generateComparisonId(),
      url: currentReport.targetUrl,
      baselineAuditId: baselineReport.id,
      currentAuditId: currentReport.id,
      baselineDate: baselineReport.createdAt,
      currentDate: currentReport.createdAt,
      overallScoreBefore,
      overallScoreAfter,
      overallScoreDelta,
      gradeBefore: baselineReport.scores.overallGrade,
      gradeAfter: currentReport.scores.overallGrade,
      dimensions,
      resolvedIssues,
      newIssues,
      persistingIssues,
    };
  }
}

export const defaultComparisonEngine = new ComparisonEngine();
