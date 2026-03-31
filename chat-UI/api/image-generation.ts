// 图片生成 API
export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    // 这里需要调用图片生成服务
    return Response.json({ imageUrl: '' });
  } catch (error) {
    return Response.json({ error: 'Image generation failed' }, { status: 500 });
  }
}
