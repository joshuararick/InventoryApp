'use strict';
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic();
const MODEL = process.env.CHAT_MODEL || 'claude-sonnet-4-6';

async function chat(userMessage, history, context) {
  const systemPrompt = `You are Jarvis, a personal AI assistant built into "Ai Army" — a life-automation app.

Current user context:
${context}

Be concise, warm, and practical. Help with habits, tasks, and productivity.
Today's date: ${new Date().toISOString().split('T')[0]}`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [...history, { role: 'user', content: userMessage }],
  });

  return response.content.find(b => b.type === 'text')?.text || '';
}

async function rankTasks(tasks) {
  return tasks;
}

module.exports = { chat, rankTasks };
