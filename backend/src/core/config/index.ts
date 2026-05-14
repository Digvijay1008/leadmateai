import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

// ===========================================
// ENVIRONMENT SCHEMA
// ===========================================
const envSchema = z.object({
    // Server
    PORT: z.string().default('3001'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

    // Database
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    DATABASE_POOL_MAX: z.string().default('40'),
    DATABASE_IDLE_TIMEOUT_MS: z.string().default('30000'),
    DATABASE_CONNECT_TIMEOUT_MS: z.string().default('2000'),
    SUPABASE_URL: z.string().url().optional(),
    SUPABASE_SERVICE_KEY: z.string().optional(),

    // LiveKit
    LIVEKIT_API_KEY: z.string().optional(),
    LIVEKIT_API_SECRET: z.string().optional(),
    LIVEKIT_URL: z.string().optional(),
    LIVEKIT_SIP_DOMAIN: z.string().default('sip.livekit.cloud'),
    // Name of the LiveKit agent worker that handles calls.
    // Must match the agent name registered in your LiveKit agent process.
    LIVEKIT_AGENT_NAME: z.string().default('leadmate-agent'),

    // AI Provider Keys (passed to agent via manifest + used for embeddings)
    OPENAI_API_KEY: z.string().optional(),
    DEEPGRAM_API_KEY: z.string().optional(),
    ELEVENLABS_API_KEY: z.string().optional(),
    GROQ_API_KEY: z.string().optional(),
    GEMINI_API_KEY: z.string().optional(),
    SARVAM_API_KEY: z.string().optional(),

    // JWT
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),

    // SIP Credential Encryption
    SIP_ENCRYPTION_KEY: z.string().optional(),

    // Billing
    DEFAULT_CURRENCY: z.string().default('INR'),
    LOW_BALANCE_THRESHOLD: z.string().default('50'),
});

// ===========================================
// PARSE & VALIDATE
// ===========================================
const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
    console.error('❌ Invalid environment variables:');
    console.error(parseResult.error.format());
    process.exit(1);
}

const env = parseResult.data;

// ===========================================
// EXPORTED CONFIG OBJECT
// ===========================================
export const config = {
    server: {
        port: parseInt(env.PORT, 10),
        nodeEnv: env.NODE_ENV,
        isDev: env.NODE_ENV === 'development',
        isProd: env.NODE_ENV === 'production',
    },

    database: {
        url: env.DATABASE_URL,
        poolMax: parseInt(env.DATABASE_POOL_MAX, 10),
        idleTimeoutMs: parseInt(env.DATABASE_IDLE_TIMEOUT_MS, 10),
        connectTimeoutMs: parseInt(env.DATABASE_CONNECT_TIMEOUT_MS, 10),
    },

    supabase: {
        url: env.SUPABASE_URL,
        serviceKey: env.SUPABASE_SERVICE_KEY,
    },

    livekit: {
        apiKey: env.LIVEKIT_API_KEY ?? '',
        apiSecret: env.LIVEKIT_API_SECRET ?? '',
        url: env.LIVEKIT_URL ?? '',
        sipDomain: env.LIVEKIT_SIP_DOMAIN,
        agentName: env.LIVEKIT_AGENT_NAME,
    },

    openai: {
        apiKey: env.OPENAI_API_KEY ?? '',
    },

    ai: {
        openaiApiKey: env.OPENAI_API_KEY ?? '',
        deepgramApiKey: env.DEEPGRAM_API_KEY ?? '',
        elevenlabsApiKey: env.ELEVENLABS_API_KEY ?? '',
        groqApiKey: env.GROQ_API_KEY ?? '',
        geminiApiKey: env.GEMINI_API_KEY ?? '',
        sarvamApiKey: env.SARVAM_API_KEY ?? '',
    },

    jwt: {
        secret: env.JWT_SECRET,
        expiresIn: '24h',
    },

    sip: {
        encryptionKey: env.SIP_ENCRYPTION_KEY ?? '',
    },

    billing: {
        defaultCurrency: env.DEFAULT_CURRENCY,
        lowBalanceThreshold: parseFloat(env.LOW_BALANCE_THRESHOLD),

        // Billing rules
        roundingMode: 'ceil' as const,  // Round up to nearest minute
        minimumBillableSeconds: 60,      // Minimum 1 minute
        holdDurationMultiplier: 1.2,     // Hold 20% more than estimated
        holdExpirationMinutes: 120,      // Holds expire after 2 hours
    },

    session: {
        defaultMaxDurationSeconds: 900,   // 15 minutes
        inactivityTimeoutSeconds: 120,    // 2 minutes
        minBalanceForSession: 1,          // At least 1 minute cost required
    },
} as const;

export type Config = typeof config;
