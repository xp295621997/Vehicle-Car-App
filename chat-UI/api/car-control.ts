// 车辆控制 API
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
  } catch (error) {
    return Response.json({ error: 'Car control failed' }, { status: 500 });
  }
}
