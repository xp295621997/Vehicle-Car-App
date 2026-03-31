// 确认收到提醒 API
export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('[Ack API] Received ack:', body);
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ success: false }, { status: 500 });
  }
}
