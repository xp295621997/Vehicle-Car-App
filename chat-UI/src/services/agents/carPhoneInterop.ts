// 手车互联 Agent - 处理发送到车机的请求

import { AgentRequest, AgentResponse, AgentType, IntentType, Attachment } from './types';
import { sendAddressToCar, sendImageToCar, sendVoiceToCar, initUserConfig } from '../carPhoneApi';

interface CarPhoneInteropContext {
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
}

/**
 * 解析地址信息
 */
function parseAddress(query: string): { address: string; isNavigation: boolean } | null {
  const lowerQuery = query.toLowerCase();

  // 导航意图
  const navigationKeywords = ['导航到', '去这里', '设置导航', '带我去', '我要去', '开车去'];
  for (const keyword of navigationKeywords) {
    if (lowerQuery.includes(keyword)) {
      const address = query.replace(new RegExp(keyword, 'g'), '').trim();
      return {
        address: address || '目的地',
        isNavigation: true,
      };
    }
  }

  // 回家/上班等快捷导航
  if (lowerQuery.includes('回家') || lowerQuery.includes('回公司') || lowerQuery.includes('上班')) {
    return {
      address: lowerQuery.includes('回家') ? '家' : '公司',
      isNavigation: true,
    };
  }

  return null;
}

/**
 * 处理手车互联请求
 */
export async function processCarPhoneInterop(request: AgentRequest): Promise<AgentResponse> {
  const { query, context, attachments, onProgress } = request;

  console.log(`[CarPhoneInterop Agent] Processing: ${query}`);

  // 检查是否在等待用户选择地址
  const previousData = context?.previousData as {
    awaitingSelection?: boolean;
    addresses?: string[];
  } | undefined;

  if (previousData?.awaitingSelection && previousData?.addresses?.length > 0) {
    // 用户正在选择地址
    const addresses = previousData.addresses;
    let selectedAddress = '';

    // 解析用户选择：可能是数字或地址
    const trimmedQuery = query.trim();

    // 尝试解析数字
    const numMatch = trimmedQuery.match(/^(\d+)$/);
    if (numMatch) {
      const idx = parseInt(numMatch[1]) - 1;
      if (idx >= 0 && idx < addresses.length) {
        selectedAddress = addresses[idx];
      }
    } else {
      // 尝试匹配地址
      for (const addr of addresses) {
        if (trimmedQuery.includes(addr) || addr.includes(trimmedQuery)) {
          selectedAddress = addr;
          break;
        }
      }
    }

    if (selectedAddress) {
      console.log(`[CarPhoneInterop Agent] User selected address: ${selectedAddress}`);
      onProgress?.(`已选择: ${selectedAddress}，正在发送到车机...`);

      const result = await sendAddressToCar(selectedAddress);

      if (result.success) {
        return {
          content: `已成功将地址发送到车机：${selectedAddress}`,
          action: '地址已发送',
          agent: AgentType.CAR_PHONE_INTEROP,
          intent: IntentType.CAR_PHONE_INTEROP,
          success: true,
          data: {
            type: 'send_success', // 标记发送成功，下次重新分发
            address: selectedAddress,
          },
        };
      }

      return {
        content: `地址发送到车机失败: ${result.message}`,
        action: '发送失败',
        agent: AgentType.CAR_PHONE_INTEROP,
        intent: IntentType.CAR_PHONE_INTEROP,
        success: false,
        error: result.message,
        data: {
          type: 'send_failed',
          addresses: addresses, // 保留地址列表让用户可以重试
        },
      };
    }

    // 无法识别选择，返回地址列表
    return {
      content: '抱歉，我没有理解您的选择，请回复数字（1-' + addresses.length + '）或地址名称',
      action: '请重新选择',
      agent: AgentType.CAR_PHONE_INTEROP,
      intent: IntentType.CAR_PHONE_INTEROP,
      success: true,
      data: {
        type: 'address_selection',
        awaitingSelection: true,
        addresses: addresses,
      },
    };
  }

  // 检测用户是否要从图片获取地址并发送到车机
  const lowerQuery = query.toLowerCase();
  const needAddressFromImage = (
    lowerQuery.includes('地址') ||
    lowerQuery.includes('导航') ||
    lowerQuery.includes('发到车')
  ) && attachments?.some(a => a.type === 'image');

  // 如果需要从图片提取地址发送到车机
  if (needAddressFromImage) {
    const imageAttachment = attachments!.find(a => a.type === 'image');
    if (imageAttachment) {
      return await handleImageAddressToCar(imageAttachment, query, onProgress);
    }
  }

  // 优先从附件处理
  if (attachments && attachments.length > 0) {
    for (const attachment of attachments) {
      if (attachment.type === 'image') {
        return await handleImageToCar(attachment, query, onProgress);
      }
      if (attachment.type === 'location') {
        return await handleLocationToCar(attachment, query, onProgress);
      }
      if (attachment.type === 'audio') {
        return await handleAudioToCar(attachment, query, onProgress);
      }
    }
  }

  // 从上下文中获取位置信息
  if (context) {
    const locationData = (context as CarPhoneInteropContext).location;
    if (locationData) {
      return await handleLocationData(locationData, query, onProgress);
    }
  }

  // 从查询中解析地址
  const addressInfo = parseAddress(query);
  if (addressInfo) {
    return await handleNavigation(addressInfo, onProgress);
  }

  // 检查是否是发送到车机
  if (lowerQuery.includes('发送到车') || lowerQuery.includes('发到车机') || lowerQuery.includes('投屏')) {
    return {
      content: '请发送您想要发送到车机的内容（图片、地址或音频）',
      action: '等待内容',
      agent: AgentType.CAR_PHONE_INTEROP,
      intent: IntentType.CAR_PHONE_INTEROP,
      success: true,
    };
  }

  return {
    content: '抱歉，我无法处理此请求',
    action: '无法处理',
    agent: AgentType.CAR_PHONE_INTEROP,
    intent: IntentType.CAR_PHONE_INTEROP,
    success: false,
    error: 'Unknown request',
  };
}

/**
 * 处理图片中的地址发送到车机（核心功能）
 */
async function handleImageAddressToCar(attachment: Attachment, query: string, onProgress?: (status: string) => void): Promise<AgentResponse> {
  try {
    console.log(`[CarPhoneInterop Agent] Extracting address from image and sending to car...`);
    onProgress?.('正在识别图片中的地址...');

    // 1. 调用图片理解API，提取地址（支持多个）
    let addresses: string[] = [];
    let imageDescription = '';

    try {
      const response = await fetch('/api/understand-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData: attachment.data,
          prompt: `请从这张图片中提取所有地址信息。
要求：
1. 如果有多个地址，用换行分隔每行一个地址
2. 只返回地址，不要其他内容
3. 如果没有地址，返回"未找到地址"`,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        imageDescription = result.description || '';
        // 清理并分割多个地址
        const lines = imageDescription.split('\n').filter((line: string) => line.trim() && !line.includes('未找到'));
        addresses = lines.map((addr: string) => addr.trim()).filter((addr: string) => addr.length > 0);
      }
    } catch (e) {
      console.log('[CarPhoneInterop Agent] Image understanding failed:', e);
    }

    // 如果没有提取到地址，返回错误
    if (addresses.length === 0) {
      return {
        content: '无法从图片中识别到地址信息，请确保图片中含有地址',
        action: '地址识别失败',
        agent: AgentType.CAR_PHONE_INTEROP,
        intent: IntentType.CAR_PHONE_INTEROP,
        success: false,
        error: 'No address found in image',
      };
    }

    // 如果只有一个地址，直接发送
    if (addresses.length === 1) {
      const address = addresses[0];
      console.log(`[CarPhoneInterop Agent] Extracted address: ${address}`);
      onProgress?.(`已识别地址: ${address}，正在发送到车机...`);

      const result = await sendAddressToCar(address);

      if (result.success) {
        return {
          content: `已成功将图片中的地址发送到车机：${address}`,
          action: '地址已发送',
          agent: AgentType.CAR_PHONE_INTEROP,
          intent: IntentType.CAR_PHONE_INTEROP,
          success: true,
          data: {
            type: 'image_address',
            address: address,
            imageDescription: imageDescription,
          },
        };
      }

      return {
        content: `地址发送到车机失败: ${result.message}`,
        action: '发送失败',
        agent: AgentType.CAR_PHONE_INTEROP,
        intent: IntentType.CAR_PHONE_INTEROP,
        success: false,
        error: result.message,
      };
    }

    // 多个地址，让用户选择
    console.log(`[CarPhoneInterop Agent] Found ${addresses.length} addresses:`, addresses);
    const addressList = addresses.map((addr, idx) => `${idx + 1}. ${addr}`).join('\n');

    return {
      content: `从图片中识别到 ${addresses.length} 个地址，请告诉我您想发送哪一个？\n\n${addressList}\n\n直接回复数字或地址即可`,
      action: '请选择地址',
      agent: AgentType.CAR_PHONE_INTEROP,
      intent: IntentType.CAR_PHONE_INTEROP,
      success: true,
      data: {
        type: 'address_selection',
        addresses: addresses,
        awaitingSelection: true,
      },
    };
  } catch (error: any) {
    console.error(`[CarPhoneInterop Agent] Image address to car error:`, error);
    return {
      content: `处理失败: ${error?.message || '未知错误'}`,
      action: '处理失败',
      agent: AgentType.CAR_PHONE_INTEROP,
      intent: IntentType.CAR_PHONE_INTEROP,
      success: false,
      error: error?.message,
    };
  }
}

/**
 * 处理图片发送到车机
 */
async function handleImageToCar(attachment: Attachment, query: string, onProgress?: (status: string) => void): Promise<AgentResponse> {
  try {
    console.log(`[CarPhoneInterop Agent] Processing image to car...`);
    onProgress?.('正在处理图片...');

    // 模拟发送到车机的过程
    // 实际项目中需要调用车机互联 API

    // 先理解图片
    let imageDescription = '图片';
    try {
      const response = await fetch('/api/understand-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData: attachment.data,
          prompt: '简述这张图片的内容',
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.description) {
          imageDescription = result.description;
        }
      }
    } catch (e) {
      console.log('[CarPhoneInterop Agent] Image understanding failed, using default');
    }

    // 模拟发送到车机
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      content: `图片已发送到车机显示，内容：${imageDescription}`,
      action: '图片已发送',
      agent: AgentType.CAR_PHONE_INTEROP,
      intent: IntentType.CAR_PHONE_INTEROP,
      success: true,
      data: {
        type: 'image',
        description: imageDescription,
      },
    };
  } catch (error: any) {
    console.error(`[CarPhoneInterop Agent] Image to car error:`, error);
    return {
      content: `图片发送到车机失败: ${error?.message || '未知错误'}`,
      action: '发送失败',
      agent: AgentType.CAR_PHONE_INTEROP,
      intent: IntentType.CAR_PHONE_INTEROP,
      success: false,
      error: error?.message,
    };
  }
}

/**
 * 处理位置发送到车机
 */
async function handleLocationToCar(attachment: Attachment, query: string, onProgress?: (status: string) => void): Promise<AgentResponse> {
  try {
    console.log(`[CarPhoneInterop Agent] Processing location to car...`);
    onProgress?.('正在设置导航...');

    // 解析位置数据
    const locationData = JSON.parse(attachment.data);
    const address = locationData.address || locationData.name || locationData.locationName || '目的地';

    // 调用真实API
    const result = await sendAddressToCar(address, locationData.address);

    if (result.success) {
      return {
        content: `已设置导航到：${address}，正在前往车机导航`,
        action: '导航已设置',
        agent: AgentType.CAR_PHONE_INTEROP,
        intent: IntentType.CAR_PHONE_INTEROP,
        success: true,
        data: {
          type: 'location',
          address,
          coordinates: locationData,
        },
      };
    }

    return {
      content: `导航设置失败: ${result.message}`,
      action: '设置失败',
      agent: AgentType.CAR_PHONE_INTEROP,
      intent: IntentType.CAR_PHONE_INTEROP,
      success: false,
      error: result.message,
    };
  } catch (error: any) {
    console.error(`[CarPhoneInterop Agent] Location to car error:`, error);
    return {
      content: `导航设置失败: ${error?.message || '未知错误'}`,
      action: '设置失败',
      agent: AgentType.CAR_PHONE_INTEROP,
      intent: IntentType.CAR_PHONE_INTEROP,
      success: false,
      error: error?.message,
    };
  }
}

/**
 * 处理音频发送到车机
 */
async function handleAudioToCar(attachment: Attachment, query: string, onProgress?: (status: string) => void): Promise<AgentResponse> {
  try {
    console.log(`[CarPhoneInterop Agent] Processing audio to car...`);
    onProgress?.('正在发送音频...');

    // 模拟发送到车机
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      content: '音频已发送到车机播放',
      action: '音频已发送',
      agent: AgentType.CAR_PHONE_INTEROP,
      intent: IntentType.CAR_PHONE_INTEROP,
      success: true,
      data: {
        type: 'audio',
        name: attachment.name || '音频文件',
      },
    };
  } catch (error: any) {
    console.error(`[CarPhoneInterop Agent] Audio to car error:`, error);
    return {
      content: `音频发送到车机失败: ${error?.message || '未知错误'}`,
      action: '发送失败',
      agent: AgentType.CAR_PHONE_INTEROP,
      intent: IntentType.CAR_PHONE_INTEROP,
      success: false,
      error: error?.message,
    };
  }
}

/**
 * 处理位置数据
 */
async function handleLocationData(location: { latitude: number; longitude: number; address?: string }, query: string, onProgress?: (status: string) => void): Promise<AgentResponse> {
  return handleLocationToCar({
    type: 'location',
    data: JSON.stringify(location),
    name: location.address,
  }, query, onProgress);
}

/**
 * 处理导航请求
 */
async function handleNavigation(addressInfo: { address: string; isNavigation: boolean }, onProgress?: (status: string) => void): Promise<AgentResponse> {
  try {
    console.log(`[CarPhoneInterop Agent] Setting navigation to: ${addressInfo.address}`);
    onProgress?.('正在设置导航...');

    // 调用真实API发送到车机
    const result = await sendAddressToCar(addressInfo.address);

    if (result.success) {
      return {
        content: `已设置导航到：${addressInfo.address}，正在前往车机启动导航`,
        action: '导航已设置',
        agent: AgentType.CAR_PHONE_INTEROP,
        intent: IntentType.CAR_PHONE_INTEROP,
        success: true,
        data: {
          type: 'navigation',
          address: addressInfo.address,
        },
      };
    }

    return {
      content: `导航设置失败: ${result.message}`,
      action: '设置失败',
      agent: AgentType.CAR_PHONE_INTEROP,
      intent: IntentType.CAR_PHONE_INTEROP,
      success: false,
      error: result.message,
    };
  } catch (error: any) {
    console.error(`[CarPhoneInterop Agent] Navigation error:`, error);
    return {
      content: `导航设置失败: ${error?.message || '未知错误'}`,
      action: '设置失败',
      agent: AgentType.CAR_PHONE_INTEROP,
      intent: IntentType.CAR_PHONE_INTEROP,
      success: false,
      error: error?.message,
    };
  }
}
