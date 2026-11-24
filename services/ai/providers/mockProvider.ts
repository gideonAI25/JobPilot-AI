import 'server-only';
import {
  AIProvider,
  AIModelConfig,
  GenerateStructuredOptions,
  GenerateStructuredResult,
} from '../types';

export class MockAIProvider implements AIProvider {
  public readonly id = 'mock';
  public readonly name = 'Mock AI Provider (Testing)';

  private mockResponseGenerator?: (prompt: string) => Record<string, any>;

  constructor(mockResponseGenerator?: (prompt: string) => Record<string, any>) {
    this.mockResponseGenerator = mockResponseGenerator;
  }

  public async isAvailable(): Promise<boolean> {
    return true;
  }

  public async generateStructured<T>(
    options: GenerateStructuredOptions<T>
  ): Promise<GenerateStructuredResult<T>> {
    const startTime = Date.now();
    const model = options.config?.model || 'mock-model-v1';

    try {
      let mockPayload: any;

      if (this.mockResponseGenerator) {
        mockPayload = this.mockResponseGenerator(options.prompt);
      } else {
        // Generate a standard verifiable mock output
        const hasContext = options.candidateContext && Object.keys(options.candidateContext).length > 0;
        mockPayload = {
          status: 'HEALTHY',
          provider: this.name,
          model,
          verifiedGroundingRuleEnforced: true,
          requiresManualConfirmation: !hasContext,
          manualConfirmationReason: !hasContext
            ? 'No verified candidate context provided. Manual confirmation required.'
            : null,
          timestamp: new Date().toISOString(),
          summary: 'Simulated structured AI response adhering strictly to candidate profile grounding.',
        };
      }

      // Validate against provided Zod schema
      const validation = options.schema.safeParse(mockPayload);
      if (!validation.success) {
        return {
          success: false,
          error: `Mock payload failed Zod schema validation: ${validation.error.message}`,
          rawText: JSON.stringify(mockPayload),
          provider: this.id,
          model,
          latencyMs: Date.now() - startTime,
        };
      }

      return {
        success: true,
        data: validation.data,
        rawText: JSON.stringify(mockPayload),
        provider: this.id,
        model,
        latencyMs: Date.now() - startTime,
        requiresManualConfirmation: Boolean(mockPayload?.requiresManualConfirmation),
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Mock provider error',
        provider: this.id,
        model,
        latencyMs: Date.now() - startTime,
      };
    }
  }

  public async generateText(prompt: string, config?: AIModelConfig): Promise<string> {
    return `Mock text response for prompt: "${prompt.slice(0, 50)}..."`;
  }
}
