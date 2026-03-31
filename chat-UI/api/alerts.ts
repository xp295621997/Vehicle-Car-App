// 场景提醒 API - 返回模拟提醒数据
export async function GET(req: Request) {
  const url = new URL(req.url);
  const since = url.searchParams.get('since');

  // 返回模拟数据（实际部署时需要接入真实的车机数据）
  return Response.json({
    success: true,
    hasNew: false,
    alerts: [],
    lastUpdate: new Date().toISOString()
  });
}
