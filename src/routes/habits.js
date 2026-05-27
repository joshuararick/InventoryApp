const express = require('express');
const router = express.Router();
const db = require('../db');
const { getHabitsWithStats, markComplete, unmarkComplete } = require('../services/habitService');

router.get('/', (req, res) => {
  res.json(getHabitsWithStats());
});

router.post('/', (req, res) => {
  const { name, description, frequency, color } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const result = db.prepare(
    'INSERT INTO habits (name, description, frequency, color) VALUES (?, ?, ?, ?)'
  ).run(name, description || null, frequency || 'daily', color || '#4f46e5');
  res.status(201).json(db.prepare('SELECT * FROM habits WHERE id = ?').get(result.lastInsertRowid));
});

router.patch('/:id', (req, res) => {
  const habit = db.prepare('SELECT * FROM habits WHERE id = ?').get(req.params.id);
  if (!habit) return res.status(404).json({ error: 'Not found' });
  const { name, description, frequency, color, is_active } = req.body;
  db.prepare(
    'UPDATE habits SET name=?, description=?, frequency=?, color=?, is_active=? WHERE id=?'
  ).run(
    name ?? habit.name,
    description ?? habit.description,
    frequency ?? habit.frequency,
    color ?? habit.color,
    is_active ?? habit.is_active,
    habit.id
  );
  res.json(db.prepare('SELECT * FROM habits WHERE id = ?').get(habit.id));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM habits WHERE id = ?').run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
});

router.post('/:id/complete', (req, res) => {
  const habit = db.prepare('SELECT id FROM habits WHERE id = ?').get(req.params.id);
  if (!habit) return res.status(404).json({ error: 'Not found' });
  markComplete(habit.id, req.body.date);
  res.status(204).end();
});

router.delete('/:id/complete', (req, res) => {
  const habit = db.prepare('SELECT id FROM habits WHERE id = ?').get(req.params.id);
  if (!habit) return res.status(404).json({ error: 'Not found' });
  unmarkComplete(habit.id, req.body.date);
  res.status(204).end();
});

module.exports = router;
