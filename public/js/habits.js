let habits = [];

async function loadHabits() {
  habits = await api.get('/api/habits');
  renderHabits();
}

function renderHabits() {
  const list = document.getElementById('habit-list');
  if (!habits.length) {
    list.innerHTML = '<div class="empty">No habits yet — add one above!</div>';
    return;
  }
  list.innerHTML = habits.map(h => `
    <div class="habit-card" data-id="${h.id}">
      <div class="habit-check ${h.completed_today ? 'done' : ''}" onclick="toggleHabit(event,${h.id},${h.completed_today})">
        ${h.completed_today ? '✓' : ''}
      </div>
      <div class="habit-info" onclick="openHeatmap(${h.id},'${escHtml(h.name)}')">
        <div class="habit-name">${escHtml(h.name)}</div>
        <div class="habit-freq">${h.frequency}</div>
      </div>
      <div class="habit-streak">${h.current_streak > 0 ? '🔥 ' + h.current_streak : '—'}</div>
      <div class="habit-delete" onclick="deleteHabit(event,${h.id})">✕</div>
    </div>
  `).join('');
}

async function toggleHabit(e, id, completedToday) {
  e.stopPropagation();
  if (completedToday) {
    await api.delete(`/api/habits/${id}/complete`);
  } else {
    await api.post(`/api/habits/${id}/complete`, {});
  }
  await loadHabits();
}

async function deleteHabit(e, id) {
  e.stopPropagation();
  if (!confirm('Delete this habit?')) return;
  await api.delete(`/api/habits/${id}`);
  await loadHabits();
}

async function submitHabit() {
  const name = document.getElementById('habit-name').value.trim();
  const frequency = document.getElementById('habit-frequency').value;
  const color = document.getElementById('habit-color').value;
  if (!name) return;
  await api.post('/api/habits', { name, frequency, color });
  document.getElementById('habit-name').value = '';
  document.getElementById('habit-add-form').classList.remove('open');
  await loadHabits();
}

async function openHeatmap(habitId, habitName) {
  const history = await api.get(`/api/streaks/${habitId}/history?days=30`);
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('heatmap-title').textContent = habitName + ' — last 30 days';
  const grid = document.getElementById('heatmap-grid');
  grid.innerHTML = history.map(d => `
    <div class="heatmap-cell ${d.completed ? 'done' : ''} ${d.date === today ? 'today' : ''}" title="${d.date}"></div>
  `).join('');
  document.getElementById('heatmap-modal').classList.add('open');
}

function closeHeatmap() {
  document.getElementById('heatmap-modal').classList.remove('open');
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
