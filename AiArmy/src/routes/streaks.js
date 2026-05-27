const express = require('express');
const router = express.Router();
const { getHabitsWithStats, getHistory } = require('../services/habitService');

router.get('/summary', (req, res) => {
  res.json(getHabitsWithStats().map(h => ({
    id: h.id,
    name: h.name,
    current_streak: h.current_streak,
    longest_streak: h.longest_streak,
    completed_today: h.completed_today,
  })));
});

router.get('/:habitId/history', (req, res) => {
  const days = parseInt(req.query.days) || 30;
  res.json(getHistory(req.params.habitId, days));
});

module.exports = router;
