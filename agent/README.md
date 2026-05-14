# Leadmate Voice AI Agent

Python-based voice agent runtime for Leadmate Voice AI platform.

## Architecture

The agent is a **stateless, session-scoped** runtime that:
- Connects to LiveKit rooms
- Manages the STT → LLM → TTS conversation loop
- Calls backend APIs for RAG and tools
- Reports session metrics at completion

### Key Principles

1. **No Database Access** - Agent NEVER touches the database
2. **No Billing** - Agent NEVER performs billing calculations
3. **No Pricing Decisions** - Agent follows backend-provided limits
4. **Manifest-Driven** - All config comes from session manifest

## Directory Structure

```
agent/
├── src/
│   ├── core/
│   │   ├── agent.py          # Main agent lifecycle
│   │   ├── session.py        # Session manifest handling
│   │   └── conversation.py   # Conversation state machine
│   ├── providers/
│   │   ├── base.py           # Abstract provider interfaces
│   │   ├── stt/              # Speech-to-text providers
│   │   │   ├── deepgram.py
│   │   │   └── assemblyai.py
│   │   ├── llm/              # Language model providers
│   │   │   ├── openai.py
│   │   │   └── anthropic.py
│   │   └── tts/              # Text-to-speech providers
│   │       ├── elevenlabs.py
│   │       └── cartesia.py
│   ├── backend/
│   │   ├── client.py         # HTTP client for backend
│   │   ├── rag.py            # RAG query interface
│   │   └── tools.py          # Tool execution interface
│   ├── safety/
│   │   ├── timeouts.py       # Duration enforcement
│   │   └── fallbacks.py      # Failure handling
│   ├── utils/
│   │   ├── logging.py        # Structured logging
│   │   └── metrics.py        # Session metrics
│   └── main.py               # Entry point
├── config/
│   └── settings.py           # Environment configuration
├── tests/
├── requirements.txt
├── pyproject.toml
└── Dockerfile
```

## Session Lifecycle

```
1. STARTUP
   └── Receive session manifest from backend (via JWT or HTTP)
   
2. CONNECT
   └── Join LiveKit room with participant token
   
3. CONVERSATION
   ├── Listen (VAD + STT)
   ├── Think (LLM + RAG)
   ├── Speak (TTS)
   └── Loop until termination
   
4. SHUTDOWN
   ├── Send goodbye message
   ├── Report session metrics to backend
   └── Disconnect from room
```

## Termination Conditions

1. **User hangup** - User disconnects from room
2. **Max duration** - Session exceeds allowed time
3. **Inactivity timeout** - No speech detected for N seconds
4. **Agent decision** - Conversation naturally ends
5. **Backend signal** - Backend terminates session
6. **Error** - Unrecoverable error occurs

## Provider Resolution

The agent resolves providers from the session manifest:

```python
manifest = {
    "stt": {"provider": "deepgram", "model": "nova-2"},
    "llm": {"provider": "openai", "model": "gpt-4o"},
    "tts": {"provider": "elevenlabs", "voice_id": "xxx"}
}

# Agent creates provider instances based on manifest
stt = create_stt_provider(manifest["stt"])
llm = create_llm_provider(manifest["llm"])
tts = create_tts_provider(manifest["tts"])
```

## Backend Communication

All backend calls are authenticated with the session token:

```python
# RAG Query
response = await backend.rag_query(query="What are your business hours?")

# Tool Execution  
result = await backend.execute_tool(
    tool_name="book_appointment",
    params={"date": "2026-01-20", "time": "10:00"}
)

# Session End Report
await backend.report_session_end(
    duration_seconds=245,
    end_reason="user_hangup"
)
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `LIVEKIT_URL` | Yes | LiveKit server URL |
| `BACKEND_API_URL` | Yes | Backend API base URL |
| `DEEPGRAM_API_KEY` | Yes* | Deepgram STT key |
| `OPENAI_API_KEY` | Yes* | OpenAI LLM key |
| `ELEVENLABS_API_KEY` | Yes* | ElevenLabs TTS key |
| `CARTESIA_API_KEY` | Yes* | Cartesia TTS key |
| `LOG_LEVEL` | No | Logging level (default: INFO) |

*Required based on configured presets

## Running Locally

```bash
cd agent
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python -m src.main
```

## License

Proprietary - Leadmate AI
