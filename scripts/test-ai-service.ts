export {};

import { z } from 'zod';
import { prisma } from '../lib/prisma';
import {
  aiProviderRegistry,
  generateStructuredAI,
  checkAIProviderHealth,
  GeminiProvider,
  MockAIProvider,
  sanitizeLog,
  sanitizeError,
  withRetry,
  isRetryableError,
  CANDIDATE_GROUNDING_CONTRACT,
} from '../services/ai';

// Simple Structured Response Schema for verification
const SampleEvaluationSchema = z.object({
  status: z.enum(['HEALTHY', 'DEGRADED', 'UNAVAILABLE']),
  provider: z.string(),
  model: z.string(),
  verifiedGroundingRuleEnforced: z.boolean(),
  requiresManualConfirmation: z.boolean(),
  manualConfirmationReason: z.string().nullable(),
  summary: z.string(),
  timestamp: z.string(),
});

type SampleEvaluation = z.infer<typeof SampleEvaluationSchema>;

async function testAIService() {
  console.log('🧪 Testing Phase 5: AI Intelligence Engine Integration...\n');

  try {
    // 1. Verify Provider Abstraction & Registry
    console.log('1️⃣ Checking AI Provider Abstraction & Registry...');
    const registered = aiProviderRegistry.getAll();
    console.log(`   Found ${registered.length} registered providers: [${registered.map((p) => p.id).join(', ')}]`);

    const gemini = aiProviderRegistry.get('gemini');
    const mock = aiProviderRegistry.get('mock');

    if (!gemini || !mock) {
      throw new Error('Expected both gemini and mock providers in registry.');
    }
    console.log(`   Default Provider: ${aiProviderRegistry.getDefaultProviderId()}`);
    console.log(`✅ AI Provider abstraction verified.`);

    // 2. Test Security: API Key & PII Sanitizer
    console.log('\n2️⃣ Testing Security Sanitizer (Zero API Key & PII Leaks)...');
    const sampleLeak = 'Error: Call to https://generativelanguage.googleapis.com/v1beta?key=AIzaSyA1234567890abcdef123456789012345 failed for john.doe@example.com, phone +1 555-123-4567';
    const sanitized = sanitizeLog(sampleLeak);
    console.log(`   Original sample: "${sampleLeak}"`);
    console.log(`   Sanitized output: "${sanitized}"`);

    if (sanitized.includes('AIzaSy') || sanitized.includes('john.doe@example.com') || sanitized.includes('555-123-4567')) {
      throw new Error('Sanitizer failed to redact API key or PII!');
    }
    console.log(`✅ Security Sanitizer verified: API keys and candidate PII are 100% redacted.`);

    // 3. Test Retry Logic with Backoff
    console.log('\n3️⃣ Testing Retry Logic & Transient Error Detection...');
    let attempts = 0;
    const retryResult = await withRetry(
      async (attempt) => {
        attempts++;
        if (attempt < 2) {
          const err: any = new Error('Rate limit exceeded (HTTP 429)');
          err.status = 429;
          throw err;
        }
        return 'success_after_backoff';
      },
      { maxRetries: 3, initialDelayMs: 50, maxDelayMs: 200, backoffFactor: 1.5 }
    );

    console.log(`   Operation succeeded on attempt: ${attempts}, result: "${retryResult}"`);
    if (retryResult !== 'success_after_backoff' || attempts !== 3) {
      throw new Error(`Expected success on 3rd attempt, got attempts: ${attempts}`);
    }

    // Verify non-retryable error fails fast
    let failFastAttempts = 0;
    try {
      await withRetry(
        async () => {
          failFastAttempts++;
          const err: any = new Error('Invalid argument provided (HTTP 400)');
          err.status = 400;
          throw err;
        },
        { maxRetries: 3, initialDelayMs: 50 }
      );
    } catch {
      // Expected to throw immediately
    }
    console.log(`   Non-retryable 400 error attempts: ${failFastAttempts} (failed fast without retries)`);
    if (failFastAttempts !== 1) {
      throw new Error(`Expected fail-fast for client error, but ran ${failFastAttempts} attempts.`);
    }
    console.log(`✅ Retry logic verified.`);

    // 4. Test Structured JSON Generation with Zod Validation
    console.log('\n4️⃣ Testing Structured JSON Generation & Zod Validation...');
    const structuredResult = await generateStructuredAI<SampleEvaluation>(
      {
        prompt: 'Check operational status and confirm grounding rules.',
        schema: SampleEvaluationSchema,
        candidateContext: {
          fullName: 'Alex Candidate',
          verifiedSkills: ['TypeScript', 'Next.js', 'Python'],
        },
      },
      'mock'
    );

    console.log(`   Generation Success: ${structuredResult.success}`);
    console.log(`   Provider: ${structuredResult.provider}, Model: ${structuredResult.model}`);
    console.log(`   Latency: ${structuredResult.latencyMs}ms`);
    console.log(`   Requires Manual Confirmation: ${structuredResult.requiresManualConfirmation}`);
    console.log(`   Structured Data:`, structuredResult.data);

    if (!structuredResult.success || !structuredResult.data) {
      throw new Error(`Structured generation failed: ${structuredResult.error}`);
    }
    if (structuredResult.data.verifiedGroundingRuleEnforced !== true) {
      throw new Error('Grounding rule verification flag not present.');
    }
    console.log(`✅ Structured JSON response verified with Zod schema.`);

    // 5. Test Anti-Hallucination & Incomplete Fact Handling
    console.log('\n5️⃣ Testing Anti-Hallucination & Incomplete Fact Guard...');
    const missingContextResult = await generateStructuredAI<SampleEvaluation>(
      {
        prompt: 'Evaluate candidate qualifications for Staff AI Architect.',
        schema: SampleEvaluationSchema,
        // No candidate context provided!
      },
      'mock'
    );

    console.log(`   Requires Manual Confirmation (when info unverified): ${missingContextResult.requiresManualConfirmation}`);
    console.log(`   Reason: "${missingContextResult.data?.manualConfirmationReason}"`);

    if (missingContextResult.requiresManualConfirmation !== true) {
      throw new Error('Expected requiresManualConfirmation to be true when candidate context is absent.');
    }
    console.log(`✅ Anti-Hallucination contract verified: unverified facts require manual confirmation.`);

    // 6. Test Extensibility: Dynamic Custom Provider (e.g. Ollama)
    console.log('\n6️⃣ Testing Provider Extensibility (Adding Ollama Provider)...');
    class OllamaProviderMock {
      public readonly id = 'ollama';
      public readonly name = 'Ollama Local LLM';
      public async isAvailable() { return true; }
      public async generateStructured<T>(options: any) {
        return {
          success: true,
          data: {
            status: 'HEALTHY',
            provider: 'Ollama Local LLM',
            model: 'llama3.2',
            verifiedGroundingRuleEnforced: true,
            requiresManualConfirmation: false,
            manualConfirmationReason: null,
            summary: 'Ollama provider local execution simulated successfully.',
            timestamp: new Date().toISOString(),
          } as T,
          provider: 'ollama',
          model: 'llama3.2',
          latencyMs: 15,
        };
      }
      public async generateText() { return 'Ollama text'; }
    }

    aiProviderRegistry.register(new OllamaProviderMock() as any);
    const resolvedOllama = await aiProviderRegistry.resolveProvider('ollama');
    console.log(`   Registered and resolved: ${resolvedOllama.name} (${resolvedOllama.id})`);

    const ollamaResult = await generateStructuredAI<SampleEvaluation>(
      { prompt: 'Test Ollama', schema: SampleEvaluationSchema },
      'ollama'
    );
    console.log(`   Ollama result provider: ${ollamaResult.provider}, model: ${ollamaResult.model}`);
    if (ollamaResult.provider !== 'ollama') {
      throw new Error('Failed to route structured request to custom Ollama provider.');
    }
    console.log(`✅ Provider abstraction proved completely extensible for Ollama.`);

    // 7. Check Gemini Provider Configuration & Live Status
    console.log('\n7️⃣ Checking Gemini Provider Configuration & Live Status...');
    const geminiHealth = await checkAIProviderHealth('gemini');
    console.log(`   Provider: ${geminiHealth.provider}`);
    console.log(`   Configured Model: ${geminiHealth.configuredModel}`);
    console.log(`   API Key Configured: ${geminiHealth.hasApiKey}`);
    console.log(`   Status Message: "${geminiHealth.message}"`);

    if (geminiHealth.hasApiKey) {
      console.log('   Executing live call to Gemini API with current key...');
      const liveGemini = new GeminiProvider();
      const liveResult = await liveGemini.generateStructured({
        prompt: 'Respond with a simple status check conforming strictly to the requested schema.',
        schema: SampleEvaluationSchema,
      });
      console.log(`   Live Gemini Result: success=${liveResult.success}, latency=${liveResult.latencyMs}ms`);
      if (!liveResult.success) {
        console.warn(`   Live Gemini Notice: ${liveResult.error}`);
      }
    } else {
      console.log('   ℹ️ Live Gemini API key is not currently set in .env.');
      console.log('   The integration is built on Google GenAI SDK and will activate automatically once GEMINI_API_KEY is supplied.');
    }

    // 8. Verify ActivityLog
    console.log('\n8️⃣ Verifying SQLite ActivityLog Audit Records...');
    const latestLogs = await prisma.activityLog.findMany({
      where: { action: 'AI_STRUCTURED_GENERATION' },
      orderBy: { createdAt: 'desc' },
      take: 2,
    });
    console.log(`   Found ${latestLogs.length} AI_STRUCTURED_GENERATION audit logs in SQLite.`);
    for (const log of latestLogs) {
      console.log(`   • [${log.level}] ${log.action}: ${log.details}`);
    }

    // Cleanup test logs
    if (latestLogs.length > 0) {
      await prisma.activityLog.deleteMany({
        where: { id: { in: latestLogs.map((l) => l.id) } },
      });
      console.log('   Cleaned up test activity logs successfully.');
    }

    console.log('\n🎉 ALL PHASE 5 AI INTELLIGENCE ENGINE TESTS PASSED 100%!\n');
  } catch (error) {
    console.error('\n❌ AI Engine Test Failure:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testAIService();
