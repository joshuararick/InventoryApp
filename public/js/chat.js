'use strict';

let chatLoaded = false;

async function loadChatHistory() {
  try {
    const msgs = await api.get('/api/chat/history?limit=50');
    renderMessages(msgs);
    scrollChat();
    chatLoaded = true;
  } catch (e) {
    document.getElementById('chat-messages').innerHTML =
      '<div class="chat-empty">Could not load history.</div>';
  }
}

function renderMessages(msgs) {
  const el = document.getElementById('chat-messages');
  if (!msgs.length) {
    el.innerHTML = '<div class="chat-empty">Ask Jarvis anything about your habits, tasks, or goals.</div>';
    return;
  }
  el.innerHTML = msgs.map(m => `
    <div class="chat-bubble ${m.role}">
      <div class="bubble-text">${safeText(m.content)}</div>
    </div>
  `).join('');
}

function safeText(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}

function scrollChat() {
  const el = document.getElementById('chat-messages');
  el.scrollTop = el.scrollHeight;
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const btn = document.getElementById('chat-send-btn');
  const message = input.value.trim();
  if (!message) return;

  input.value = '';
  input.disabled = true;
  btn.disabled = true;
  autoResizeInput(input);

  const el = document.getElementById('chat-messages');
  // Remove empty state if present
  el.querySelector('.chat-empty')?.remove();

  // Append user bubble
  const userBubble = document.createElement('div');
  userBubble.className = 'chat-bubble user';
  userBubble.innerHTML = `<div class="bubble-text">${safeText(message)}</div>`;
  el.appendChild(userBubble);

  // Append thinking indicator
  const thinking = document.createElement('div');
  thinking.className = 'chat-bubble assistant';
  thinking.innerHTML = '<div class="bubble-text"><span class="dots"><span></span><span></span><span></span></span></div>';
  el.appendChild(thinking);
  scrollChat();

  try {
    const data = await api.post('/api/chat', { message });
    thinking.innerHTML = `<div class="bubble-text">${safeText(data.reply)}</div>`;
  } catch (e) {
    thinking.innerHTML = `<div class="bubble-text" style="color:var(--danger)">Error: ${safeText(e.message)}. Make sure ANTHROPIC_API_KEY is in your .env file.</div>`;
  }

  input.disabled = false;
  btn.disabled = false;
  scrollChat();
  input.focus();
}

function handleChatKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function autoResizeInput(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('chat-input');
  if (input) input.addEventListener('input', () => autoResizeInput(input));
});
