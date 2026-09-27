import type {
  AnalysisCategory,
  CentralAnalysisResult,
  IAnalyzer,
  BaseDimensionResult,
  AnalysisIssue,
  SEOAnalysisResult,
  PerformanceAnalysisResult,
  AccessibilityAnalysisResult,
  ContentAnalysisResult,
  MobileAnalysisResult,
  UXAnalysisResult,
} from "../types/analysis";
import type { CrawledPageData } from "../types/crawler";
import { SEOAnalyzer } from "./seo-analyzer";
import { PerformanceAnalyzer } from "./performance-analyzer";
import { AccessibilityAnalyzer } from "./accessibility-analyzer";
import { ContentAnalyzer } from "./content-analyzer";
import { MobileAnalyzer } from "./mobile-analyzer";
import { UXAnalyzer } from "./ux-analyzer";

/**
 * Registry to register, filter, and coordinate analyzers cleanly.
 */
export class AnalyzerRegistry {
  private analyzers: Map<AnalysisCategory, IAnalyzer<BaseDimensionResult>> = new Map();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults() {
    this.register(new SEOAnalyzer());
    this.register(new PerformanceAnalyzer());
    this.register(new AccessibilityAnalyzer());
    this.register(new ContentAnalyzer());
    this.register(new MobileAnalyzer());
    this.register(new UXAnalyzer());
  }

  register(analyzer: IAnalyzer<BaseDimensionResult>) {
    this.analyzers.set(analyzer.category, analyzer);
  }

  async runAll(
    page: CrawledPageData,
    enabledCategories: AnalysisCategory[] = ["seo", "performance", "accessibility", "content", "mobile", "ux"]
  ): Promise<CentralAnalysisResult> {
    const startTime = Date.now();
    const allIssues: AnalysisIssue[] = [];

    const activeAnalyzers = enabledCategories
      .map((cat) => this.analyzers.get(cat))
      .filter((a): a is IAnalyzer<BaseDimensionResult> => a !== undefined);

    const results = await Promise.all(
      activeAnalyzers.map(async (analyzer) => {
        const result = await analyzer.analyze(page);
        return { category: analyzer.category, result };
      })
    );

    let seo: SEOAnalysisResult | undefined;
    let performance: PerformanceAnalysisResult | undefined;
    let accessibility: AccessibilityAnalysisResult | undefined;
    let content: ContentAnalysisResult | undefined;
    let mobile: MobileAnalysisResult | undefined;
    let ux: UXAnalysisResult | undefined;

    for (const item of results) {
      allIssues.push(...item.result.issues);
      switch (item.category) {
        case "seo":
          seo = item.result as SEOAnalysisResult;
          break;
        case "performance":
          performance = item.result as PerformanceAnalysisResult;
          break;
        case "accessibility":
          accessibility = item.result as AccessibilityAnalysisResult;
          break;
        case "content":
          content = item.result as ContentAnalysisResult;
          break;
        case "mobile":
          mobile = item.result as MobileAnalysisResult;
          break;
        case "ux":
          ux = item.result as UXAnalysisResult;
          break;
      }
    }

    return {
      analyzedUrl: page.url,
      timestamp: new Date().toISOString(),
      seo,
      performance,
      accessibility,
      content,
      mobile,
      ux,
      allIssues,
      executionTimeMs: Date.now() - startTime,
    };
  }
}
