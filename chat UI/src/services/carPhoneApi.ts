// 手车互联 API 服务

const API_BASE = 'https://mobile.pre-product.iccc.xiaomiev.com/mobile/clientbusiness';

// 用户登录信息（默认值）
let userConfig = {
  deviceId: 'D8E283973D464A95',
  userId: '3730174808185373714',
  serviceToken: 'Rbe8CDEfpCB1Z3Q6M4y2V+xYd5tpEL9k1sjPed31sJV63R8NXlhc2c337qWB7PFqtZPqupQ5op8Pesl9f0WFUKiHid5o6ufNpdSRXpihM5+qN9H0b1H0Hf63Lib0rGWlVecO7TLG8MAZFUdhfBHxxXpzdG3KAfmQM/R5XcTDMYsyaHteK1z6jJQ8HfThmLan6HKRFczWTvK8LROAFX1J2hNMKbIWIfT0KC1z0bHVwTr3HLSvoi1wP1zjL0CP7VVBqpJJeMoIh/tqmncQZZEBtg==',
  vin: '',
  vid: 'HXMQRBURENLJNU7E7',
};

/**
 * 初始化用户配置
 */
export function initUserConfig(config: {
  deviceId: string;
  userId: string;
  serviceToken: string;
  vin: string;
  vid: string;
}) {
  userConfig = { ...userConfig, ...config };
}

/**
 * 发送地址到车机
 */
export async function sendAddressToCar(locationName: string, address?: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    // 通过后端代理调用，绕过CORS
    const response = await fetch('/api/send-address-to-car', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        locationName,
        address,
      }),
    });

    const result = await response.json();

    if (result.code === 0 || result.code === 200) {
      return { success: true, message: '地址已发送到车机' };
    }

    return { success: false, message: result.message || '发送失败' };
  } catch (error: any) {
    console.error('[CarPhone API] Error:', error);
    return { success: false, message: error.message };
  }
}

/**
 * 发送图片到车机
 */
export async function sendImageToCar(imageUrl: string, description?: string): Promise<{
  success: boolean;
  message: string;
}> {
  const body = {
    content: description || '',
    model: 'iPhone18,3',
    imageUrl,
    vid: userConfig.vid,
    manufacture: 'Apple',
    source: '小米汽车APP',
    vin: userConfig.vin,
    icccVin: userConfig.vin,
    icccVid: userConfig.vid,
    userId: userConfig.userId,
    sid: 'iccc_app_api',
    deviceId: userConfig.deviceId,
  };

  try {
    const response = await fetch(`${API_BASE}/IcccClientBusinessService/sendImageToCar`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json;charset=UTF-8',
        'x_ic_device_id': userConfig.deviceId,
        'x_ic_user_id': userConfig.userId,
        'cookie': `serviceToken=${userConfig.serviceToken}`,
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    if (result.code === 0 || result.code === 200) {
      return { success: true, message: '图片已发送到车机' };
    }

    return { success: false, message: result.message || '发送失败' };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * 发送语音到车机
 */
export async function sendVoiceToCar(audioUrl: string): Promise<{
  success: boolean;
  message: string;
}> {
  const body = {
    content: '',
    model: 'iPhone18,3',
    audioUrl,
    vid: userConfig.vid,
    manufacture: 'Apple',
    source: '小米汽车APP',
    vin: userConfig.vin,
    icccVin: userConfig.vin,
    icccVid: userConfig.vid,
    userId: userConfig.userId,
    sid: 'iccc_app_api',
    deviceId: userConfig.deviceId,
  };

  try {
    const response = await fetch(`${API_BASE}/IcccClientBusinessService/sendAudioToCar`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json;charset=UTF-8',
        'x_ic_device_id': userConfig.deviceId,
        'x_ic_user_id': userConfig.userId,
        'cookie': `serviceToken=${userConfig.serviceToken}`,
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    if (result.code === 0 || result.code === 200) {
      return { success: true, message: '语音已发送到车机' };
    }

    return { success: false, message: result.message || '发送失败' };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
