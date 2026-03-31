// 本地 MCP HTTP 搜索服务
// 运行方式: npx tsx server.ts
// 前端调用: http://localhost:3001/search?q=搜索内容

import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// 搜索端点
app.get('/search', async (req, res) => {
  const query = req.query.q as string;
  if (!query) {
    return res.status(400).json({ error: 'Missing query' });
  }

  try {
    // 直接调用 MCP MiniMax web search
    const searchResults = await mcp__MiniMax__web_search({ query });

    if (searchResults && searchResults.organic && searchResults.organic.length > 0) {
      const topResults = searchResults.organic.slice(0, 3);
      const results = topResults.map((r: any, i: number) => ({
        title: r.title || '无标题',
        body: r.snippet?.substring(0, 80) || '无摘要',
        link: r.link || ''
      }));

      return res.json({ results });
    }

    return res.json({ results: [{ title: '无结果', body: '未找到相关信息', link: '' }] });
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ error: 'Search failed' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`MCP Search Proxy running on http://localhost:${PORT}`);
  console.log(`Usage: http://localhost:${PORT}/search?q=你的搜索内容`);
});
