'use strict';
const Anthropic = require('@anthropic-ai/sdk');
const db = require('./db');

const client = new Anthropic();
const MODEL = process.env.CHAT_MODEL || 'claude-sonnet-4-6';

const TOOLS = [
  {
    name: 'add_habit',
    description: 'Create a new habit for the user to track',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Habit name' },
        frequency: { type: 'string', enum: ['daily', 'weekdays', 'weekly'] },
        color: { type: 'string', description: 'Optional hex color, e.g. #22c55e' }
      },
      required: ['name', 'frequency']
    }
  },
  {
    name: 'list_habits',
    description: 'Get all active habits with streak and whether done today',
    input_schema: { type: 'object', properties: {} }
  },
  {
    name: 'complete_habit',
    description: 'Mark a habit as done for today',
    input_schema: {
      type: 'object',
      properties: { habit_id: { type: 'integer' } },
      required: ['habit_id']
    }
  },
  {
    name: 'add_task',
    description: 'Add a task to the todo list',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        due_date: { type: 'string', description: 'Optional ISO date YYYY-MM-DD' },
        notes: { type: 'string', description: 'Optional details' }
      },
      required: ['title']
    }
  },
  {
    name: 'list_tasks',
    description: 'Get all pending tasks',
    input_schema: { type: 'object', properties: {} }
  },
  {
    name: 'complete_task',
    description: 'Mark a task as done',
    input_schema: {
      type: 'object',
      properties: { task_id: { type: 'integer' } },
      required: ['task_id']
    }
  },
  {
    name: 'get_summary',
    description: "Get today's full summary: habits completed, tasks pending, streaks",
    input_schema: { type: 'object', properties: {} }
  },
  {
    name: 'remember',
    description: 'Save something important about the user to remember in future conversations',
    input_schema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Category: name, goal, preference, etc.' },
        value: { type: 'string', description: 'The value to remember' }
      },
      required: ['key', 'value']
    }
  }
];

function runTool(name, input) {
  const today = new Date().toISOString().split('T')[0];

  if (name === 'add_habit') {
    const r = db.prepare(
      'INSERT INTO habits (name, frequency, color) VALUES (?, ?, ?)'
    ).run(input.name, input.frequency || 'daily', input.color || '#6366f1');
    return { id: r.lastInsertRowid, name: input.name, frequency: input.frequency };
  }

  if (name === 'list_habits') {
    return db.prepare(`
      SELECT h.id, h.name, h.frequency, h.color,
        CASE WHEN c.id IS NOT NULL THEN 1 ELSE 0 END AS done_today
      FROM habits h
      LEFT JOIN habit_completions c ON c.habit_id=h.id AND c.completed_date=?
      WHERE h.is_active=1 ORDER BY h.id
    `).all(today);
  }

  if (name === 'complete_habit') {
    db.prepare(
      'INSERT OR IGNORE INTO habit_completions (habit_id, completed_date) VALUES (?, ?)'
    ).run(input.habit_id, today);
    const h = db.prepare('SELECT name FROM habits WHERE id=?').get(input.habit_id);
    return { success: true, habit: h?.name };
  }

  if (name === 'add_task') {
    const max = db.prepare("SELECT MAX(priority) as m FROM tasks WHERE status='todo'").get()?.m || 0;
    const r = db.prepare(
      'INSERT INTO tasks (title, notes, due_date, priority) VALUES (?, ?, ?, ?)'
    ).run(input.title, input.notes || null, input.due_date || null, max + 1);
    return { id: r.lastInsertRowid, title: input.title };
  }

  if (name === 'list_tasks') {
    return db.prepare(
      "SELECT id, title, due_date, notes FROM tasks WHERE status='todo' ORDER BY priority LIMIT 20"
    ).all();
  }

  if (name === 'complete_task') {
    db.prepare("UPDATE tasks SET status='done', completed_at=datetime('now') WHERE id=?").run(input.task_id);
    const t = db.prepare('SELECT title FROM tasks WHERE id=?').get(input.task_id);
    return { success: true, task: t?.title };
  }

  if (name === 'get_summary') {
    const habits = db.prepare(`
      SELECT h.name, CASE WHEN c.id IS NOT NULL THEN 1 ELSE 0 END AS done
      FROM habits h
      LEFT JOIN habit_completions c ON c.habit_id=h.id AND c.completed_date=?
      WHERE h.is_active=1
    `).all(today);
    const tasks = db.prepare(
      "SELECT title, due_date FROM tasks WHERE status='todo' ORDER BY priority LIMIT 10"
    ).all();
    const done = db.prepare(
      "SELECT COUNT(*) as n FROM tasks WHERE status='done' AND date(completed_at)=?"
    ).get(today)?.n || 0;
    return { date: today, habits, tasks, tasks_done_today: done };
  }

  if (name === 'remember') {
    db.prepare(`
      INSERT INTO facts (key, value, updated_at) VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at
    `).run(input.key, input.value);
    return { remembered: true };
  }

  return { error: `Unknown tool: ${name}` };
}

async function jarvisChat(userMessage, history) {
  const facts = db.prepare('SELECT key, value FROM facts').all();
  const factsCtx = facts.length
    ? '\nWhat I know about you:\n' + facts.map(f => `- ${f.key}: ${f.value}`).join('\n')
    : '';

  const system = `You are JARVIS — a sharp, capable personal AI assistant. You manage habits, tasks, and goals.${factsCtx}

Use your tools when the user asks you to do something (add habit, add task, mark done, etc).
Keep replies short — 1-3 sentences. Be direct and useful. A bit of wit is fine.
Today: ${new Date().toISOString().split('T')[0]}`;

  const messages = [
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage }
  ];

  const toolCalls = [];

  for (let round = 0; round < 10; round++) {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      tools: TOOLS,
      messages,
    });

    const toolBlocks = res.content.filter(b => b.type === 'tool_use');

    if (res.stop_reason === 'end_turn' || toolBlocks.length === 0) {
      const text = res.content.find(b => b.type === 'text')?.text || '';
      return { reply: text, toolCalls };
    }

    messages.push({ role: 'assistant', content: res.content });

    const results = [];
    for (const block of toolBlocks) {
      const result = runTool(block.name, block.input);
      toolCalls.push({ tool: block.name, input: block.input, result });
      results.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) });
    }
    messages.push({ role: 'user', content: results });
  }

  return { reply: "Something went wrong. Try again.", toolCalls };
}

module.exports = { jarvisChat };
