// TTS 语音合成 API - MiniMax
const MINIMAX_API_KEY = 'sk-cp-BZ4zKCQCkeKCu9SdhItjlNAv6KGBAh_BpuZM9EK9H9KJJ7aekei6HVBPr5lWJwaxf2upVayoA0ELAUhFr8pfS0CttjEAmBYYb96254l-zQbaMRxuXHeAB_w';

export async function POST(req: Request) {
  try {
    const { text, model, voice_id, speed, vol, pitch, emotion, output_format } = await req.json();

    if (!text) {
      return Response.json({ error: 'Missing text' }, { status: 400 });
    }

    const response = await fetch('https://api.minimaxi.com/v1/t2a_v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
      },
      body: JSON.stringify({
        model: model || 'speech-2.8-hd',
        text,
        stream: false,
        output_format: output_format || 'url',
        voice_setting: {
          voice_id: voice_id || 'male-qn-qingse',
          speed: speed ?? 1,
          vol: vol ?? 1,
          pitch: pitch ?? 0,
          ...(emotion && { emotion }),
        },
        audio_setting: {
          sample_rate: 32000,
          bitrate: 128000,
          format: 'mp3',
          channel: 1,
        },
      }),
    });

    const result = await response.json();
    return Response.json(result);
  } catch (error: any) {
    console.error('[TTS API] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
