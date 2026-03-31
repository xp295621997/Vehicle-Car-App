// 车辆控制 API - TSP车控接口代理
const TSP_API = 'https://preview.tsp-mock.sc.iccc.mioffice.cn/test/dds-noauth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const response = await fetch(TSP_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return Response.json(data);
  } catch (error: any) {
    console.error('[Car API] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
