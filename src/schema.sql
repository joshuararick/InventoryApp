CREATE TABLE IF NOT EXISTS habits (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    description TEXT,
    frequency   TEXT    NOT NULL DEFAULT 'daily',
    color       TEXT    NOT NULL DEFAULT '#4f46e5',
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS habit_completions (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    habit_id       INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    completed_date TEXT    NOT NULL,
    completed_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE (habit_id, completed_date)
);

CREATE TABLE IF NOT EXISTS tasks (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    title             TEXT    NOT NULL,
    notes             TEXT,
    priority          INTEGER NOT NULL DEFAULT 0,
    status            TEXT    NOT NULL DEFAULT 'todo',
    due_date          TEXT,
    estimated_minutes INTEGER,
    ai_priority_score REAL,
    created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
    completed_at      TEXT
);

CREATE INDEX IF NOT EXISTS idx_completions_habit_date
    ON habit_completions (habit_id, completed_date DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_status_priority
    ON tasks (status, priority);

CREATE TABLE IF NOT EXISTS messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    role        TEXT    NOT NULL,
    content     TEXT    NOT NULL,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
