// MCP 搜索 API - MiniMax
const MINIMAX_API_KEY = 'sk-cp-BZ4zKCQCkeKCu9SdhItjlNAv6KGBAh_BpuZM9EK9H9KJJ7aekei6HVBPr5lWJwaxf2upVayoA0ELAUhFr8pfS0CttjEAmBYYb96254l-zQbaMRxuXHeAB_w';

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    if (!query) {
      return Response.json({ error: 'Missing query' }, { status: 400 });
    }

    // 使用 MiniMax 对话API进行搜索
    const response = await fetch('https://api.minimaxi.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'abab6.5s-chat',
        messages: [
          {
            role: 'user',
            content: `请搜索以下内容并返回搜索结果：${query}\n\n请以JSON格式返回结果，格式如下：\n{"results": [{"title": "标题", "body": "摘要(80字以内)", "link": "链接"}]}`,
          }
        ],
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // 尝试解析返回的 JSON
    try {
      // 尝试提取 JSON 部分
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return Response.json(result);
      }
    } catch (e) {
      // 解析失败，返回原始内容
    }

    return Response.json({
      results: [{
        title: query,
        body: content.substring(0, 80) || '搜索完成',
        link: ''
      }]
    });
  } catch (error: any) {
    console.error('[Search API] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
