// 图片生成 API - MiniMax
const MINIMAX_API_KEY = 'sk-cp-BZ4zKCQCkeKCu9SdhItjlNAv6KGBAh_BpuZM9EK9H9KJJ7aekei6HVBPr5lWJwaxf2upVayoA0ELAUhFr8pfS0CttjEAmBYYb96254l-zQbaMRxuXHeAB_w';

export async function POST(req: Request) {
  try {
    const { prompt, model, aspect_ratio, response_format, n, prompt_optimizer, seed, width, height } = await req.json();

    if (!prompt) {
      return Response.json({ error: 'Missing prompt' }, { status: 400 });
    }

    const response = await fetch('https://api.minimaxi.com/v1/image_generation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
      },
      body: JSON.stringify({
        model: model || 'image-01',
        prompt,
        ...(aspect_ratio && { aspect_ratio }),
        ...(response_format && { response_format }),
        ...(n && { n }),
        ...(prompt_optimizer !== undefined && { prompt_optimizer }),
        ...(seed && { seed }),
        ...(width && { width }),
        ...(height && { height }),
      }),
    });

    const result = await response.json();
    return Response.json(result);
  } catch (error: any) {
    console.error('[Image Gen API] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
