import 'server-only';
import { prisma } from '@/lib/prisma';
import {
  GenerateStructuredOptions,
  GenerateStructuredResult,
  AIModelConfig,
} from './types';
import { aiProviderRegistry } from './aiRegistry';
import { sanitizeError, sanitizeLog } from './utils/sanitizer';

/**
 * Executes a structured AI generation task using the active AI provider.
 * Validates output strictly with Zod and records audit logs safely.
 */
export async function generateStructuredAI<T>(
  options: GenerateStructuredOptions<T>,
  providerId?: string
): Promise<GenerateStructuredResult<T>> {
  try {
    const provider = await aiProviderRegistry.resolveProvider(providerId);

    const result = await provider.generateStructured(options);

    // Record audit event in SQLite ActivityLog
    try {
      await prisma.activityLog.create({
        data: {
          level: result.success ? 'INFO' : 'WARN',
          action: 'AI_STRUCTURED_GENERATION',
          entityType: 'AIModel',
          entityId: result.provider,
          details: JSON.stringify({
            provider: result.provider,
            model: result.model,
            success: result.success,
            latencyMs: result.latencyMs,
            requiresManualConfirmation: result.requiresManualConfirmation,
            error: result.error ? sanitizeLog(result.error) : undefined,
          }),
        },
      });
    } catch {
      // Avoid failing generation if activity logging encounters an issue
    }

    return result;
  } catch (err: any) {
    const errorMsg = sanitizeError(err);
    return {
      success: false,
      error: errorMsg,
      provider: providerId || 'unknown',
      model: 'unknown',
      latencyMs: 0,
    };
  }
}

/**
 * Checks the operational health and connectivity of the AI provider.
 */
export async function checkAIProviderHealth(providerId?: string): Promise<{
  provider: string;
  isAvailable: boolean;
  hasApiKey: boolean;
  configuredModel: string;
  message: string;
}> {
  const targetId = providerId || aiProviderRegistry.getDefaultProviderId();
  const provider = aiProviderRegistry.get(targetId);

  if (!provider) {
    return {
      provider: targetId,
      isAvailable: false,
      hasApiKey: false,
      configuredModel: 'none',
      message: `AI provider "${targetId}" is not registered.`,
    };
  }

  const isAvailable = await provider.isAvailable();
  const hasApiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);

  return {
    provider: provider.name,
    isAvailable,
    hasApiKey,
    configuredModel: targetId === 'gemini' ? 'gemini-2.5-flash' : 'mock-model-v1',
    message: isAvailable
      ? `${provider.name} is configured and ready for generation.`
      : `${provider.name} requires GEMINI_API_KEY to be set in environment variables.`,
  };
}
