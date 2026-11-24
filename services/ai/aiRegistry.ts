import 'server-only';
import { AIProvider } from './types';
import { GeminiProvider } from './providers/geminiProvider';
import { MockAIProvider } from './providers/mockProvider';

class AIProviderRegistry {
  private providers = new Map<string, AIProvider>();
  private defaultProviderId = 'gemini';

  constructor() {
    // Register standard providers
    this.register(new GeminiProvider());
    this.register(new MockAIProvider());
  }

  public register(provider: AIProvider): void {
    this.providers.set(provider.id, provider);
  }

  public get(id: string): AIProvider | undefined {
    return this.providers.get(id);
  }

  public getAll(): AIProvider[] {
    return Array.from(this.providers.values());
  }

  public setDefaultProviderId(id: string): void {
    if (!this.providers.has(id)) {
      throw new Error(`Cannot set default AI provider to unknown provider "${id}".`);
    }
    this.defaultProviderId = id;
  }

  public getDefaultProviderId(): string {
    return this.defaultProviderId;
  }

  /**
   * Resolves the active provider. If specified provider is unavailable or not set,
   * falls back safely to another available provider.
   */
  public async resolveProvider(requestedId?: string): Promise<AIProvider> {
    const targetId = requestedId || this.defaultProviderId;
    const provider = this.providers.get(targetId);

    if (provider) {
      const isAvailable = await provider.isAvailable();
      if (isAvailable) return provider;
    }

    // If Gemini is requested but has no API key, and in test/mock mode, fall back to mock
    if (targetId === 'gemini') {
      const mock = this.providers.get('mock');
      if (mock) return mock;
    }

    if (provider) return provider;

    throw new Error(`No AI provider found matching "${targetId}".`);
  }
}

export const aiProviderRegistry = new AIProviderRegistry();
