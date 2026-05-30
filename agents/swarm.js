'use strict';
const Anthropic = require('@anthropic-ai/sdk');
const { buildFeature } = require('./builder');

const client = new Anthropic();

const AGENT_TYPES = {
  ui: {
    name: 'UI Agent',
    focus: 'frontend improvements — visual design, animations, accessibility, mobile UX',
  },
  backend: {
    name: 'Backend Agent',
    focus: 'API endpoints, database queries, performance, new data features',
  },
  habits: {
    name: 'Habits Agent',
    focus: 'habit tracking features — streaks, analytics, reminders, gamification',
  },
  tasks: {
    name: 'Tasks Agent',
    focus: 'task management — filtering, sorting, recurring tasks, time tracking',
  },
  dashboard: {
    name: 'Dashboard Agent',
    focus: 'data visualization, summaries, insights, charts, weekly reviews',
  },
};

async function spawnAgent(agentType, context, log) {
  const agent = AGENT_TYPES[agentType] || AGENT_TYPES.ui;
  log(`[spawn] Spawning ${agent.name} for: ${context}`);

  const prompt = `You are the ${agent.name} for "Ai Army" — a personal life-automation web app.
Your specialty: ${agent.focus}

Current context: ${context}

The app has:
- Habits tab: track daily/weekdays/weekly habits with streaks and 30-day heatmap
- Tasks tab: priority-ordered todo list with drag-to-reorder
- Dashboard tab: stats (habits today, tasks this week, best streak, due dates)
- Dark mode toggle
- Stack: Express 5, better-sqlite3, vanilla HTML/CSS/JS

Generate ONE specific, implementable feature that fits your specialty and the current context.
It must be buildable in under 200 lines of code with no new npm packages.

Respond with JSON only:
{
  "title": "Feature name",
  "description": "2-3 sentence implementation spec",
  "category": "${agentType}"
}`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content.find(b => b.type === 'text')?.text || '{}';
  try {
    const idea = JSON.parse(text.trim());
    log(`[spawn] ${agent.name} proposed: "${idea.title}"`);
    return idea;
  } catch (e) {
    log(`[spawn] ${agent.name} failed to parse response`);
    return null;
  }
}

async function runAgentSwarm(completedFeatures, log) {
  log('[swarm] Analyzing app state and spawning specialized agents...');

  const context = completedFeatures.length > 0
    ? `Recently completed: ${completedFeatures.slice(-3).map(f => f.title).join(', ')}`
    : 'App is freshly built with basic habits, tasks, and dashboard';

  // Spawn 3 different specialized agents in parallel
  const agentTypes = Object.keys(AGENT_TYPES);
  const chosen = agentTypes.sort(() => Math.random() - 0.5).slice(0, 3);

  const ideas = await Promise.all(
    chosen.map(type => spawnAgent(type, context, log).catch(() => null))
  );

  return ideas.filter(Boolean);
}

module.exports = { spawnAgent, runAgentSwarm, AGENT_TYPES };
