/**
 * AI Service Facade for SiteLens AI.
 * Keeps local AI providers isolated behind an interchangeable interface.
 * Safely handles unavailable states without throwing unhandled exceptions.
 */

import type {
  AIHealthStatus,
  AIInterpretationReport,
  AIInterpretationRequest,
  IAIProvider,
} from "../types/ai";
import { OllamaProvider } from "./ollama-provider";

export class AIService {
  private provider: IAIProvider;

  constructor(customProvider?: IAIProvider) {
    this.provider = customProvider || new OllamaProvider();
  }

  get providerName(): string {
    return this.provider.providerName;
  }

  setProvider(newProvider: IAIProvider) {
    this.provider = newProvider;
  }

  async checkHealth(): Promise<AIHealthStatus> {
    return this.provider.checkHealth();
  }

  async interpretAudit(
    request: AIInterpretationRequest
  ): Promise<AIInterpretationReport> {
    return this.provider.interpretAudit(request);
  }
}

export const defaultAIService = new AIService();
