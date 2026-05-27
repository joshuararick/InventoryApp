# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Structure

This repo contains two apps:

- **Root (`/`)** — **Ai Army**: a personal life-automation web app (Node.js + Express + SQLite). This is the primary active project.
- **`android/`** — **InventoryApp**: an Android inventory management app (Java, API 16–23), preserved for future use.

---

## Ai Army (root)

### Build & Run

```bash
npm install
npm start        # http://localhost:3000
npm run dev      # with nodemon auto-reload
```

### Architecture

**Backend** (`src/`): Express 5, `better-sqlite3` (synchronous SQLite), single-user local deployment.

- `src/server.js` — entry point; mounts all routers and serves `public/`
- `src/db.js` — opens the SQLite connection, applies `src/schema.sql` on startup
- `src/schema.sql` — canonical DDL; all tables use `CREATE TABLE IF NOT EXISTS`
- `src/routes/` — `habits.js`, `tasks.js`, `streaks.js`
- `src/services/habitService.js` — streak algorithm (frequency-aware: daily / weekdays / weekly), mark-complete logic
- `src/services/taskService.js` — bulk priority reorder
- `src/services/ai.js` — **Phase 2 seam**: passthrough stub, replace with Anthropic SDK calls

**Frontend** (`public/`): Vanilla HTML/CSS/JS, mobile-first, no framework.

- Three tabs: Habits, Tasks, Dashboard (Dashboard is a stub for Phase 2)
- `public/js/api.js` — thin `fetch()` wrapper used by all tab scripts

**Database** (`data/army.db`, gitignored): Three tables — `habits`, `habit_completions`, `tasks`. The `tasks` table already has `estimated_minutes` and `ai_priority_score` columns (NULL in Phase 1) so Phase 2 needs no schema migration.

### API Endpoints

| Resource | Methods |
|---|---|
| `/api/habits` | GET, POST, PATCH `:id`, DELETE `:id` |
| `/api/habits/:id/complete` | POST (mark), DELETE (unmark) |
| `/api/tasks` | GET `?status=`, POST, PATCH `:id`, DELETE `:id` |
| `/api/tasks/reorder` | POST `{ ordered_ids: [...] }` |
| `/api/tasks/:id/complete` | POST |
| `/api/streaks/summary` | GET |
| `/api/streaks/:habitId/history` | GET `?days=30` |

### Phase 2 Roadmap

Claude AI integration goes in `src/services/ai.js` — the route, schema column, and calling code stay unchanged. Planned additions: task prioritization, auto-scheduler (uses `estimated_minutes`), goal decomposer, life dashboard.

Add `ANTHROPIC_API_KEY` to a `.env` file (see `.env.example`).

---

## InventoryApp (`android/`)

Android inventory management app (Java, API 16–23) using SQLite. Built with Android Gradle Plugin 2.3.0 and Gradle 3.3.

### Build & Test

```bash
cd android
./gradlew assembleDebug
./gradlew test
./gradlew test --tests "com.rarick.inventoryapp.ExampleUnitTest"
./gradlew clean
```

### Architecture

Flat Activity-based structure — no fragments, no ViewModel, no Repository layer.

- `DBContract` → SQLite schema constants and CREATE/DROP SQL
- `DBHandler` (`SQLiteOpenHelper`) → all CRUD, returns `ArrayList<Inventory>`
- `Inventory` → plain model (id, productName, quantity, price); `quantitySale()` decrements quantity (floor 0)
- Activities call `DBHandler` directly

Activity flow: `MainActivity` (ListView via `ListViewAdapter`) → `ItemFullDisplayActivity` (detail, delete, order-more email) / `AddNewItem` (insert + gallery image pick).

**Image storage:** saved to `filesDir/<rowCount+1>` at add-time, read back as `filesDir/<id-1>`. This off-by-one must be preserved.

### Known Gotchas

- Manifest `package="com.Rarick.inventoryapp"` (capital R) vs `applicationId "com.samsrutidash.inventoryapp"` vs test package `com.rarick.inventoryapp` — keep as-is.
- `KEY_IMAGE` column exists in schema but is never written by `addItem` or `updateHabitRow`.
- `DATABASE_VERSION = 1` — any schema change needs a version bump; current `onUpgrade` drops and recreates (data loss).
- `ListViewAdapter` calls `notifyDataSetChanged()` inside `getView()` — legacy pattern, don't worsen it.
- `ItemFullDisplayActivity.onSubmitMore` hardcodes `workOrderMore@gmail.com` and sender name `Samsruti`.
