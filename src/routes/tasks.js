const express = require('express');
const router = express.Router();
const db = require('../db');
const { reorder } = require('../services/taskService');

router.get('/', (req, res) => {
  const status = req.query.status || 'todo';
  res.json(db.prepare('SELECT * FROM tasks WHERE status = ? ORDER BY priority ASC').all(status));
});

router.post('/reorder', (req, res) => {
  const { ordered_ids } = req.body;
  if (!Array.isArray(ordered_ids)) return res.status(400).json({ error: 'ordered_ids must be an array' });
  reorder(ordered_ids);
  res.status(204).end();
});

router.post('/:id/complete', (req, res) => {
  const task = db.prepare('SELECT id FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Not found' });
  db.prepare("UPDATE tasks SET status='done', completed_at=datetime('now') WHERE id=?").run(task.id);
  res.status(204).end();
});

router.post('/', (req, res) => {
  const { title, notes, due_date, estimated_minutes } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  const maxPriority = db.prepare('SELECT MAX(priority) as m FROM tasks WHERE status = ?').get('todo').m ?? -1;
  const result = db.prepare(
    'INSERT INTO tasks (title, notes, due_date, estimated_minutes, priority) VALUES (?, ?, ?, ?, ?)'
  ).run(title, notes || null, due_date || null, estimated_minutes || null, maxPriority + 1);
  res.status(201).json(db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid));
});

router.patch('/:id', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Not found' });
  const { title, notes, status, due_date, estimated_minutes } = req.body;
  db.prepare(
    'UPDATE tasks SET title=?, notes=?, status=?, due_date=?, estimated_minutes=? WHERE id=?'
  ).run(
    title ?? task.title,
    notes ?? task.notes,
    status ?? task.status,
    due_date ?? task.due_date,
    estimated_minutes ?? task.estimated_minutes,
    task.id
  );
  res.json(db.prepare('SELECT * FROM tasks WHERE id = ?').get(task.id));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
});

module.exports = router;
