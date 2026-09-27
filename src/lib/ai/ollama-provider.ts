/**
 * Ollama Local AI Provider for SiteLens AI.
 * Communicates with local Ollama daemon (default: http://localhost:11434).
 * Validates responses strictly via Zod and handles unavailable states gracefully.
 */

import type {
  AIHealthStatus,
  AIInterpretationReport,
  AIInterpretationRequest,
  IAIProvider,
} from "../types/ai";
import { buildAuditAnalysisPrompt } from "./prompt-builder";
import { AIInterpretationDataSchema } from "./schema";

export interface OllamaConfig {
  baseUrl: string;
  defaultModel: string;
  timeoutMs: number;
}

export class OllamaProvider implements IAIProvider {
  readonly providerName = "ollama";
  private config: OllamaConfig;

  constructor(customConfig?: Partial<OllamaConfig>) {
    this.config = {
      baseUrl:
        customConfig?.baseUrl ||
        process.env.OLLAMA_BASE_URL ||
        "http://localhost:11434",
      defaultModel:
        customConfig?.defaultModel ||
        process.env.OLLAMA_DEFAULT_MODEL ||
        "llama3:8b",
      timeoutMs:
        customConfig?.timeoutMs ||
        Number(process.env.OLLAMA_REQUEST_TIMEOUT_MS) ||
        60000,
    };
  }

  /**
   * Probes local Ollama instance reachability and retrieves installed models.
   */
  async checkHealth(): Promise<AIHealthStatus> {
    const endpoint = `${this.config.baseUrl}/api/tags`;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(endpoint, {
        method: "GET",
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        return {
          isAvailable: false,
          provider: this.providerName,
          endpoint: this.config.baseUrl,
          availableModels: [],
          errorMessage: `Ollama service returned HTTP status ${res.status}: ${res.statusText}`,
        };
      }

      const data = (await res.json()) as { models?: Array<{ name: string }> };
      const availableModels = (data.models || []).map((m) => m.name);

      return {
        isAvailable: true,
        provider: this.providerName,
        endpoint: this.config.baseUrl,
        availableModels,
        activeModel: this.config.defaultModel,
      };
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to connect to local Ollama daemon at " + this.config.baseUrl;
      return {
        isAvailable: false,
        provider: this.providerName,
        endpoint: this.config.baseUrl,
        availableModels: [],
        errorMessage: msg,
      };
    }
  }

  /**
   * Generates structured interpretation of deterministic audit data using Ollama.
   * If Ollama is unavailable, returns an unavailable report without crashing the pipeline.
   */
  async interpretAudit(
    request: AIInterpretationRequest
  ): Promise<AIInterpretationReport> {
    const startTime = Date.now();
    const model = request.options?.model || this.config.defaultModel;

    // Check health before invoking generate
    const health = await this.checkHealth();
    if (!health.isAvailable) {
      return {
        isAvailable: false,
        status: "unavailable",
        provider: this.providerName,
        model,
        unavailableReason: `Local Ollama daemon is unavailable at ${this.config.baseUrl} (${health.errorMessage || "connection refused"}). To enable local AI analysis, start Ollama with 'ollama run ${model}'.`,
        generatedAt: new Date().toISOString(),
        executionDurationMs: Date.now() - startTime,
      };
    }

    const prompt = buildAuditAnalysisPrompt(request);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const res = await fetch(`${this.config.baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          format: "json",
          options: {
            temperature: request.options?.temperature ?? 0.2,
          },
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        return {
          isAvailable: false,
          status: "failed",
          provider: this.providerName,
          model,
          unavailableReason: `Ollama generation request failed with status ${res.status}: ${res.statusText}`,
          generatedAt: new Date().toISOString(),
          executionDurationMs: Date.now() - startTime,
        };
      }

      const body = (await res.json()) as { response: string };
      let cleanResponse = (body.response || "").trim();

      // Strip markdown code fences if model enclosed JSON
      if (cleanResponse.startsWith("```json")) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (cleanResponse.startsWith("```")) {
        cleanResponse = cleanResponse.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      // Parse JSON
      const parsedJson = JSON.parse(cleanResponse);

      // Validate with Zod
      const validatedData = AIInterpretationDataSchema.parse(parsedJson);

      return {
        isAvailable: true,
        status: "completed",
        provider: this.providerName,
        model,
        data: validatedData,
        generatedAt: new Date().toISOString(),
        executionDurationMs: Date.now() - startTime,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        isAvailable: false,
        status: "failed",
        provider: this.providerName,
        model,
        unavailableReason: `Failed to interpret audit with local model '${model}': ${msg}`,
        generatedAt: new Date().toISOString(),
        executionDurationMs: Date.now() - startTime,
      };
    }
  }
}
