import 'server-only';
import { GoogleGenAI } from '@google/genai';
import {
  AIProvider,
  AIModelConfig,
  GenerateStructuredOptions,
  GenerateStructuredResult,
} from '../types';
import { CANDIDATE_GROUNDING_CONTRACT, buildGroundedPrompt } from '../prompts/groundingInstructions';
import { withRetry } from '../utils/retryHandler';
import { sanitizeError } from '../utils/sanitizer';

export class GeminiProvider implements AIProvider {
  public readonly id = 'gemini';
  public readonly name = 'Google Gemini';

  private client: GoogleGenAI | null = null;
  private defaultModel = 'gemini-2.5-flash';

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (key && key.trim().length > 0) {
      this.client = new GoogleGenAI({ apiKey: key.trim() });
    }
  }

  /**
   * Lazily initializes or retrieves the GoogleGenAI instance.
   */
  private getClient(): GoogleGenAI {
    if (!this.client) {
      const key = process.env.GEMINI_API_KEY;
      if (!key || key.trim().length === 0) {
        throw new Error(
          'GEMINI_API_KEY is not configured in environment variables. Please set GEMINI_API_KEY in your .env file.'
        );
      }
      this.client = new GoogleGenAI({ apiKey: key.trim() });
    }
    return this.client;
  }

  public async isAvailable(): Promise<boolean> {
    const key = process.env.GEMINI_API_KEY;
    return Boolean(key && key.trim().length > 0);
  }

  public async generateStructured<T>(
    options: GenerateStructuredOptions<T>
  ): Promise<GenerateStructuredResult<T>> {
    const startTime = Date.now();
    const model = options.config?.model || this.defaultModel;

    try {
      const client = this.getClient();

      // Ground the prompt with candidate facts and anti-hallucination contract
      const fullPrompt = buildGroundedPrompt(options.prompt, options.candidateContext);

      // System instruction
      const systemInstruction = options.systemInstruction
        ? `${CANDIDATE_GROUNDING_CONTRACT}\n\n${options.systemInstruction}`
        : CANDIDATE_GROUNDING_CONTRACT;

      // Timeout controller
      const timeoutMs = options.config?.timeoutMs || 30000;

      const rawResultText = await withRetry(
        async () => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

          try {
            const response = await client.models.generateContent({
              model,
              contents: fullPrompt,
              config: {
                responseMimeType: 'application/json',
                temperature: options.config?.temperature ?? 0.2, // Low temperature for high factual adherence
                maxOutputTokens: options.config?.maxTokens ?? 2048,
                systemInstruction,
                abortSignal: controller.signal,
              },
            });

            return response.text || '';
          } finally {
            clearTimeout(timeoutId);
          }
        },
        options.retryOptions
      );

      // Clean response text: strip markdown code blocks if model added them
      const cleanedJson = this.cleanJsonOutput(rawResultText);

      // Parse JSON
      let parsedJson: any;
      try {
        parsedJson = JSON.parse(cleanedJson);
      } catch (parseErr: any) {
        return {
          success: false,
          error: `Failed to parse Gemini output as JSON: ${parseErr.message}`,
          rawText: rawResultText,
          provider: this.id,
          model,
          latencyMs: Date.now() - startTime,
        };
      }

      // Validate with Zod schema
      const validation = options.schema.safeParse(parsedJson);
      if (!validation.success) {
        const errorDetails = validation.error.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join(', ');

        return {
          success: false,
          error: `Gemini JSON output failed schema validation: ${errorDetails}`,
          rawText: rawResultText,
          provider: this.id,
          model,
          latencyMs: Date.now() - startTime,
        };
      }

      const requiresManualConfirmation =
        Boolean(parsedJson?.requiresManualConfirmation) ||
        Boolean(parsedJson?.needsReview);

      return {
        success: true,
        data: validation.data,
        rawText: rawResultText,
        provider: this.id,
        model,
        latencyMs: Date.now() - startTime,
        requiresManualConfirmation,
      };
    } catch (error: any) {
      const sanitized = sanitizeError(error);
      return {
        success: false,
        error: sanitized,
        provider: this.id,
        model,
        latencyMs: Date.now() - startTime,
      };
    }
  }

  public async generateText(prompt: string, config?: AIModelConfig): Promise<string> {
    const client = this.getClient();
    const model = config?.model || this.defaultModel;
    const timeoutMs = config?.timeoutMs || 30000;

    return await withRetry(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await client.models.generateContent({
          model,
          contents: prompt,
          config: {
            temperature: config?.temperature ?? 0.3,
            maxOutputTokens: config?.maxTokens ?? 2048,
            systemInstruction: config?.systemInstruction,
            abortSignal: controller.signal,
          },
        });

        return response.text || '';
      } finally {
        clearTimeout(timeoutId);
      }
    });
  }

  private cleanJsonOutput(raw: string): string {
    let text = raw.trim();
    // Strip ```json ... ``` or ``` ... ```
    if (text.startsWith('```json')) {
      text = text.slice(7);
    } else if (text.startsWith('```')) {
      text = text.slice(3);
    }
    if (text.endsWith('```')) {
      text = text.slice(0, -3);
    }
    return text.trim();
  }
}
