#!/usr/bin/env node
'use strict';

/**
 * Ai Army — Autonomous Builder Orchestrator
 *
 * Picks the next feature from backlog.json, builds it with the builder agent,
 * then runs the ideator to top up the backlog. Repeats on a schedule.
 *
 * Usage:
 *   node agents/orchestrator.js              # run once immediately, then every 30 min
 *   node agents/orchestrator.js --once       # run once and exit
 *   INTERVAL_MINUTES=60 node agents/orchestrator.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('[orchestrator] ANTHROPIC_API_KEY not set. Add it to .env and restart.');
  process.exit(1);
}

const fs = require('fs');
const path = require('path');
const { buildFeature } = require('./builder');
const { generateIdeas } = require('./ideator');

const BACKLOG_PATH = path.resolve(__dirname, 'backlog.json');
const INTERVAL_MS = (Number(process.env.INTERVAL_MINUTES) || 30) * 60 * 1000;
const runOnce = process.argv.includes('--once');

// ── Backlog I/O ───────────────────────────────────────────────────────────────

function loadBacklog() {
  return JSON.parse(fs.readFileSync(BACKLOG_PATH, 'utf8'));
}

function saveBacklog(backlog) {
  fs.writeFileSync(BACKLOG_PATH, JSON.stringify(backlog, null, 2) + '\n', 'utf8');
}

function nextFeature(backlog) {
  return backlog.features
    .filter(f => f.status === 'pending')
    .sort((a, b) => a.priority - b.priority)[0] || null;
}

function markBuilding(backlog, feature) {
  feature.status = 'building';
  feature.startedAt = new Date().toISOString();
  saveBacklog(backlog);
}

function markDone(backlog, feature, tokens) {
  feature.status = 'done';
  feature.completedAt = new Date().toISOString();
  feature.tokens = tokens;
  backlog.completed.push(feature);
  backlog.features = backlog.features.filter(f => f.id !== feature.id);
  saveBacklog(backlog);
}

function markFailed(backlog, feature, reason) {
  feature.status = 'failed';
  feature.failReason = reason;
  feature.failedAt = new Date().toISOString();
  saveBacklog(backlog);
}

// ── Idea injection ────────────────────────────────────────────────────────────

function makeId() {
  return 'f' + Math.random().toString(36).substring(2, 7);
}

function maxPriority(backlog) {
  const all = backlog.features.concat(backlog.completed);
  return all.length ? Math.max(...all.map(f => f.priority || 0)) : 0;
}

async function topUpBacklog(backlog, log) {
  const pendingCount = backlog.features.filter(f => f.status === 'pending').length;
  if (pendingCount >= 4) {
    log(`[orchestrator] Backlog has ${pendingCount} pending — skipping ideator`);
    return;
  }

  const ideas = await generateIdeas(backlog.features, backlog.completed, log);
  let pri = maxPriority(backlog) + 1;
  for (const idea of ideas) {
    if (!idea.title || !idea.description) continue;
    backlog.features.push({
      id: makeId(),
      title: idea.title,
      description: idea.description,
      priority: pri++,
      status: 'pending',
      category: idea.category || 'ui',
      generatedByAI: true,
    });
    backlog.ideas_pool.push({ title: idea.title, addedAt: new Date().toISOString() });
    log(`[orchestrator] Added idea: "${idea.title}"`);
  }
  saveBacklog(backlog);
}

// ── Main cycle ────────────────────────────────────────────────────────────────

async function runCycle() {
  const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);
  log('[orchestrator] === Cycle start ===');

  const backlog = loadBacklog();
  const feature = nextFeature(backlog);

  if (!feature) {
    log('[orchestrator] No pending features — running ideator to refill backlog');
    await topUpBacklog(backlog, log);
    return;
  }

  log(`[orchestrator] Building: ${feature.title} (${feature.id})`);
  markBuilding(backlog, feature);

  try {
    const tokens = await buildFeature(feature, log);
    markDone(loadBacklog(), feature, tokens);
    log(`[orchestrator] ✓ Completed: ${feature.title}`);
  } catch (err) {
    log(`[orchestrator] ✗ Failed: ${err.message}`);
    markFailed(loadBacklog(), feature, err.message);
  }

  // Top up backlog after each build
  await topUpBacklog(loadBacklog(), log);
  log('[orchestrator] === Cycle end ===');
}

// ── Entry point ───────────────────────────────────────────────────────────────

(async () => {
  try {
    await runCycle();
  } catch (err) {
    console.error('[orchestrator] Unhandled error:', err);
  }

  if (runOnce) {
    process.exit(0);
  }

  console.log(`[orchestrator] Next cycle in ${INTERVAL_MS / 60000} minutes. Ctrl+C to stop.`);
  setInterval(async () => {
    try {
      await runCycle();
    } catch (err) {
      console.error('[orchestrator] Cycle error:', err);
    }
  }, INTERVAL_MS);
})();
