# AI Brain OS

Personal AI assistant backend — powered by Claude, with persistent memory in PostgreSQL.

## Setup

1. Copy the env file and add your Anthropic key:
```bash
cp .env.example .env
# Edit .env and paste your ANTHROPIC_API_KEY
```

2. Start everything:
```bash
docker compose up --build
```

3. Open the interactive API docs:
```
http://localhost:8000/docs
```

## API

### Health check
```bash
curl http://localhost:8000/health
```

### Start a chat (creates a new session)
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello Jarvis, what can you help me with?"}'
```

Response includes a `session_id` — pass it back to continue the conversation:

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Remember that for next time", "session_id": "YOUR-SESSION-ID"}'
```

### Get conversation history
```bash
curl http://localhost:8000/sessions/YOUR-SESSION-ID/messages
```

### Delete a session
```bash
curl -X DELETE http://localhost:8000/sessions/YOUR-SESSION-ID
```

## Stack

- **FastAPI** — async Python web framework
- **Claude** (Anthropic) — AI responses via `claude-sonnet-4-6`
- **PostgreSQL** — persistent conversation storage
- **Redis** — available for caching/queuing (Phase 2)
- **Docker Compose** — one command to run everything
