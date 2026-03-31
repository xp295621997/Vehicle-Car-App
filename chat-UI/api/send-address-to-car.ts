// 发送地址到车机 API
export async function POST(req: Request) {
  try {
    const { locationName, address } = await req.json();
    console.log('[Send Address] Sending to car:', { locationName, address });

    // 这里需要调用实际的车机互联API
    // 暂时返回成功，实际部署时需要接入真实的API
    return Response.json({
      code: 0,
      message: '地址已发送到车机',
      data: { locationName, address }
    });
  } catch (error: any) {
    console.error('[Send Address API] Error:', error);
    return Response.json({ code: -1, message: error.message }, { status: 500 });
  }
}
