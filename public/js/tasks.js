let tasks = [];
let dragSrcId = null;

async function loadTasks() {
  tasks = await api.get('/api/tasks?status=todo');
  renderTasks();
}

function renderTasks() {
  const list = document.getElementById('task-list');
  const today = new Date().toISOString().slice(0, 10);
  if (!tasks.length) {
    list.innerHTML = '<div class="empty">No tasks — you\'re all caught up!</div>';
    return;
  }
  list.innerHTML = tasks.map(t => {
    const overdue = t.due_date && t.due_date < today;
    return `
      <div class="task-card" data-id="${t.id}" draggable="true">
        <div class="drag-handle">⠿</div>
        <div class="task-check" onclick="completeTask(${t.id})"></div>
        <div class="task-body">
          <div class="task-title">${escHtml(t.title)}</div>
          ${t.due_date ? `<div class="task-meta ${overdue ? 'overdue' : ''}">Due ${t.due_date}</div>` : ''}
        </div>
        <div class="task-delete" onclick="deleteTask(${t.id})">✕</div>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.task-card').forEach(card => {
    card.addEventListener('dragstart', onDragStart);
    card.addEventListener('dragover', onDragOver);
    card.addEventListener('drop', onDrop);
    card.addEventListener('dragend', onDragEnd);
  });
}

function onDragStart(e) {
  dragSrcId = parseInt(e.currentTarget.dataset.id);
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function onDragOver(e) {
  e.preventDefault();
  document.querySelectorAll('.task-card').forEach(c => c.classList.remove('drag-over'));
  e.currentTarget.classList.add('drag-over');
  e.dataTransfer.dropEffect = 'move';
}

async function onDrop(e) {
  e.preventDefault();
  const targetId = parseInt(e.currentTarget.dataset.id);
  if (dragSrcId === targetId) return;

  const srcIdx = tasks.findIndex(t => t.id === dragSrcId);
  const tgtIdx = tasks.findIndex(t => t.id === targetId);
  const reordered = [...tasks];
  const [moved] = reordered.splice(srcIdx, 1);
  reordered.splice(tgtIdx, 0, moved);
  tasks = reordered;

  renderTasks();
  await api.post('/api/tasks/reorder', { ordered_ids: tasks.map(t => t.id) });
}

function onDragEnd(e) {
  document.querySelectorAll('.task-card').forEach(c => {
    c.classList.remove('dragging', 'drag-over');
  });
}

async function completeTask(id) {
  await api.post(`/api/tasks/${id}/complete`, {});
  await loadTasks();
}

async function deleteTask(id) {
  if (!confirm('Delete this task?')) return;
  await api.delete(`/api/tasks/${id}`);
  await loadTasks();
}

async function submitTask() {
  const title = document.getElementById('task-title').value.trim();
  const due_date = document.getElementById('task-due').value || undefined;
  if (!title) return;
  await api.post('/api/tasks', { title, due_date });
  document.getElementById('task-title').value = '';
  document.getElementById('task-due').value = '';
  document.getElementById('task-add-form').classList.remove('open');
  await loadTasks();
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
