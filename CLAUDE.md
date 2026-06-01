# Ai Army

Personal AI brain — habits, tasks, goals, and a self-building agent swarm.

## Stack

- **Backend:** Node.js, Express 5, better-sqlite3 (SQLite)
- **Frontend:** Vanilla HTML/CSS/JS, mobile-first, max-width 480px
- **Agents:** Anthropic SDK (`claude-sonnet-4-6` for building, `claude-haiku-4-5` for ideation)
- **MCP:** `@modelcontextprotocol/sdk` — GitHub, Filesystem, Brave Search, Google Calendar, Gmail

## Run

```bash
npm install
npm start          # app at localhost:3000
npm run agent      # start autonomous builder (requires ANTHROPIC_API_KEY in .env)
npm run agent:once # run one build cycle and exit
```

## .env

```
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_TOKEN=ghp_...             # optional: enables GitHub MCP
BRAVE_API_KEY=...                # optional: enables web search MCP
PORT=3000
INTERVAL_MINUTES=30              # how often the agent builds (default 30)
BUILDER_MODEL=claude-sonnet-4-6  # override builder model
```

## Structure

```
src/
  server.js          — Express entry, mounts routes, serves public/
  db.js              — SQLite connection, applies schema on startup
  schema.sql         — DDL (CREATE TABLE IF NOT EXISTS)
  routes/
    habits.js        — CRUD + complete/uncomplete
    tasks.js         — CRUD + reorder + complete
    streaks.js       — streak summary + history
    dashboard.js     — summary stats (habits, tasks, streaks)
    agents.js        — agent status + MCP map
  services/
    habitService.js  — streak algorithm (daily/weekdays/weekly)
    taskService.js   — bulk priority reorder
    ai.js            — Phase 2 seam (passthrough stub)

public/
  landing.html       — live agent dashboard (localhost:3000)
  index.html         — app: Habits, Tasks, Dashboard tabs (localhost:3000/app)
  css/app.css        — mobile-first styles + dark mode
  js/
    api.js           — fetch() wrapper
    habits.js        — habits tab
    tasks.js         — tasks tab
    dashboard.js     — dashboard + agent status panel

agents/
  orchestrator.js    — main loop: picks feature, builds, tops up backlog
  builder.js         — Claude agent with file tools + MCP tools
  ideator.js         — generates new feature ideas (Haiku)
  swarm.js           — 5 specialized sub-agents spawn in parallel (Haiku)
  backlog.json       — feature queue + completed log
  status.json        — live build state (read by dashboard)
  mcps/
    config.json      — MCP server configs + agent capability map
    client.js        — MCP client (StdioClientTransport)

data/               — SQLite DB (gitignored — run mkdir data before first start)
```

## API Endpoints

| Route | Methods |
|---|---|
| `/api/habits` | GET, POST, PATCH `:id`, DELETE `:id` |
| `/api/habits/:id/complete` | POST, DELETE |
| `/api/tasks` | GET `?status=`, POST, PATCH `:id`, DELETE `:id` |
| `/api/tasks/reorder` | POST `{ ordered_ids }` |
| `/api/tasks/:id/complete` | POST |
| `/api/streaks/summary` | GET |
| `/api/streaks/:habitId/history` | GET `?days=30` |
| `/api/dashboard/summary` | GET |
| `/api/agents/status` | GET |

## Agent Swarm

Each cycle (default 30 min):
1. **Orchestrator** picks highest-priority pending feature from `backlog.json`
2. **Builder** (Sonnet) reads project files, writes code, commits + pushes to GitHub
3. **Swarm** (5 Haiku agents: UI, Backend, Habits, Tasks, Dashboard) generate new ideas in parallel
4. **Ideator** (Haiku) tops up backlog if fewer than 5 pending features

MCP tools injected per agent type from `agents/mcps/config.json`.
