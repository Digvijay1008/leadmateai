import { Router } from 'express';
import { authenticateUser } from '../../../../core/middleware/auth.js';
import { configRateLimit } from '../../../../core/middleware/rate-limit.js';

const router = Router();

// Apply middleware to all routes in this file
router.use(authenticateUser(), configRateLimit);

router.get('/voices', async (req, res) => {
    try {
        const voices = [
            // OpenAI Voices
            { id: 'alloy', name: 'Alloy', provider: 'openai', language: 'en-US', accent: 'Neutral', gender: 'neutral', preview_url: '' },
            { id: 'echo', name: 'Echo', provider: 'openai', language: 'en-US', accent: 'Neutral', gender: 'male', preview_url: '' },
            { id: 'fable', name: 'Fable', provider: 'openai', language: 'en-US', accent: 'British', gender: 'neutral', preview_url: '' },
            { id: 'onyx', name: 'Onyx', provider: 'openai', language: 'en-US', accent: 'Neutral', gender: 'male', preview_url: '' },
            { id: 'nova', name: 'Nova', provider: 'openai', language: 'en-US', accent: 'Neutral', gender: 'female', preview_url: '' },
            { id: 'shimmer', name: 'Shimmer', provider: 'openai', language: 'en-US', accent: 'Neutral', gender: 'female', preview_url: '' },
            
            // ElevenLabs Voices
            { id: 'eleven_rachel', name: 'Rachel', provider: 'elevenlabs', language: 'en-US', accent: 'American', gender: 'female', preview_url: '' },
            { id: 'eleven_drew', name: 'Drew', provider: 'elevenlabs', language: 'en-US', accent: 'American', gender: 'male', preview_url: '' },
            { id: 'eleven_cloyd', name: 'Cloyd', provider: 'elevenlabs', language: 'en-US', accent: 'American', gender: 'male', preview_url: '' },
            { id: 'eleven_eleanor', name: 'Eleanor', provider: 'elevenlabs', language: 'en-GB', accent: 'British', gender: 'female', preview_url: '' },
            
            // Deepgram Voices
            { id: 'aura-asteria-en', name: 'Asteria', provider: 'deepgram', language: 'en-US', accent: 'American', gender: 'female', preview_url: '' },
            { id: 'aura-luna-en', name: 'Luna', provider: 'deepgram', language: 'en-US', accent: 'American', gender: 'female', preview_url: '' },
            { id: 'aura-stella-en', name: 'Stella', provider: 'deepgram', language: 'en-US', accent: 'American', gender: 'female', preview_url: '' },
            { id: 'aura-hera-en', name: 'Hera', provider: 'deepgram', language: 'en-US', accent: 'American', gender: 'female', preview_url: '' },
            { id: 'aura-orion-en', name: 'Orion', provider: 'deepgram', language: 'en-US', accent: 'American', gender: 'male', preview_url: '' },
            { id: 'aura-arcas-en', name: 'Arcas', provider: 'deepgram', language: 'en-US', accent: 'American', gender: 'male', preview_url: '' },
            
            // Cartesia Voices
            { id: 'cartesia_sarah', name: 'Sarah', provider: 'cartesia', language: 'en-US', accent: 'American', gender: 'female', preview_url: '' },
            { id: 'cartesia_james', name: 'James', provider: 'cartesia', language: 'en-US', accent: 'American', gender: 'male', preview_url: '' },
            { id: 'cartesia_aisha', name: 'Aisha', provider: 'cartesia', language: 'en-IN', accent: 'Indian', gender: 'female', preview_url: '' },
            { id: 'cartesia_raj', name: 'Raj', provider: 'cartesia', language: 'en-IN', accent: 'Indian', gender: 'male', preview_url: '' },

            // Sarvam AI Voices
            { id: 'priya', name: 'Priya', provider: 'sarvam', language: 'hi-IN', accent: 'Indian', gender: 'female', preview_url: '' },
            { id: 'arjun', name: 'Arjun', provider: 'sarvam', language: 'hi-IN', accent: 'Indian', gender: 'male', preview_url: '' },
            { id: 'ananya', name: 'Ananya', provider: 'sarvam', language: 'hi-IN', accent: 'Indian', gender: 'female', preview_url: '' },
            { id: 'kabir', name: 'Kabir', provider: 'sarvam', language: 'hi-IN', accent: 'Indian', gender: 'male', preview_url: '' },
            { id: 'meera', name: 'Meera', provider: 'sarvam', language: 'hi-IN', accent: 'Indian', gender: 'female', preview_url: '' },
            { id: 'amol', name: 'Amol', provider: 'sarvam', language: 'mr-IN', accent: 'Indian', gender: 'male', preview_url: '' },
            { id: 'diya', name: 'Diya', provider: 'sarvam', language: 'ta-IN', accent: 'Indian', gender: 'female', preview_url: '' },
            { id: 'neel', name: 'Neel', provider: 'sarvam', language: 'te-IN', accent: 'Indian', gender: 'male', preview_url: '' },
        ];
        res.json({ voices });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/llms', async (req, res) => {
    try {
        const llms = [
            { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', context_window: 128000 },
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', context_window: 128000 },
            { id: 'claude-3-5-sonnet-latest', name: 'Claude 3.5 Sonnet', provider: 'anthropic', context_window: 200000 },
            { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', provider: 'anthropic', context_window: 200000 },
            { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'google', context_window: 1000000 },
            { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'google', context_window: 1000000 },
            { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', provider: 'groq', context_window: 128000 },
            { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', provider: 'groq', context_window: 128000 },
            { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', provider: 'groq', context_window: 32768 },
        ];
        res.json({ llms });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
