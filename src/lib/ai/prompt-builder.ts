/**
 * Structured Prompt Builder for SiteLens Local AI (Ollama).
 * Converts deterministic analyzer outputs and scores into strongly-grounded prompts.
 * Strictly forbids hallucinations, score modification, and fabricated metrics.
 */

import type { AIInterpretationRequest } from "../types/ai";

export function buildAuditAnalysisPrompt(request: AIInterpretationRequest): string {
  const { url, scores, topIssues } = request;

  // Format dimension breakdown
  const dimensions = scores.categories
    ? Object.entries(scores.categories)
        .map(
          ([cat, data]) =>
            `- ${cat.toUpperCase()}: ${data.score}/100 (Grade ${data.grade}, ${data.passedChecks} passed, ${data.failedChecks} failed, ${data.unavailableChecks} N/A)`
        )
        .join("\n")
    : "No dimension scores available.";

  // Format top issues with concrete evidence
  const issuesList =
    topIssues.length > 0
      ? topIssues
          .slice(0, 15)
          .map((iss, idx) => {
            let details = `${idx + 1}. [${iss.category.toUpperCase()}] [${iss.severity.toUpperCase()}] ${iss.title}: ${iss.description}`;
            if (iss.recommendation) {
              details += ` | Suggested Fix: ${iss.recommendation}`;
            }
            return details;
          })
          .join("\n")
      : "All evaluated technical checks passed with zero critical violations.";

  return `You are SiteLens AI, an expert technical website auditor and engineering strategist.

Your role is to interpret the following real, measured audit data for: ${url}

==================== AUDIT MEASUREMENTS & DETERMINISTIC SCORES ====================
OVERALL QUALITY SCORE: ${scores.overallScore}/100 (Grade ${scores.overallGrade})
SUMMARY: ${scores.summary.passedChecks} Checks Passed, ${scores.summary.warningChecks} Warnings, ${scores.summary.failedChecks} Failed, ${scores.summary.unavailableChecks} Excluded/Unavailable
EVALUATED ISSUES: ${scores.summary.totalIssues} (${scores.summary.criticalIssues} critical, ${scores.summary.warningIssues} warning, ${scores.summary.infoIssues} info)

DIMENSION SCORES:
${dimensions}

DETECTED TECHNICAL FINDINGS:
${issuesList}
===================================================================================

STRICT GROUNDING & ANTI-HALLUCINATION RULES:
1. Do NOT invent audit results, checks, or findings that were not provided in the data above.
2. Do NOT change, alter, recalculate, or contradict the deterministic scores.
3. Do NOT claim measurements that were not provided.
4. Do NOT fabricate traffic numbers (e.g. "you will gain 50,000 visitors").
5. Do NOT fabricate revenue or dollar amounts (e.g. "this will yield $100,000").
6. Do NOT invent competitor names or compare against imaginary websites.
7. Do NOT fabricate customer data.
8. Do NOT claim that the website was manually reviewed by humans; this was performed via automated browser measurements.

Respond ONLY with a valid JSON object matching this exact structure:
{
  "executiveSummary": "Concise 2-3 sentence technical summary of site health based strictly on the scores and findings above.",
  "prioritizedExplanations": [
    {
      "id": "exp-1",
      "category": "seo|performance|accessibility|content|mobile|ux",
      "severity": "critical|warning|info",
      "title": "Issue title from findings",
      "explanation": "Clear explanation of why this measurable issue matters technically",
      "priority": 1
    }
  ],
  "businessImpactInterpretation": {
    "technicalDebtSummary": "Objective summary of engineering/code maintainability debt based on detected findings",
    "userExperienceImpact": "Observable UX barriers (e.g. slow load, overflow, unlabelled inputs)",
    "searchVisibilityImpact": "Technical indexing barriers (e.g. canonicals, metadata, indexability signals)",
    "conversionFriction": "Friction points for users attempting to take action on the page"
  },
  "actionableRecommendations": [
    {
      "id": "rec-1",
      "category": "seo|performance|accessibility|content|mobile|ux",
      "title": "Clear action title",
      "technicalGuidance": "Direct, concrete engineering instructions on how to resolve the issue",
      "priority": "high|medium|low"
    }
  ],
  "quickWins": [
    {
      "title": "Quick win title (resolvable in 1-3 days)",
      "impact": "Concrete technical improvement",
      "effort": "quick-fix",
      "guidance": "Exact fix steps"
    }
  ],
  "mediumTermImprovements": [
    {
      "title": "Medium term improvement (1-2 weeks)",
      "impact": "Architectural or structural improvement",
      "effort": "moderate",
      "guidance": "Implementation guidance"
    }
  ],
  "longerTermImprovements": [
    {
      "title": "Longer term initiative (2-4 weeks)",
      "impact": "Strategic performance or infrastructure enhancement",
      "effort": "significant",
      "guidance": "Implementation guidance"
    }
  ],
  "growthRoadmap30Day": {
    "phase1Days1To7": [
      { "dayRange": "Days 1-7", "task": "Task description for critical fixes", "targetDimension": "performance|seo|accessibility|content|mobile|ux" }
    ],
    "phase2Days8To14": [
      { "dayRange": "Days 8-14", "task": "Task description for high priority optimizations", "targetDimension": "performance|seo|accessibility|content|mobile|ux" }
    ],
    "phase3Days15To21": [
      { "dayRange": "Days 15-21", "task": "Task description for content & UX refinements", "targetDimension": "performance|seo|accessibility|content|mobile|ux" }
    ],
    "phase4Days22To30": [
      { "dayRange": "Days 22-30", "task": "Task description for testing & monitoring", "targetDimension": "performance|seo|accessibility|content|mobile|ux" }
    ]
  }
}

OUTPUT VALID JSON ONLY. NO MARKDOWN CODEBLOCKS. NO INTRODUCTORY OR CONVERSATIONAL TEXT.`;
}
