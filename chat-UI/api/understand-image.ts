// 图片理解 API - MiniMax
const MINIMAX_API_KEY = 'sk-cp-BZ4zKCQCkeKCu9SdhItjlNAv6KGBAh_BpuZM9EK9H9KJJ7aekei6HVBPr5lWJwaxf2upVayoA0ELAUhFr8pfS0CttjEAmBYYb96254l-zQbaMRxuXHeAB_w';

export async function POST(req: Request) {
  try {
    const { imageUrl, prompt } = await req.json();

    if (!imageUrl) {
      return Response.json({ error: 'Missing imageUrl' }, { status: 400 });
    }

    // 使用 MiniMax 对话API进行图片理解
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
            content: [
              {
                type: 'image_url',
                image_url: { url: imageUrl }
              },
              {
                type: 'text',
                text: prompt || '请描述这张图片的内容'
              }
            ]
          }
        ],
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    const description = data.choices?.[0]?.message?.content || '图片理解服务暂时无法使用';

    return Response.json({ description });
  } catch (error: any) {
    console.error('[Understand Image API] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
