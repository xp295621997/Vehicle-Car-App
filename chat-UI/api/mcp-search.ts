// MCP 搜索 API
export async function POST(req: Request) {
  try {
    const { query } = await req.json();
    // 这里需要调用实际的搜索服务
    // 目前返回空结果，后续可以接入搜索API
    return Response.json({ results: [] });
  } catch (error) {
    return Response.json({ error: 'Search failed' }, { status: 500 });
  }
}
