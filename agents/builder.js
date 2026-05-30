'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const Anthropic = require('@anthropic-ai/sdk');
const { getToolsForAgent, callMcpTool } = require('./mcps/client');

const ROOT = path.resolve(__dirname, '..');
const client = new Anthropic();

// ── Tools Claude can call ─────────────────────────────────────────────────────

const tools = [
  {
    name: 'read_file',
    description: 'Read a file from the project. Path is relative to project root.',
    input_schema: {
      type: 'object',
      properties: { path: { type: 'string', description: 'Relative file path' } },
      required: ['path'],
    },
  },
  {
    name: 'write_file',
    description: 'Write (or overwrite) a file in the project. Path is relative to project root.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative file path' },
        content: { type: 'string', description: 'Full file content to write' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'list_files',
    description: 'List files and directories under a project path. Returns a newline-separated list.',
    input_schema: {
      type: 'object',
      properties: { path: { type: 'string', description: 'Relative directory path', default: '.' } },
      required: [],
    },
  },
  {
    name: 'run_command',
    description: 'Run a safe, non-destructive shell command in the project root (e.g. npm test, node -e). No git push, no rm -rf.',
    input_schema: {
      type: 'object',
      properties: { command: { type: 'string', description: 'Shell command to run' } },
      required: ['command'],
    },
  },
];

function executeTool(name, input) {
  if (name === 'read_file') {
    const full = path.resolve(ROOT, input.path);
    if (!full.startsWith(ROOT)) return 'Error: path outside project root';
    try { return fs.readFileSync(full, 'utf8'); }
    catch (e) { return `Error reading file: ${e.message}`; }
  }

  if (name === 'write_file') {
    const full = path.resolve(ROOT, input.path);
    if (!full.startsWith(ROOT)) return 'Error: path outside project root';
    // Blocked paths
    const blocked = ['package-lock.json', '.git', 'android/', 'agents/'];
    for (const b of blocked) {
      if (input.path.startsWith(b) || input.path === b.replace(/\/$/, '')) {
        return `Error: writes to ${b} are blocked`;
      }
    }
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, input.content, 'utf8');
    return `Written ${input.path} (${input.content.length} bytes)`;
  }

  if (name === 'list_files') {
    const dir = path.resolve(ROOT, input.path || '.');
    if (!dir.startsWith(ROOT)) return 'Error: path outside project root';
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      return entries
        .filter(e => !['node_modules', '.git', 'data'].includes(e.name))
        .map(e => (e.isDirectory() ? e.name + '/' : e.name))
        .join('\n');
    } catch (e) {
      return `Error: ${e.message}`;
    }
  }

  if (name === 'run_command') {
    const banned = ['rm ', 'git push', 'git reset', 'git checkout', 'drop table', 'DROP TABLE'];
    for (const b of banned) {
      if (input.command.toLowerCase().includes(b.toLowerCase())) {
        return `Error: command blocked (contains "${b}")`;
      }
    }
    try {
      const out = execSync(input.command, { cwd: ROOT, timeout: 30000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
      return out || '(no output)';
    } catch (e) {
      return `Error: ${e.stderr || e.message}`;
    }
  }

  return `Error: unknown tool ${name}`;
}

// ── Main build function ───────────────────────────────────────────────────────

async function buildFeature(feature, log) {
  log(`\n[builder] Starting: ${feature.title}`);

  // Load MCP tools for this agent type
  const mcpTools = await getToolsForAgent(feature.category || 'ui', log).catch(() => []);
  const allTools = [...tools, ...mcpTools.map(t => ({ name: t.name, description: t.description, input_schema: t.input_schema }))];
  if (mcpTools.length) log(`[builder] MCP tools loaded: ${mcpTools.map(t => t.name).join(', ')}`);

  const mcpToolMap = Object.fromEntries(mcpTools.map(t => [t.name, t]));

  const systemPrompt = `You are an expert Node.js and vanilla-JS developer working on "Ai Army" — a personal life-automation web app.

Project stack: Express 5, better-sqlite3, vanilla HTML/CSS/JS (no frameworks).
Root: ${ROOT}
Key paths:
  src/server.js        — Express entry (mounts routes, serves static)
  src/db.js            — opens SQLite, runs schema.sql on startup
  src/schema.sql       — DDL (CREATE TABLE IF NOT EXISTS)
  src/routes/          — habits.js, tasks.js, streaks.js
  src/services/        — habitService.js, taskService.js, ai.js
  public/index.html    — single-page shell, bottom-tab nav
  public/css/app.css   — mobile-first CSS (max-width 480px)
  public/js/           — api.js, habits.js, tasks.js

You also have access to MCP tools for external integrations (GitHub, Calendar, Gmail, web search).
Use them when they help you build better features.

Rules:
- Read every file you need to understand before editing.
- Write complete file contents when you write_file (no partial diffs).
- Make the smallest focused change that ships the feature.
- Do not add comments unless the WHY is non-obvious.
- Do not add error handling for impossible scenarios.
- Do not create new npm dependencies — use only what is already installed.
- Only write files in src/, public/, or the project root. Never touch agents/ or android/.
- After writing, verify your changes make sense by reading the file back.
- When done, stop tool calls.`;

  const userMsg = `Implement this feature in the Ai Army project:

Title: ${feature.title}
Description: ${feature.description}
Category: ${feature.category}

Start by listing the relevant files, then read them, then make your changes.`;

  const messages = [{ role: 'user', content: userMsg }];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  const MODEL = process.env.BUILDER_MODEL || 'claude-sonnet-4-6';

  for (let round = 0; round < 20; round++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
      tools: allTools,
      messages,
    });

    totalInputTokens += response.usage.input_tokens;
    totalOutputTokens += response.usage.output_tokens;

    // Collect tool uses
    const toolUses = response.content.filter(b => b.type === 'tool_use');
    const textBlocks = response.content.filter(b => b.type === 'text');

    if (textBlocks.length > 0) {
      for (const tb of textBlocks) {
        if (tb.text.trim()) log(`[builder] ${tb.text.trim().substring(0, 200)}`);
      }
    }

    if (response.stop_reason === 'end_turn' || toolUses.length === 0) {
      log(`[builder] Done. tokens in=${totalInputTokens} out=${totalOutputTokens}`);
      break;
    }

    // Append assistant message
    messages.push({ role: 'assistant', content: response.content });

    // Execute tools and collect results
    const toolResults = [];
    for (const tu of toolUses) {
      log(`[builder] → ${tu.name}(${JSON.stringify(tu.input).substring(0, 80)})`);
      let result;
      if (mcpToolMap[tu.name]) {
        result = await callMcpTool(mcpToolMap[tu.name], tu.input, log);
      } else {
        result = executeTool(tu.name, tu.input);
      }
      const snippet = String(result).substring(0, 100);
      log(`[builder]   ← ${snippet}${String(result).length > 100 ? '…' : ''}`);
      toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: String(result) });
    }

    messages.push({ role: 'user', content: toolResults });
  }

  return { inputTokens: totalInputTokens, outputTokens: totalOutputTokens };
}

module.exports = { buildFeature };
