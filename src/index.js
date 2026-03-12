// src/index.js
import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import express from 'express';

import { metaAdsTools, handleMetaAds } from './tools/meta-ads.js';
import { mediaTools, handleMedia } from './tools/media-library.js';
import { instagramTools, handleInstagram } from './tools/instagram.js';
import { facebookTools, handleFacebook } from './tools/facebook-pages.js';

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

function createMcpServer() {
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
  return server;
}

// ─── MODO: STDIO ──────────────────────────────────────────
async function startStdio() {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('RC Meta MCP rodando em STDIO');
}

// ─── MODO: HTTP ───────────────────────────────────────────
async function startHttp() {
  const app = express();
  app.use(express.json());

  const PORT = process.env.PORT || 3000;
  const API_KEY = process.env.MCP_API_KEY;

  // CORS
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

  // Health
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', server: 'rc-meta-mcp', version: '1.0.0' });
  });

  // Tools REST (SAAS / N8N)
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

  // ── MCP Streamable HTTP (Claude.ai) ──
  const sessions = new Map();

  app.all('/mcp', auth, async (req, res) => {
    try {
      const sessionId = req.headers['mcp-session-id'];

      if (req.method === 'POST') {
        const body = req.body;

        // Nova sessão: initialize
        if (!sessionId && body?.method === 'initialize') {
          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => crypto.randomUUID(),
          });
          const server = createMcpServer();
          await server.connect(transport);

          transport.on('close', () => {
            if (transport.sessionId) sessions.delete(transport.sessionId);
          });

          await transport.handleRequest(req, res, body);

          if (transport.sessionId) {
            sessions.set(transport.sessionId, transport);
          }
          return;
        }

        // Sessão existente
        if (sessionId && sessions.has(sessionId)) {
          const transport = sessions.get(sessionId);
          await transport.handleRequest(req, res, body);
          return;
        }

        return res.status(400).json({ error: 'Sessão inválida ou expirada.' });
      }

      if (req.method === 'GET') {
        if (sessionId && sessions.has(sessionId)) {
          const transport = sessions.get(sessionId);
          await transport.handleRequest(req, res);
          return;
        }
        return res.status(400).json({ error: 'Session ID inválido.' });
      }

      if (req.method === 'DELETE') {
        if (sessionId && sessions.has(sessionId)) {
          sessions.delete(sessionId);
          return res.status(204).end();
        }
        return res.status(404).json({ error: 'Sessão não encontrada.' });
      }

    } catch (error) {
      console.error('MCP Error:', error);
      res.status(500).json({ error: error.message });
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
