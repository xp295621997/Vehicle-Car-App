// 发送地址到车机 API
const CAR_PHONE_API = 'https://mobile.pre-product.iccc.xiaomiev.com/mobile/clientbusiness';

export async function POST(req: Request) {
  try {
    const { locationName, address } = await req.json();
    // 实现发送到车机的逻辑
    return Response.json({ code: 0, message: '地址已发送到车机' });
  } catch (error) {
    return Response.json({ code: -1, message: '发送失败' }, { status: 500 });
  }
}
