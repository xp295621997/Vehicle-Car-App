// MiniMax MCP Proxy Server - HTTP wrapper for MiniMax MCP tools
import express from 'express';
import cors from 'cors';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || 'sk-cp-BZ4zKCQCkeKCu9SdhItjlNAv6KGBAh_BpuZM9EK9H9KJJ7aekei6HVBPr5lWJwaxf2upVayoA0ELAUhFr8pfS0CttjEAmBYYb96254l-zQbaMRxuXHeAB_w';
const BASE_PATH = process.env.MINIMAX_MCP_BASE_PATH || '/Users/mi/Desktop/Claude Code/Chatbox';

// MCP client instance
let mcpClient = null;
let clientReady = false;

async function getMCPClient() {
  if (mcpClient && clientReady) {
    return mcpClient;
  }

  console.log('[MCP Proxy] Connecting to MiniMax MCP server...');

  const transport = new StdioClientTransport({
    command: 'uvx',
    args: ['minimax-coding-plan-mcp'],
    env: {
      ...process.env,
      MINIMAX_API_KEY,
      MINIMAX_MCP_BASE_PATH: BASE_PATH,
      MINIMAX_API_HOST: 'https://api.minimaxi.com',
      MINIMAX_API_RESOURCE_MODE: 'local'
    }
  });

  mcpClient = new Client({
    name: 'chatbox-mcp-proxy',
    version: '1.0.0'
  }, {
    capabilities: {}
  });

  await mcpClient.connect(transport);
  clientReady = true;
  console.log('[MCP Proxy] Connected to MiniMax MCP server');

  return mcpClient;
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', ready: clientReady });
});

// Web search endpoint
app.post('/mcp/tools/mcp__MiniMax__web_search', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Missing query' });
    }

    console.log('[MCP Proxy] Web search:', query);
    const client = await getMCPClient();
    const result = await client.callTool({
      name: 'web_search',
      arguments: { query }
    });

    res.json(result);
  } catch (error) {
    console.error('[MCP Proxy] Web search error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Image understanding endpoint
app.post('/mcp/tools/mcp__MiniMax__understand_image', async (req, res) => {
  try {
    const { prompt, image_source } = req.body;
    if (!image_source) {
      return res.status(400).json({ error: 'Missing image_source' });
    }

    console.log('[MCP Proxy] Image understanding...');
    const client = await getMCPClient();
    const result = await client.callTool({
      name: 'understand_image',
      arguments: { prompt: prompt || '请详细描述这张图片', image_source }
    });

    res.json(result);
  } catch (error) {
    console.error('[MCP Proxy] Image understanding error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3100;
app.listen(PORT, () => {
  console.log(`[MCP Proxy] Server running on port ${PORT}`);
  // Pre-connect on startup
  getMCPClient().catch(console.error);
});
