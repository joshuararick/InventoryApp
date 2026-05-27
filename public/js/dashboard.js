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

  // Load agent swarm status
  loadAgentStatus();
}

async function loadAgentStatus() {
  const el = document.getElementById('dash-agent-status');
  if (!el) return;
  let s;
  try { s = await api('GET', '/api/agents/status'); } catch { el.innerHTML = '<div class="agent-offline">Agent offline — run npm run agent</div>'; return; }

  const statusDot = s.building ? '<span class="agent-dot building"></span>' : '<span class="agent-dot idle"></span>';
  const statusText = s.building
    ? `Building: <strong>${s.building}</strong>`
    : s.lastBuilt ? `Last built: <strong>${s.lastBuilt}</strong>` : 'Idle — waiting for work';

  const queue = s.queue.length
    ? s.queue.map((f, i) => `<div class="agent-queue-item"><span class="agent-queue-num">${i + 1}</span>${f.title}<span class="agent-cat">${f.category}</span></div>`).join('')
    : '<div style="color:var(--gray-400);font-size:13px">Queue empty</div>';

  const recent = s.completed.length
    ? s.completed.map(f => `<div class="agent-done-item">✓ ${f.title}</div>`).join('')
    : '';

  el.innerHTML = `
    <div class="agent-status-row">${statusDot}<span>${statusText}</span></div>
    ${s.swarm === 'running' ? '<div class="agent-swarm-active">Swarm active — spawning agents...</div>' : ''}
    ${s.lastError ? `<div class="agent-error">Error: ${s.lastError}</div>` : ''}
    <div class="agent-section-title">Queue (${s.queue.length})</div>
    ${queue}
    ${recent ? `<div class="agent-section-title" style="margin-top:10px">Recently built</div>${recent}` : ''}
    ${s.updatedAt ? `<div class="agent-updated">Updated ${new Date(s.updatedAt).toLocaleTimeString()}</div>` : ''}
  `;
}

// Refresh agent status every 15 seconds
setInterval(() => {
  const dashActive = document.getElementById('tab-dashboard')?.classList.contains('active');
  if (dashActive) loadAgentStatus();
}, 15000);
