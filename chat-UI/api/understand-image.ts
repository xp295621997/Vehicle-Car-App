// 图片理解 API
// 注意: MiniMax API Key 不支持视觉模型，需要配置支持视觉的 API
// 可选方案:
// 1. MiniMax 开通视觉模型权限
// 2. 使用 OpenAI GPT-4 Vision
// 3. 使用阿里云视觉智能

export async function POST(req: Request) {
  try {
    const { imageData, imageUrl, prompt } = await req.json();

    if (!imageData && !imageUrl) {
      return Response.json({ error: 'Missing imageData or imageUrl' }, { status: 400 });
    }

    const textPrompt = prompt || '请详细描述这张图片的内容';

    // MiniMax 视觉 API (如果 API Key 有权限)
    // 由于当前 API Key 不支持视觉模型，返回友好提示
    return Response.json({
      description: '图片理解服务需要配置视觉模型权限。当前 MiniMax API Key 仅支持 TTS 和图片生成。如需启用图片理解，请联系管理员配置具有视觉模型权限的 API Key。',
      hint: '需要配置 MiniMax 视觉模型或使用 OpenAI GPT-4 Vision API'
    });

  } catch (error: any) {
    console.error('[Understand Image API] Error:', error);
    return Response.json({
      description: `图片理解服务暂时无法使用: ${error.message}`
    }, { status: 200 });
  }
}
