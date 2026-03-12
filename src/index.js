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
  app.use(express.json());

  const PORT = process.env.PORT || 3000;
  const API_KEY = process.env.MCP_API_KEY;

  const auth = (req, res, next) => {
    if (!API_KEY) return next();
    const key = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    if (key !== API_KEY) return res.status(401).json({ error: 'Não autorizado. Forneça x-api-key ou Authorization: Bearer <key>' });
    next();
  };

  // Health
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', server: 'rc-meta-mcp', version: '1.0.0' });
  });

  // Listar tools
  app.get('/tools', auth, (req, res) => {
    res.json({ tools: ALL_TOOLS, total: ALL_TOOLS.length });
  });

  // Executar tool (SAAS / N8N)
  app.post('/tools/:toolName', auth, async (req, res) => {
    const { toolName } = req.params;
    try {
      const result = await routeTool(toolName, req.body || {});
      res.json({ success: true, tool: toolName, data: result });
    } catch (error) {
      res.status(400).json({ success: false, tool: toolName, error: error.message });
    }
  });

  // ── MCP Streamable (Claude Desktop remoto / Claude.ai) ──
  // GET → info do servidor (descoberta)
  app.get('/mcp', auth, (req, res) => {
    res.json({
      name: 'rc-meta-mcp',
      version: '1.0.0',
      description: 'RC Performance — Meta Ads MCP Server',
      tools: ALL_TOOLS.length,
      protocol: 'mcp/1.0'
    });
  });

  // POST → JSON-RPC 2.0
  app.post('/mcp', auth, async (req, res) => {
    const { method, params, id } = req.body;

    if (method === 'initialize') {
      return res.json({
        jsonrpc: '2.0', id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'rc-meta-mcp', version: '1.0.0' }
        }
      });
    }

    if (method === 'notifications/initialized') {
      return res.status(204).end();
    }

    try {
      let result;
      if (method === 'tools/list') {
        result = { tools: ALL_TOOLS };
      } else if (method === 'tools/call') {
        const data = await routeTool(params.name, params.arguments || {});
        result = { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } else {
        return res.json({ jsonrpc: '2.0', id, error: { code: -32601, message: `Método não encontrado: ${method}` } });
      }
      res.json({ jsonrpc: '2.0', id, result });
    } catch (error) {
      res.json({ jsonrpc: '2.0', id, error: { code: -32000, message: error.message } });
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
