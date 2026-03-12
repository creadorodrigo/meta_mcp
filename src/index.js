// src/index.js
// RC Performance — Meta MCP Server
// Suporta: stdio (Claude Desktop local) + HTTP Streamable (VPS remoto / SAAS / N8N)

import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import express from 'express';

import { metaAdsTools, handleMetaAds } from './tools/meta-ads.js';
import { mediaTools, handleMedia } from './tools/media-library.js';
import { instagramTools, handleInstagram } from './tools/instagram.js';
import { facebookTools, handleFacebook } from './tools/facebook-pages.js';

// ─── TODAS AS TOOLS ───────────────────────────────────────
const ALL_TOOLS = [
  ...metaAdsTools,
  ...mediaTools,
  ...instagramTools,
  ...facebookTools
];

// Prefixos para roteamento
const META_ADS_TOOLS = new Set(metaAdsTools.map(t => t.name));
const MEDIA_TOOLS    = new Set(mediaTools.map(t => t.name));
const IG_TOOLS       = new Set(instagramTools.map(t => t.name));
const FB_TOOLS       = new Set(facebookTools.map(t => t.name));

// ─── ROTEADOR DE TOOLS ────────────────────────────────────
async function routeTool(name, args) {
  if (META_ADS_TOOLS.has(name)) return handleMetaAds(name, args);
  if (MEDIA_TOOLS.has(name))    return handleMedia(name, args);
  if (IG_TOOLS.has(name))       return handleInstagram(name, args);
  if (FB_TOOLS.has(name))       return handleFacebook(name, args);
  throw new Error(`Tool não encontrada: ${name}`);
}

// ─── CRIAR SERVIDOR MCP ───────────────────────────────────
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
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `❌ Erro: ${error.message}` }],
        isError: true
      };
    }
  });

  return server;
}

// ─── MODO: STDIO (Claude Desktop local) ──────────────────
async function startStdio() {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('✅ RC Meta MCP rodando em modo STDIO (Claude Desktop)');
}

// ─── MODO: HTTP (VPS / SAAS / N8N) ───────────────────────
async function startHttp() {
  const app = express();
  app.use(express.json());

  const PORT = process.env.PORT || 3000;
  const API_KEY = process.env.MCP_API_KEY;

  // Middleware de autenticação
  const authMiddleware = (req, res, next) => {
    if (!API_KEY) return next(); // sem chave = modo dev
    const key = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    if (key !== API_KEY) {
      return res.status(401).json({ error: 'Não autorizado. Forneça x-api-key ou Authorization: Bearer <key>' });
    }
    next();
  };

  // ── Health check ──
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', server: 'rc-meta-mcp', version: '1.0.0' });
  });

  // ── Listar tools disponíveis ──
  app.get('/tools', authMiddleware, (req, res) => {
    res.json({ tools: ALL_TOOLS, total: ALL_TOOLS.length });
  });

  // ── Executar uma tool (para SAAS e N8N) ──
  app.post('/tools/:toolName', authMiddleware, async (req, res) => {
    const { toolName } = req.params;
    const args = req.body || {};

    try {
      const result = await routeTool(toolName, args);
      res.json({ success: true, tool: toolName, data: result });
    } catch (error) {
      res.status(400).json({ success: false, tool: toolName, error: error.message });
    }
  });

  // ── Endpoint MCP Streamable (para Claude Desktop remoto) ──
  app.post('/mcp', authMiddleware, async (req, res) => {
    const { method, params, id } = req.body;

    try {
      let result;
      if (method === 'tools/list') {
        result = { tools: ALL_TOOLS };
      } else if (method === 'tools/call') {
        const data = await routeTool(params.name, params.arguments || {});
        result = { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } else {
        return res.json({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Método não encontrado' } });
      }

      res.json({ jsonrpc: '2.0', id, result });
    } catch (error) {
      res.json({ jsonrpc: '2.0', id, error: { code: -32000, message: error.message } });
    }
  });

  app.listen(PORT, () => {
    console.log(`✅ RC Meta MCP rodando em HTTP na porta ${PORT}`);
    console.log(`   Health:  http://localhost:${PORT}/health`);
    console.log(`   Tools:   http://localhost:${PORT}/tools`);
    console.log(`   MCP:     http://localhost:${PORT}/mcp`);
    console.log(`   API:     POST http://localhost:${PORT}/tools/<nome_da_tool>`);
  });
}

// ─── INICIALIZAÇÃO ────────────────────────────────────────
const mode = process.env.MCP_MODE || 'stdio';

if (mode === 'http') {
  startHttp();
} else {
  startStdio();
}
