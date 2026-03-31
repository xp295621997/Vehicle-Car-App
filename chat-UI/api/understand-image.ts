// 图片理解 API - MiniMax
// 支持 imageData (base64) 和 imageUrl 两种格式
const MINIMAX_API_KEY = 'sk-cp-BZ4zKCQCkeKCu9SdhItjlNAv6KGBAh_BpuZM9EK9H9KJJ7aekei6HVBPr5lWJwaxf2upVayoA0ELAUhFr8pfS0CttjEAmBYYb96254l-zQbaMRxuXHeAB_w';

export async function POST(req: Request) {
  try {
    const { imageData, imageUrl, prompt } = await req.json();

    if (!imageData && !imageUrl) {
      return Response.json({ error: 'Missing imageData or imageUrl' }, { status: 400 });
    }

    // 使用 MiniMax 对话API进行图片理解
    const messages: any[] = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: prompt || '请详细描述这张图片的内容'
          }
        ]
      }
    ];

    // 添加图片
    if (imageData) {
      // 支持 base64 格式的图片数据
      messages[0].content.unshift({
        type: 'image_url',
        image_url: { url: `data:image/jpeg;base64,${imageData}` }
      });
    } else if (imageUrl) {
      messages[0].content.unshift({
        type: 'image_url',
        image_url: { url: imageUrl }
      });
    }

    const response = await fetch('https://api.minimaxi.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'abab6.5s-chat',
        messages,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Understand Image API] MiniMax error:', errorText);
      return Response.json({ error: `MiniMax API error: ${response.status}` }, { status: response.status });
    }

    const data = await response.json();
    const description = data.choices?.[0]?.message?.content || '图片理解服务暂时无法使用';

    return Response.json({ description });
  } catch (error: any) {
    console.error('[Understand Image API] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
