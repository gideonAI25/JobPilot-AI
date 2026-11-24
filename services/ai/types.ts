import { z } from 'zod';

export interface TokenUsage {
  promptTokens?: number;
  candidateTokens?: number;
  totalTokens?: number;
}

export interface AIModelConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  systemInstruction?: string;
}

export interface AIRetryOptions {
  maxRetries?: number; // Default: 3
  initialDelayMs?: number; // Default: 1000
  maxDelayMs?: number; // Default: 8000
  backoffFactor?: number; // Default: 2
}

export interface GenerateStructuredOptions<T> {
  prompt: string;
  schema: z.ZodSchema<T>;
  systemInstruction?: string;
  config?: AIModelConfig;
  retryOptions?: AIRetryOptions;
  candidateContext?: Record<string, any>;
}

export interface GenerateStructuredResult<T> {
  success: boolean;
  data?: T;
  rawText?: string;
  provider: string;
  model: string;
  usage?: TokenUsage;
  latencyMs: number;
  error?: string;
  requiresManualConfirmation?: boolean;
}

export interface AIProvider {
  readonly id: string; // e.g. 'gemini', 'ollama', 'mock'
  readonly name: string;
  isAvailable(): Promise<boolean>;
  generateStructured<T>(options: GenerateStructuredOptions<T>): Promise<GenerateStructuredResult<T>>;
  generateText(prompt: string, config?: AIModelConfig): Promise<string>;
}
