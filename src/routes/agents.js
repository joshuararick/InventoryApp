'use strict';
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const STATUS_PATH = path.resolve(__dirname, '../../agents/status.json');
const BACKLOG_PATH = path.resolve(__dirname, '../../agents/backlog.json');

router.get('/status', (req, res) => {
  let status = {};
  let backlog = { features: [], completed: [] };
  try { status = JSON.parse(fs.readFileSync(STATUS_PATH, 'utf8')); } catch {}
  try { backlog = JSON.parse(fs.readFileSync(BACKLOG_PATH, 'utf8')); } catch {}

  res.json({
    building: status.building || null,
    buildStarted: status.buildStarted || null,
    lastBuilt: status.lastBuilt || null,
    lastBuiltAt: status.lastBuiltAt || null,
    swarm: status.swarm || 'idle',
    lastSwarmIdeas: status.lastSwarmIdeas || [],
    lastError: status.lastError || null,
    updatedAt: status.updatedAt || null,
    queue: backlog.features
      .filter(f => f.status === 'pending')
      .sort((a, b) => a.priority - b.priority)
      .map(f => ({ id: f.id, title: f.title, category: f.category })),
    completed: backlog.completed
      .slice(-5)
      .reverse()
      .map(f => ({ title: f.title, completedAt: f.completedAt })),
  });
});

module.exports = router;
