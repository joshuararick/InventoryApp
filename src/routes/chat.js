'use strict';
const { Router } = require('express');
const db = require('../db');
const { jarvisChat } = require('../jarvis');

const router = Router();

router.get('/history', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 60, 200);
  const msgs = db.prepare(
    'SELECT role, content, created_at FROM messages ORDER BY id DESC LIMIT ?'
  ).all(limit);
  res.json(msgs.reverse());
});

router.post('/', async (req, res) => {
  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'message required' });

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'ANTHROPIC_API_KEY not set in .env' });
  }

  const history = db.prepare(
    'SELECT role, content FROM messages ORDER BY id DESC LIMIT 20'
  ).all().reverse();

  try {
    const { reply, toolCalls } = await jarvisChat(message.trim(), history);

    db.transaction(() => {
      db.prepare('INSERT INTO messages (role, content) VALUES (?, ?)').run('user', message.trim());
      db.prepare('INSERT INTO messages (role, content) VALUES (?, ?)').run('assistant', reply);
    })();

    res.json({ reply, toolCalls });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
