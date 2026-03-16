// src/index.js
// RC Performance — Meta MCP Server
// Suporta: stdio (Claude Desktop local) + HTTP JSON-RPC (VPS remoto / SAAS / N8N)

import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import express from 'express';

import { metaAdsTools, handleMetaAds } from './tools/meta-ads.js';
import { mediaTools, handleMedia } from './tools/media-library.js';
import { instagramTools, handleInstagram } from './tools/instagram.js';
import { facebookTools, handleFacebook } from './tools/facebook-pages.js';
import { claudeProxy } from './claude/proxy.js';
import { runClaude } from './claude/runner.js';

const ALL_TOOLS = [
  ...metaAdsTools,
  ...mediaTools,
  ...instagramTools,
  ...facebookTools
];

const META_ADS_TOOLS = new Set(metaAdsTools.map(t => t.name));
const MEDIA_TOOLS    = new Set(mediaTools.map(t => t.name));
const IG_TOOLS       = new Set(instagramTools.map(t => t.name));
const FB_TOOLS       = new Set(facebookTools.map(t => t.name));

async function routeTool(name, args) {
  if (META_ADS_TOOLS.has(name)) return handleMetaAds(name, args);
  if (MEDIA_TOOLS.has(name))    return handleMedia(name, args);
  if (IG_TOOLS.has(name))       return handleInstagram(name, args);
  if (FB_TOOLS.has(name))       return handleFacebook(name, args);
  throw new Error(`Tool não encontrada: ${name}`);
}

// ─── MODO: STDIO ──────────────────────────────────────────
async function startStdio() {
  const server = new Server(
    { name: 'rc-meta-mcp', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: ALL_TOOLS }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      const result = await routeTool(name, args || {});
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Erro: ${error.message}` }], isError: true };
    }
  });
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('RC Meta MCP rodando em STDIO');
}

// ─── MODO: HTTP ───────────────────────────────────────────
async function startHttp() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  const PORT = process.env.PORT || 3000;
  const API_KEY = process.env.MCP_API_KEY;

  // ── CORS global ──
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, mcp-session-id');
    if (req.method === 'OPTIONS') return res.status(204).end();
    next();
  });

  const auth = (req, res, next) => {
    if (!API_KEY) return next();
    const key =
      req.headers['x-api-key'] ||
      req.headers['authorization']?.replace('Bearer ', '') ||
      req.query.key;
    if (key !== API_KEY) return res.status(401).json({ error: 'Não autorizado.' });
    next();
  };

  // ── Health ──
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', server: 'rc-meta-mcp', version: '1.0.0' });
  });

  // ── Tools REST (SAAS / N8N) ──
  app.get('/tools', auth, (req, res) => {
    res.json({ tools: ALL_TOOLS, total: ALL_TOOLS.length });
  });

  app.post('/tools/:toolName', auth, async (req, res) => {
    const { toolName } = req.params;
    try {
      const result = await routeTool(toolName, req.body || {});
      res.json({ success: true, tool: toolName, data: result });
    } catch (error) {
      res.status(400).json({ success: false, tool: toolName, error: error.message });
    }
  });

  // ── MCP GET — SSE para Claude.ai descobrir o endpoint ──
  app.get('/mcp', auth, (req, res) => {
    const accept = req.headers['accept'] || '';

    // Claude.ai abre SSE para descoberta
    if (accept.includes('text/event-stream')) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      res.write(`event: endpoint\ndata: ${baseUrl}/mcp\n\n`);

      const keepalive = setInterval(() => res.write(': keepalive\n\n'), 25000);
      req.on('close', () => { clearInterval(keepalive); res.end(); });
      return;
    }

    // Fallback JSON para browsers / debug
    res.json({
      name: 'rc-meta-mcp',
      version: '1.0.0',
      description: 'RC Performance — Meta Ads MCP Server',
      tools: ALL_TOOLS.length,
      protocol: 'mcp/1.0'
    });
  });

  // ── MCP POST — JSON-RPC 2.0 ──
  app.post('/mcp', auth, async (req, res) => {
    // Suporte a batch (array) e single request
    const isBatch = Array.isArray(req.body);
    const requests = isBatch ? req.body : [req.body];
    const responses = [];

    for (const request of requests) {
      const { method, params, id } = request;

      if (method === 'initialize') {
        responses.push({
          jsonrpc: '2.0', id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: {} },
            serverInfo: { name: 'rc-meta-mcp', version: '1.0.0' }
          }
        });
        continue;
      }

      if (method === 'notifications/initialized' || method === 'ping') {
        // Notificações não retornam resposta
        continue;
      }

      try {
        let result;

        if (method === 'tools/list') {
          result = { tools: ALL_TOOLS };

        } else if (method === 'tools/call') {
          const data = await routeTool(params.name, params.arguments || {});
          result = { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };

        } else {
          responses.push({
            jsonrpc: '2.0', id,
            error: { code: -32601, message: `Método não encontrado: ${method}` }
          });
          continue;
        }

        responses.push({ jsonrpc: '2.0', id, result });

      } catch (error) {
        responses.push({
          jsonrpc: '2.0', id,
          error: { code: -32000, message: error.message }
        });
      }
    }

    // Se não houver respostas (só notificações), retorna 204
    if (responses.length === 0) return res.status(204).end();

    res.json(isBatch ? responses : responses[0]);
  });

  // ── Claude Proxy (chamadas diretas à API — ex: Reunioes) ──
  app.post('/claude/proxy', auth, async (req, res) => {
    try {
      const { model, max_tokens, system, messages } = req.body;
      const data = await claudeProxy({ model, max_tokens, system, messages });
      res.json(data);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ── Claude Run (Agent SDK headless — ex: RelatoriosIA) ──
  app.post('/claude/run', auth, async (req, res) => {
    try {
      const { prompt, allowedTools, maxTurns } = req.body;
      const data = await runClaude({ prompt, allowedTools, maxTurns });
      res.json({ success: true, ...data });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.listen(PORT, () => {
    console.log(`RC Meta MCP HTTP na porta ${PORT}`);
  });
}

// ─── INICIALIZAÇÃO ────────────────────────────────────────
const mode = process.env.MCP_MODE || 'stdio';
if (mode === 'http') startHttp();
else startStdio();
