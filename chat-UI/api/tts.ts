// TTS 语音合成 API
export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    // 这里需要调用 TTS 服务
    return Response.json({ audioUrl: '' });
  } catch (error) {
    return Response.json({ error: 'TTS failed' }, { status: 500 });
  }
}
