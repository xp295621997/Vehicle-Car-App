// 本地 SSE 搜索服务
// 运行方式: npx tsx search-sse-server.ts
// 前端通过 SSE 连接获取搜索结果

import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// 存储搜索请求
const searchRequests = new Map<string, { resolve: (value: any) => void; reject: (error: any) => void }>();
let requestId = 0;

// SSE 端点 - 前端连接这个来获取搜索结果
app.get('/sse', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // 发送连接成功消息
  res.write(`data: {"type": "connected"}\n\n`);

  // 心跳
  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
  });
});

// 搜索端点 - 前端调用这个发起搜索
app.get('/search', async (req, res) => {
  const query = req.query.q as string;
  if (!query) {
    return res.status(400).json({ error: 'Missing query' });
  }

  const id = `search_${++requestId}_${Date.now()}`;

  // 返回搜索ID给前端，前端可以通过轮询或另一个接口获取结果
  // 这里简化为直接返回，我们会在另一个地方处理 MCP 调用
  res.json({ searchId: id, query });
});

// 获取搜索结果
app.get('/result/:id', (req, res) => {
  const { id } = req.params;
  const request = searchRequests.get(id);

  if (!request) {
    return res.status(404).json({ error: 'Search not found or still processing' });
  }

  res.json({ status: 'done', searchId: id });
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`Search SSE Server running on http://localhost:${PORT}`);
  console.log(`
Usage:
  - 前端连接 SSE: http://localhost:${PORT}/sse
  - 发起搜索: http://localhost:${PORT}/search?q=内容
  - 获取结果: http://localhost:${PORT}/result/:id

注意：这个服务需要配合 Claude Code 的 MCP 搜索使用。
在 Claude Code 对话中，当用户需要联网搜索时，请调用 mcp__MiniMax__web_search 并将结果保存到 ./search-results.json 文件。
前端可以轮询读取这个文件来获取搜索结果。
`);
});
