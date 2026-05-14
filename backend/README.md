# Leadmate Voice AI Backend

Production-grade backend for Leadmate Voice AI platform.

## Architecture

```
backend/
├── src/
│   ├── config/          # Environment & configuration
│   ├── db/              # Database client & migrations
│   ├── middleware/      # Express middleware
│   ├── repositories/    # Data access layer
│   ├── routes/          # API route handlers
│   ├── services/        # Business logic
│   ├── types/           # TypeScript definitions
│   ├── utils/           # Helpers & utilities
│   └── index.ts         # Application entry point
└── package.json
```

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ with pgvector extension
- Supabase project (recommended)

### Installation

```bash
cd backend
npm install
```

### Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
DATABASE_URL=postgresql://...
JWT_SECRET=your-32-char-secret
OPENAI_API_KEY=sk-...
```

### Database Setup

Run migrations:

```bash
npm run migrate
```

Rollback (if needed):

```bash
npm run migrate:down
```

### Development

```bash
npm run dev
```

Server runs at http://localhost:3001

### Production

```bash
npm run build
npm start
```

## API Endpoints

### Voice Sessions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/voice/sessions/start` | Start new session |
| POST | `/api/v1/voice/sessions/end` | End session |
| POST | `/api/v1/voice/sessions/:id/cancel` | Cancel pending session |
| GET | `/api/v1/voice/sessions/:id/manifest` | Get agent manifest |
| POST | `/api/v1/voice/sessions/:id/activate` | Mark session active |

### RAG (Knowledge Base)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/rag/query` | Search knowledge base |
| POST | `/api/v1/rag/query-formatted` | Search with formatted response |

### Wallet

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/wallet/balance` | Get balance |
| GET | `/api/v1/wallet/transactions` | Transaction history |
| POST | `/api/v1/wallet/topup` | Initiate top-up |

### Presets

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/presets` | List voice presets |
| GET | `/api/v1/presets/:id` | Get preset details |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Basic health check |
| GET | `/api/health/detailed` | Detailed health with deps |

## Authentication

### User Authentication

User endpoints require Bearer token:

```
Authorization: Bearer <jwt_token>
```

Token payload:
```json
{
  "user_id": "uuid"
}
```

### Agent Authentication

Agent endpoints use internal tokens:

```
Authorization: Bearer <agent_token>
```

Token payload:
```json
{
  "session_id": "uuid",
  "tenant_id": "uuid",
  "type": "agent"
}
```

## Billing Flow

1. **Session Start**
   - Check wallet balance
   - Calculate max duration
   - Create wallet hold
   - Generate LiveKit token

2. **Session Active**
   - Agent enforces max duration
   - No DB writes during session

3. **Session End**
   - Calculate actual cost
   - Settle hold (deduct usage, release remainder)
   - Update session record

## Key Design Decisions

### Wallet Holds

Wallet holds reserve funds at session start without actually deducting them. This:
- Prevents overdraft from concurrent sessions
- Allows exact billing at session end
- Enables atomic settlement

### Preset Snapshots

When a session starts, the preset configuration is snapshotted into the session record. This:
- Locks in pricing for billing accuracy
- Allows preset updates without affecting active sessions
- Creates an audit trail

### Tenant Isolation

All queries include `tenant_id` filter:
- Repository methods enforce tenant scope
- Vector search MUST filter by tenant
- JWT tokens include tenant context

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | 32+ char secret for JWT signing |
| `PORT` | No | Server port (default: 3001) |
| `NODE_ENV` | No | Environment (default: development) |
| `OPENAI_API_KEY` | No | For RAG embeddings |
| `LIVEKIT_API_KEY` | No | LiveKit Cloud API key |
| `LIVEKIT_API_SECRET` | No | LiveKit Cloud API secret |
| `LIVEKIT_URL` | No | LiveKit Cloud URL |

## Testing

```bash
npm test
```

## License

Proprietary - Leadmate AI
