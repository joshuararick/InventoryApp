'use strict';
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic();

async function generateIdeas(existingFeatures, completedFeatures, log) {
  log('[ideator] Generating new feature ideas…');

  const existingTitles = [...existingFeatures, ...completedFeatures].map(f => `- ${f.title}`).join('\n');

  const prompt = `You are a product designer for "Ai Army" — a personal life-automation web app built with Node.js, Express, SQLite, and vanilla JS.

The app currently has three tabs: Habits (track daily habits with streaks), Tasks (priority-ordered todo list with drag-to-reorder), and Dashboard (stub).

Features already in the backlog or completed:
${existingTitles}

Generate 3 NEW feature ideas that are:
1. Small enough to implement in a single focused session (< 200 lines of code)
2. Genuinely useful for personal productivity
3. Not already in the list above
4. Buildable with the existing stack (no new npm packages)

Respond with a JSON array of exactly 3 objects, each with these fields:
{
  "title": "Short feature name",
  "description": "2-3 sentence implementation spec (what to build, which files, how it works)",
  "category": "habits" | "tasks" | "dashboard" | "ui"
}

Only output the JSON array, no other text.`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content.find(b => b.type === 'text')?.text || '[]';
  try {
    const ideas = JSON.parse(text.trim());
    log(`[ideator] Generated ${ideas.length} ideas`);
    return ideas;
  } catch (e) {
    log(`[ideator] Failed to parse ideas: ${e.message}`);
    return [];
  }
}

module.exports = { generateIdeas };
