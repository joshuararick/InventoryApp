'use strict';
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const path = require('path');

const config = require('./config.json');
const ROOT = path.resolve(__dirname, '../..');

// Cache connected clients so we don't reconnect every call
const clientCache = new Map();

function resolveEnv(env) {
  const out = {};
  for (const [k, v] of Object.entries(env)) {
    // Replace ${VAR} with actual env var
    out[k] = v.replace(/\$\{([^}]+)\}/g, (_, name) => process.env[name] || '');
  }
  return out;
}

async function connectServer(serverName) {
  if (clientCache.has(serverName)) return clientCache.get(serverName);

  const cfg = config.servers[serverName];
  if (!cfg) return null;

  try {
    const transport = new StdioClientTransport({
      command: cfg.command,
      args: cfg.args,
      env: { ...process.env, ...resolveEnv(cfg.env || {}) },
      cwd: ROOT,
    });

    const client = new Client({ name: 'ai-army', version: '1.0.0' }, { capabilities: {} });
    await client.connect(transport);
    clientCache.set(serverName, client);
    return client;
  } catch (err) {
    // MCP server not available — skip silently
    return null;
  }
}

async function getToolsForAgent(agentType, log) {
  const serverNames = config.agentCapabilities[agentType] || [];
  const allTools = [];

  for (const serverName of serverNames) {
    const client = await connectServer(serverName).catch(() => null);
    if (!client) continue;

    try {
      const { tools } = await client.listTools();
      for (const tool of tools) {
        allTools.push({
          name: `${serverName}__${tool.name}`,
          description: `[${serverName}] ${tool.description || tool.name}`,
          input_schema: tool.inputSchema || { type: 'object', properties: {} },
          _server: serverName,
          _originalName: tool.name,
          _client: client,
        });
      }
      if (log) log(`[mcp] ${agentType} loaded ${tools.length} tools from ${serverName}`);
    } catch (err) {
      if (log) log(`[mcp] ${serverName} tool list failed: ${err.message}`);
    }
  }

  return allTools;
}

async function callMcpTool(toolDef, input, log) {
  const { _client, _originalName, _server } = toolDef;
  if (!_client) return 'Error: MCP client not connected';
  try {
    const result = await _client.callTool({ name: _originalName, arguments: input });
    const text = result.content?.map(c => c.text || JSON.stringify(c)).join('\n') || JSON.stringify(result);
    if (log) log(`[mcp] ${_server}.${_originalName} returned ${text.length} chars`);
    return text;
  } catch (err) {
    return `Error: ${err.message}`;
  }
}

async function disconnectAll() {
  for (const client of clientCache.values()) {
    try { await client.close(); } catch {}
  }
  clientCache.clear();
}

module.exports = { getToolsForAgent, callMcpTool, disconnectAll, config };
