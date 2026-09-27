import type {
  AnalysisCategory,
  BaseDimensionResult,
  IAnalyzer,
} from "../types/analysis";
import type { CrawledPageData } from "../types/crawler";

/**
 * Base abstract analyzer enforcing predictable result structures,
 * timing, error isolation, and status tracking across all analysis dimensions.
 */
export abstract class BaseAnalyzer<TResult extends BaseDimensionResult>
  implements IAnalyzer<TResult>
{
  abstract readonly category: AnalysisCategory;

  protected abstract runAnalysis(
    page: CrawledPageData
  ): Promise<
    Omit<TResult, keyof BaseDimensionResult> & {
      passedChecks: number;
      totalChecks: number;
      issues: TResult["issues"];
      metrics: TResult["metrics"];
    }
  >;

  async analyze(page: CrawledPageData): Promise<TResult> {
    const startTime = Date.now();

    try {
      const dimensionSpecificData = await this.runAnalysis(page);
      const executionTimeMs = Date.now() - startTime;

      const result = {
        category: this.category,
        status: "completed",
        executionTimeMs,
        ...dimensionSpecificData,
      } as TResult;

      return result;
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown analyzer failure";

      return {
        category: this.category,
        status: "failed",
        executionTimeMs,
        passedChecks: 0,
        totalChecks: 0,
        issues: [],
        metrics: {},
        error: errorMessage,
      } as unknown as TResult;
    }
  }
}
