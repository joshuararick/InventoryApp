'use strict';
const { Router } = require('express');
const db = require('../db');
const { chat } = require('../services/ai');

const router = Router();

router.get('/history', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const msgs = db.prepare(
    'SELECT role, content, created_at FROM messages ORDER BY id DESC LIMIT ?'
  ).all(limit);
  res.json(msgs.reverse());
});

router.post('/', async (req, res) => {
  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'message required' });

  const habits = db.prepare('SELECT name, frequency FROM habits WHERE is_active=1').all();
  const tasks = db.prepare(
    "SELECT title, due_date FROM tasks WHERE status='todo' ORDER BY priority LIMIT 10"
  ).all();

  const habitCtx = habits.length
    ? 'Habits: ' + habits.map(h => `${h.name} (${h.frequency})`).join(', ')
    : 'No habits tracked yet.';
  const taskCtx = tasks.length
    ? 'Tasks: ' + tasks.map(t => t.title + (t.due_date ? ` [due ${t.due_date}]` : '')).join(', ')
    : 'No pending tasks.';

  const history = db.prepare(
    'SELECT role, content FROM messages ORDER BY id DESC LIMIT 20'
  ).all().reverse();

  try {
    const reply = await chat(message.trim(), history, `${habitCtx}\n${taskCtx}`);

    db.transaction(() => {
      db.prepare('INSERT INTO messages (role, content) VALUES (?, ?)').run('user', message.trim());
      db.prepare('INSERT INTO messages (role, content) VALUES (?, ?)').run('assistant', reply);
    })();

    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
