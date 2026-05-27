'use strict';

async function loadDashboard() {
  let data;
  try {
    data = await api('GET', '/api/dashboard/summary');
  } catch (e) {
    return;
  }

  // Date header
  const el = document.getElementById('dash-date');
  if (el) el.textContent = new Date(data.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // Stat cards
  const pct = data.habits.total ? Math.round((data.habits.completed_today / data.habits.total) * 100) : 0;
  document.getElementById('dash-stats').innerHTML = `
    <div class="dash-stat">
      <div class="dash-stat-value">${data.habits.completed_today}<span class="dash-stat-of">/${data.habits.total}</span></div>
      <div class="dash-stat-label">Habits today</div>
      <div class="dash-progress"><div class="dash-progress-fill" style="width:${pct}%"></div></div>
    </div>
    <div class="dash-stat">
      <div class="dash-stat-value">${data.tasks.done_this_week}</div>
      <div class="dash-stat-label">Tasks this week</div>
    </div>
  `;

  // Best streak
  const bsEl = document.getElementById('dash-best-streak');
  if (data.best_streak && data.best_streak.streak > 0) {
    bsEl.innerHTML = `
      <div class="dash-block-title">Best streak</div>
      <div class="dash-best-streak-row">
        <span class="dash-fire">🔥</span>
        <span class="dash-streak-num">${data.best_streak.streak}</span>
        <span class="dash-streak-name">${data.best_streak.name}</span>
      </div>
    `;
  } else {
    bsEl.style.display = 'none';
  }

  // Habits list
  const habitsEl = document.getElementById('dash-habits');
  if (!data.habits.all.length) {
    habitsEl.innerHTML = '<div class="empty" style="padding:16px 0">No habits yet</div>';
  } else {
    habitsEl.innerHTML = data.habits.all.map(h => `
      <div class="dash-habit-row">
        <div class="dash-habit-dot" style="background:${h.color || '#4f46e5'}"></div>
        <span class="dash-habit-name">${h.name}</span>
        <span class="dash-habit-streak">${h.current_streak > 0 ? '🔥 ' + h.current_streak : ''}</span>
        <span class="dash-habit-check ${h.completed_today ? 'done' : ''}">${h.completed_today ? '✓' : ''}</span>
      </div>
    `).join('');
  }

  // Due today
  const dueTodayBlock = document.getElementById('dash-due-today-block');
  const dueTodayEl = document.getElementById('dash-due-today');
  if (!data.tasks.due_today.length) {
    dueTodayBlock.style.display = 'none';
  } else {
    dueTodayEl.innerHTML = data.tasks.due_today.map(t => `
      <div class="dash-task-row overdue-text">${t.title}</div>
    `).join('');
  }

  // Due soon
  const dueSoonBlock = document.getElementById('dash-due-soon-block');
  const dueSoonEl = document.getElementById('dash-due-soon');
  if (!data.tasks.due_soon.length) {
    dueSoonBlock.style.display = 'none';
  } else {
    dueSoonEl.innerHTML = data.tasks.due_soon.map(t => {
      const days = Math.round((new Date(t.due_date + 'T12:00:00') - new Date()) / 86400000);
      const label = days === 1 ? 'tomorrow' : `in ${days} days`;
      return `<div class="dash-task-row"><span>${t.title}</span><span class="dash-task-due">${label}</span></div>`;
    }).join('');
  }
}
