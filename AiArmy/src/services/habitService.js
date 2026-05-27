const db = require('../db');

function computeStreak(completionDates, frequency) {
  const dateSet = new Set(completionDates);
  const today = todayISO();
  let cursor = new Date(today + 'T00:00:00');
  let streak = 0;

  for (let i = 0; i < 365; i++) {
    const iso = cursor.toISOString().slice(0, 10);
    if (isRequired(cursor, frequency)) {
      if (dateSet.has(iso)) {
        streak++;
      } else {
        break;
      }
    }
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function isRequired(date, frequency) {
  const dow = date.getDay(); // 0=Sun, 6=Sat
  if (frequency === 'weekdays') return dow >= 1 && dow <= 5;
  if (frequency === 'weekly') return dow === 1; // Mondays
  return true; // daily
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function getHabitsWithStats() {
  const today = todayISO();
  const habits = db.prepare('SELECT * FROM habits WHERE is_active = 1 ORDER BY id').all();

  return habits.map(h => {
    const completions = db
      .prepare('SELECT completed_date FROM habit_completions WHERE habit_id = ? ORDER BY completed_date DESC')
      .all(h.id)
      .map(r => r.completed_date);

    const completedToday = completions.includes(today);
    const currentStreak = computeStreak(completions, h.frequency);
    const longestStreak = computeLongestStreak(completions, h.frequency);

    return { ...h, completed_today: completedToday, current_streak: currentStreak, longest_streak: longestStreak };
  });
}

function computeLongestStreak(completionDates, frequency) {
  if (!completionDates.length) return 0;
  const sorted = [...completionDates].sort();
  let longest = 0;
  let current = 0;
  let prev = null;

  for (const iso of sorted) {
    const date = new Date(iso + 'T00:00:00');
    if (!isRequired(date, frequency)) continue;

    if (prev === null) {
      current = 1;
    } else {
      const expected = new Date(prev + 'T00:00:00');
      do { expected.setDate(expected.getDate() + 1); } while (!isRequired(expected, frequency));
      current = expected.toISOString().slice(0, 10) === iso ? current + 1 : 1;
    }
    prev = iso;
    if (current > longest) longest = current;
  }
  return longest;
}

function markComplete(habitId, date = todayISO()) {
  db.prepare(
    'INSERT OR IGNORE INTO habit_completions (habit_id, completed_date) VALUES (?, ?)'
  ).run(habitId, date);
}

function unmarkComplete(habitId, date = todayISO()) {
  db.prepare(
    'DELETE FROM habit_completions WHERE habit_id = ? AND completed_date = ?'
  ).run(habitId, date);
}

function getHistory(habitId, days = 30) {
  const result = [];
  const cursor = new Date();
  for (let i = 0; i < days; i++) {
    const iso = cursor.toISOString().slice(0, 10);
    const row = db
      .prepare('SELECT 1 FROM habit_completions WHERE habit_id = ? AND completed_date = ?')
      .get(habitId, iso);
    result.unshift({ date: iso, completed: !!row });
    cursor.setDate(cursor.getDate() - 1);
  }
  return result;
}

module.exports = { getHabitsWithStats, markComplete, unmarkComplete, getHistory };
