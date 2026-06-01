import os
import uuid
from datetime import datetime
from typing import Optional

import anthropic
import asyncpg
import redis.asyncio as aioredis
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(
    title="AI Brain OS",
    description="Personal AI assistant with persistent memory",
    version="0.2.0",
)

# ── Globals ───────────────────────────────────────────────────────────────────

claude = anthropic.AsyncAnthropic()
pool: asyncpg.Pool = None
cache: aioredis.Redis = None

SCHEMA = """
CREATE TABLE IF NOT EXISTS sessions (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
    id         BIGSERIAL PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    role       TEXT NOT NULL,
    content    TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, id DESC);
"""

# ── Lifecycle ─────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    global pool, cache
    pool = await asyncpg.create_pool(os.environ["DATABASE_URL"], min_size=2, max_size=10)
    async with pool.acquire() as conn:
        await conn.execute(SCHEMA)
    cache = aioredis.from_url(os.environ.get("REDIS_URL", "redis://localhost:6379/0"))


@app.on_event("shutdown")
async def shutdown():
    await pool.close()
    await cache.aclose()

# ── Models ────────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str
    session_id: str
    provider: str
    timestamp: str


class MessageOut(BaseModel):
    role: str
    content: str
    created_at: str

# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "ai-brain-os", "timestamp": datetime.utcnow().isoformat() + "Z"}


@app.get("/")
async def root():
    return {"message": "AI Brain OS is running.", "docs": "/docs", "health": "/health"}


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    if not os.environ.get("ANTHROPIC_API_KEY"):
        raise HTTPException(503, detail="ANTHROPIC_API_KEY not configured")

    async with pool.acquire() as conn:
        # Resolve or create session
        session_id = None
        if req.session_id:
            row = await conn.fetchrow(
                "SELECT id FROM sessions WHERE id=$1", uuid.UUID(req.session_id)
            )
            if row:
                session_id = str(row["id"])

        if not session_id:
            row = await conn.fetchrow("INSERT INTO sessions DEFAULT VALUES RETURNING id")
            session_id = str(row["id"])

        # Load recent history
        rows = await conn.fetch(
            "SELECT role, content FROM messages WHERE session_id=$1 ORDER BY id DESC LIMIT 20",
            uuid.UUID(session_id),
        )
        history = [{"role": r["role"], "content": r["content"]} for r in reversed(rows)]

        # Call Claude
        model = os.environ.get("CLAUDE_MODEL", "claude-sonnet-4-6")
        response = await claude.messages.create(
            model=model,
            max_tokens=1024,
            system=(
                "You are Jarvis, a personal AI assistant. "
                "Be concise, warm, and practical. "
                f"Today's date: {datetime.utcnow().strftime('%Y-%m-%d')}."
            ),
            messages=[*history, {"role": "user", "content": req.message}],
        )
        reply = response.content[0].text

        # Persist both turns
        await conn.execute(
            "INSERT INTO messages (session_id, role, content) VALUES ($1, $2, $3)",
            uuid.UUID(session_id), "user", req.message,
        )
        await conn.execute(
            "INSERT INTO messages (session_id, role, content) VALUES ($1, $2, $3)",
            uuid.UUID(session_id), "assistant", reply,
        )

    return ChatResponse(
        reply=reply,
        session_id=session_id,
        provider="claude",
        timestamp=datetime.utcnow().isoformat() + "Z",
    )


@app.get("/sessions/{session_id}/messages", response_model=list[MessageOut])
async def get_messages(session_id: str, limit: int = 50):
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT role, content, created_at FROM messages "
            "WHERE session_id=$1 ORDER BY id DESC LIMIT $2",
            uuid.UUID(session_id), limit,
        )
    return [
        {"role": r["role"], "content": r["content"], "created_at": r["created_at"].isoformat()}
        for r in reversed(rows)
    ]


@app.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM sessions WHERE id=$1", uuid.UUID(session_id))
    return {"deleted": session_id}
