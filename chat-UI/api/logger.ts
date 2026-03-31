// 日志 API
export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('[Logger]', JSON.stringify(body));
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ ok: false }, { status: 500 });
  }
}
