'use strict';
const express = require('express');
const router = express.Router();
const db = require('../db');
const { getHabitsWithStats } = require('../services/habitService');

router.get('/summary', (req, res) => {
  const habits = getHabitsWithStats();
  const today = new Date().toISOString().slice(0, 10);

  const habitsCompletedToday = habits.filter(h => h.completed_today).length;
  const habitsTotal = habits.length;

  // Tasks done this week (Mon–today)
  const weekStart = (() => {
    const d = new Date();
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday
    return d.toISOString().slice(0, 10);
  })();
  const tasksDoneThisWeek = db.prepare(
    "SELECT COUNT(*) as c FROM tasks WHERE status='done' AND completed_at >= ?"
  ).get(weekStart).c;

  const tasksDueToday = db.prepare(
    "SELECT * FROM tasks WHERE status='todo' AND due_date = ? ORDER BY priority"
  ).all(today);

  const tasksDueSoon = db.prepare(
    "SELECT * FROM tasks WHERE status='todo' AND due_date > ? AND due_date <= date(?, '+3 days') ORDER BY due_date, priority"
  ).all(today, today);

  const bestStreak = habits.reduce((best, h) => (!best || h.current_streak > best.current_streak ? h : best), null);

  res.json({
    date: today,
    habits: {
      completed_today: habitsCompletedToday,
      total: habitsTotal,
      all: habits.map(h => ({
        id: h.id,
        name: h.name,
        color: h.color,
        frequency: h.frequency,
        completed_today: h.completed_today,
        current_streak: h.current_streak,
        longest_streak: h.longest_streak,
      })),
    },
    tasks: {
      done_this_week: tasksDoneThisWeek,
      due_today: tasksDueToday,
      due_soon: tasksDueSoon,
    },
    best_streak: bestStreak ? { name: bestStreak.name, streak: bestStreak.current_streak } : null,
  });
});

module.exports = router;
