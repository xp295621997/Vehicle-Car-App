// 图片理解 API
export async function POST(req: Request) {
  try {
    const { imageUrl, prompt } = await req.json();
    // 这里需要调用 AI 图片理解服务
    return Response.json({ description: '图片理解服务待配置' });
  } catch (error) {
    return Response.json({ error: 'Image understanding failed' }, { status: 500 });
  }
}
