/**
 * Established axe-core Engine Runner for SiteLens AI.
 * Injects axe-core (4.13.0) into the live Playwright browser context to perform
 * real DOM & computed style accessibility audits (including color contrast).
 * Distinguishes 'automatically detectable' violations from 'requires manual review' incomplete items.
 */

import type {
  AccessibilityFinding,
  AccessibilityPassedRule,
  AccessibilitySeverity,
} from "./types";
import { runStaticAccessibilityAudit } from "./static-fallback";

export interface AxeRunnerExecutionResult {
  engineName: "axe-core" | "sitelens-dom-audit";
  engineVersion: string;
  isAvailable: boolean;
  findings: AccessibilityFinding[];
  passedRules: AccessibilityPassedRule[];
  inapplicableRulesCount: number;
  error?: string | null;
}

export interface AxeRunnerOptions {
  timeoutMs?: number;
  skipBrowser?: boolean;
}

export class AxeRunner {
  private defaultTimeoutMs: number;

  constructor(defaultTimeoutMs = 25000) {
    this.defaultTimeoutMs = defaultTimeoutMs;
  }

  /**
   * Runs an accessibility audit on the page.
   * If browser execution is available, injects axe-core into Chromium.
   * If browser execution fails or is skipped, falls back to the deterministic static analyzer.
   */
  async runAudit(
    targetUrl: string,
    html: string,
    options?: AxeRunnerOptions
  ): Promise<AxeRunnerExecutionResult> {
    if (options?.skipBrowser) {
      const staticRes = runStaticAccessibilityAudit(html, targetUrl);
      return {
        engineName: "sitelens-dom-audit",
        engineVersion: "1.0.0",
        isAvailable: true,
        findings: staticRes.findings,
        passedRules: staticRes.passedRules,
        inapplicableRulesCount: staticRes.inapplicableRulesCount,
        error: null,
      };
    }

    const timeoutMs = options?.timeoutMs ?? this.defaultTimeoutMs;

    let timerId: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timerId = setTimeout(() => {
        reject(new Error(`Accessibility audit timed out after ${timeoutMs / 1000}s`));
      }, timeoutMs);
    });

    try {
      const auditPromise = this.executeAxeInBrowser(targetUrl, html);
      const result = await Promise.race([auditPromise, timeoutPromise]);
      return result;
    } catch (err) {
      // Fall back to static DOM audit on timeout or browser launch failure
      const staticRes = runStaticAccessibilityAudit(html, targetUrl);
      return {
        engineName: "sitelens-dom-audit",
        engineVersion: "1.0.0 (fallback)",
        isAvailable: true,
        findings: staticRes.findings,
        passedRules: staticRes.passedRules,
        inapplicableRulesCount: staticRes.inapplicableRulesCount,
        error: err instanceof Error ? err.message : String(err),
      };
    } finally {
      if (timerId) {
        clearTimeout(timerId);
      }
    }
  }

  private async executeAxeInBrowser(
    targetUrl: string,
    html: string
  ): Promise<AxeRunnerExecutionResult> {
    const { chromium } = await import("playwright");
    const axe = await import("axe-core");

    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });

    const page = await context.newPage();

    try {
      // Navigate or load page content
      try {
        await page.goto(targetUrl, {
          timeout: 15000,
          waitUntil: "domcontentloaded",
        });
      } catch {
        // If live navigation fails, populate page from crawled HTML
        await page.setContent(html, {
          timeout: 10000,
          waitUntil: "domcontentloaded",
        });
      }

      // Inject axe-core bundle into page
      await page.evaluate(axe.source);

      // Execute axe audit
      interface RawAxeNode {
        target: string[];
        html: string;
        failureSummary?: string;
      }

      interface RawAxeRuleResult {
        id: string;
        impact?: "critical" | "serious" | "moderate" | "minor" | null;
        description: string;
        help: string;
        helpUrl?: string;
        tags: string[];
        nodes: RawAxeNode[];
      }

      interface RawAxeOutput {
        violations: RawAxeRuleResult[];
        incomplete: RawAxeRuleResult[];
        passes: Array<{ id: string; description: string; helpUrl?: string }>;
        inapplicable: unknown[];
      }

      const rawResults = await page.evaluate(async (): Promise<RawAxeOutput> => {
        // @ts-expect-error - axe injected via evaluate
        return await window.axe.run({
          runOnly: {
            type: "tag",
            values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"],
          },
        });
      });

      const findings: AccessibilityFinding[] = [];

      // 1. Process Violations -> "automatically_detectable"
      for (const v of rawResults.violations) {
        const severity: AccessibilitySeverity =
          v.impact === "critical" || v.impact === "serious"
            ? "critical"
            : v.impact === "moderate"
            ? "warning"
            : "info";

        findings.push({
          id: `a11y_${v.id.replace(/-/g, "_")}`,
          engineRuleId: v.id,
          type: "automatically_detectable",
          severity,
          rawImpact: v.impact || null,
          category: "accessibility",
          title: v.help || v.description,
          explanation: v.description,
          recommendation: `Fix all occurrences: ${v.nodes[0]?.failureSummary || v.help}`,
          wcagTags: v.tags || [],
          helpUrl: v.helpUrl,
          nodes: v.nodes.map((n) => ({
            target: n.target,
            html: n.html,
            failureSummary: n.failureSummary,
          })),
          evidence: {
            affectedElementsCount: v.nodes.length,
            sampleSelectors: v.nodes.slice(0, 3).flatMap((n) => n.target),
            sampleSnippets: v.nodes.slice(0, 3).map((n) => n.html),
            failureDetails: v.nodes[0]?.failureSummary,
          },
        });
      }

      // 2. Process Incomplete -> "requires_manual_review"
      for (const inc of rawResults.incomplete) {
        const severity: AccessibilitySeverity =
          inc.impact === "critical" || inc.impact === "serious"
            ? "warning"
            : "info";

        findings.push({
          id: `a11y_review_${inc.id.replace(/-/g, "_")}`,
          engineRuleId: inc.id,
          type: "requires_manual_review",
          severity,
          rawImpact: inc.impact || null,
          category: "accessibility",
          title: `Manual Review Required: ${inc.help || inc.description}`,
          explanation: `${inc.description} Automated inspection detected ambiguous context that cannot be fully verified without human or assistive evaluation.`,
          recommendation: inc.helpUrl
            ? `Review criteria guidelines at: ${inc.helpUrl}`
            : "Perform manual accessibility review with screen reader or keyboard navigation.",
          wcagTags: inc.tags || [],
          helpUrl: inc.helpUrl,
          nodes: inc.nodes.map((n) => ({
            target: n.target,
            html: n.html,
            failureSummary: n.failureSummary,
          })),
          evidence: {
            affectedElementsCount: inc.nodes.length,
            sampleSelectors: inc.nodes.slice(0, 3).flatMap((n) => n.target),
            sampleSnippets: inc.nodes.slice(0, 3).map((n) => n.html),
            failureDetails: inc.nodes[0]?.failureSummary || "Context requires human verification",
          },
        });
      }

      return {
        engineName: "axe-core",
        engineVersion: axe.version || "4.13.0",
        isAvailable: true,
        findings,
        passedRules: rawResults.passes.map((p) => ({
          id: p.id,
          description: p.description,
          helpUrl: p.helpUrl,
        })),
        inapplicableRulesCount: rawResults.inapplicable.length,
        error: null,
      };
    } finally {
      await page.close().catch(() => {});
      await context.close().catch(() => {});
      await browser.close().catch(() => {});
    }
  }
}

export const defaultAxeRunner = new AxeRunner();
