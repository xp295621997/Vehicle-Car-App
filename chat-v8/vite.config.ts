import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

// 日志目录
const LOG_DIR = path.join(__dirname, 'logs');
const CONVERSATION_LOG = path.join(LOG_DIR, 'conversations');
const REALTIME_LOG = path.join(LOG_DIR, 'realtime.log');

// MCP 搜索轮询插件
const mcpSearchPlugin = () => ({
  name: 'mcp-search',
  configureServer(server) {
    // 写入搜索请求
    server.middlewares.use('/search-request.json', async (req, res) => {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          try {
            const data = JSON.parse(body);
            const requestFile = path.join(__dirname, 'public', 'search-request.json');
            fs.writeFileSync(requestFile, JSON.stringify(data));
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ status: 'ok' }));
          } catch (e) {
            res.status(500).json({ error: 'Failed to write request' });
          }
        });
      } else {
        res.status(405).json({ error: 'Method not allowed' });
      }
    });

    // 读取搜索结果（轮询端点）
    server.middlewares.use('/search-result.json', async (req, res) => {
      const resultFile = path.join(__dirname, 'public', 'search-result.json');
      try {
        if (fs.existsSync(resultFile)) {
          const data = fs.readFileSync(resultFile, 'utf-8');
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
          res.end(data);
        } else {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.end(JSON.stringify({ status: 'idle', results: [] }));
        }
      } catch (e) {
        res.status(500).json({ error: 'Failed to read result' });
      }
    });

    // 写入对话日志
    server.middlewares.use('/api/logger', async (req, res) => {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            const { type, userQuery, assistantResponse, action, step, query } = data;

            // 确保目录存在
            if (!fs.existsSync(LOG_DIR)) {
              fs.mkdirSync(LOG_DIR, { recursive: true });
            }
            if (!fs.existsSync(CONVERSATION_LOG)) {
              fs.mkdirSync(CONVERSATION_LOG, { recursive: true });
            }

            const now = new Date();
            const timestamp = now.toISOString();
            const today = timestamp.split('T')[0];

            if (type === 'conversation') {
              // 写入对话历史
              const logFile = path.join(CONVERSATION_LOG, `${today}.json`);
              let conversations = [];

              if (fs.existsSync(logFile)) {
                try {
                  conversations = JSON.parse(fs.readFileSync(logFile, 'utf-8'));
                } catch (e) {
                  conversations = [];
                }
              }

              conversations.push({
                id: conversations.length + 1,
                timestamp,
                userQuery,
                assistantResponse,
                action,
              });

              fs.writeFileSync(logFile, JSON.stringify(conversations, null, 2), 'utf-8');

              // 写入实时日志
              const logEntry = `[${timestamp}] [对话 #${conversations.length}] 用户: ${userQuery}\n`;
              fs.appendFileSync(REALTIME_LOG, logEntry);
            } else if (type === 'step') {
              // 写入推理步骤
              const logEntry = `[${timestamp}] [推理] ${step}\n`;
              fs.appendFileSync(REALTIME_LOG, logEntry);
            } else if (type === 'search') {
              // 写入搜索过程
              const logEntry = `[${timestamp}] [搜索] ${query}\n`;
              fs.appendFileSync(REALTIME_LOG, logEntry);
            }

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ status: 'ok' }));
          } catch (e) {
            res.status(500).json({ error: 'Failed to write log' });
          }
        });
      } else {
        res.status(405).json({ error: 'Method not allowed' });
      }
    });

    // 读取实时日志
    server.middlewares.use('/api/logger/realtime', async (req, res) => {
      try {
        if (fs.existsSync(REALTIME_LOG)) {
          const data = fs.readFileSync(REALTIME_LOG, 'utf-8');
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end(data);
        } else {
          res.end('');
        }
      } catch (e) {
        res.status(500).json({ error: 'Failed to read log' });
      }
    });

    // 读取对话历史
    server.middlewares.use('/api/logger/conversations', async (req, res) => {
      const url = new URL(req.url || '', 'http://localhost');
      const date = url.searchParams.get('date');

      let logFile;
      if (date) {
        logFile = path.join(CONVERSATION_LOG, `${date}.json`);
      } else {
        const today = new Date().toISOString().split('T')[0];
        logFile = path.join(CONVERSATION_LOG, `${today}.json`);
      }

      try {
        if (fs.existsSync(logFile)) {
          const data = fs.readFileSync(logFile, 'utf-8');
          res.setHeader('Content-Type', 'application/json');
          res.end(data);
        } else {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify([]));
        }
      } catch (e) {
        res.status(500).json({ error: 'Failed to read conversations' });
      }
    });

    // MCP 搜索端点 - 直接调用 MCP MiniMax web search
    server.middlewares.use('/api/mcp-search', async (req, res) => {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          try {
            const { query } = JSON.parse(body);

            if (!query) {
              res.status(400).json({ error: 'Missing query' });
              return;
            }

            console.log(`[MCP API] Searching for: ${query}`);

            // 动态导入 MCP SDK
            const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
            const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');

            // 创建 MCP 客户端
            const transport = new StdioClientTransport({
              command: 'uvx',
              args: ['minimax-coding-plan-mcp'],
              env: {
                ...process.env,
                MINIMAX_API_KEY: 'sk-cp-BZ4zKCQCkeKCu9SdhItjlNAv6KGBAh_BpuZM9EK9H9KJJ7aekei6HVBPr5lWJwaxf2upVayoA0ELAUhFr8pfS0CttjEAmBYYb96254l-zQbaMRxuXHeAB_w',
                MINIMAX_MCP_BASE_PATH: '/Users/mi/Desktop/Claude Code/Chatbox',
                MINIMAX_API_HOST: 'https://api.minimaxi.com',
                MINIMAX_API_RESOURCE_MODE: 'local'
              }
            });

            const client = new Client({
              name: 'chatbox-search-client',
              version: '1.0.0'
            }, {
              capabilities: {}
            });

            await client.connect(transport);

            // 调用 MCP 工具
            const result = await client.callTool({
              name: 'web_search',
              arguments: { query }
            });

            // 解析结果
            let results = [];
            if (result && result.content) {
              try {
                const parsed = JSON.parse(result.content[0].text);
                if (parsed.organic) {
                  results = parsed.organic.map(item => ({
                    title: item.title || '',
                    body: item.snippet || '',
                    link: item.link || ''
                  }));
                }
              } catch (e) {
                results = [{
                  title: '搜索结果',
                  body: result.content[0].text,
                  link: ''
                }];
              }
            }

            console.log(`[MCP API] Found ${results.length} results`);

            // 保存搜索记录到按日汇总的文件
            const SEARCH_LOG_DIR = path.join(__dirname, 'logs', 'search');
            const today = new Date().toISOString().split('T')[0];
            const searchLogFile = path.join(SEARCH_LOG_DIR, `${today}.json`);

            // 确保目录存在
            if (!fs.existsSync(SEARCH_LOG_DIR)) {
              fs.mkdirSync(SEARCH_LOG_DIR, { recursive: true });
            }

            // 读取现有记录或创建新记录
            let searchHistory = [];
            if (fs.existsSync(searchLogFile)) {
              try {
                searchHistory = JSON.parse(fs.readFileSync(searchLogFile, 'utf-8'));
              } catch (e) {
                searchHistory = [];
              }
            }

            // 追加新的搜索记录
            searchHistory.push({
              id: searchHistory.length + 1,
              timestamp: new Date().toISOString(),
              query: query,
              results: results
            });

            // 写入文件
            fs.writeFileSync(searchLogFile, JSON.stringify(searchHistory, null, 2), 'utf-8');
            console.log(`[MCP API] Search history saved to ${searchLogFile}`);

            // 同时更新 search-result.json（保持兼容性）
            const resultFile = path.join(__dirname, 'public', 'search-result.json');
            fs.writeFileSync(resultFile, JSON.stringify({
              query: query,
              status: 'done',
              results: results
            }, null, 2), 'utf-8');

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              status: 'done',
              results
            }));

          } catch (error) {
            console.error('[MCP API] Error:', error);
            res.status(500).json({
              error: error.message
            });
          }
        });
      } else {
        res.status(405).json({ error: 'Method not allowed' });
      }
    });
  }
});

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    mcpSearchPlugin(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'figma:asset': path.resolve(__dirname, './src/assets'),
    },
  },
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
