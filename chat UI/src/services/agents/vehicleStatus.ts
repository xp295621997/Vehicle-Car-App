// 车辆状态 Agent - 查询车辆状态信息

import { AgentRequest, AgentResponse, AgentType, IntentType, VehicleStatus } from './types';

// 模拟车辆状态数据（实际项目中应调用真实 API）
function getMockVehicleStatus(): VehicleStatus {
  return {
    range: Math.floor(Math.random() * 200) + 200,  // 200-400 公里
    batteryPercent: Math.floor(Math.random() * 50) + 40,  // 40-90%
    locked: Math.random() > 0.3,  // 70% 概率已锁车
    tirePressure: {
      front: parseFloat((2.2 + Math.random() * 0.3).toFixed(1)),
      rear: parseFloat((2.2 + Math.random() * 0.3).toFixed(1)),
    },
    acStatus: Math.random() > 0.5 ? 'on' : 'off',
    seatHeating: Math.floor(Math.random() * 4),  // 0-3 档
    seatVentilation: Math.random() > 0.5 ? 'on' : 'off',
    sentryMode: Math.random() > 0.5 ? 'on' : 'off',
    driveMode: Math.random() > 0.5 ? 'comfort' : 'sport',
  };
}

/**
 * 解析用户查询类型
 */
function parseStatusQuery(query: string): string | null {
  const lowerQuery = query.toLowerCase();

  // 续航/电量查询
  if (lowerQuery.includes('续航') || lowerQuery.includes('公里') || lowerQuery.includes('还能跑')) {
    return 'range';
  }
  if (lowerQuery.includes('电') || lowerQuery.includes('电量') || lowerQuery.includes('percent')) {
    return 'battery';
  }

  // 锁车状态
  if (lowerQuery.includes('锁') || lowerQuery.includes('锁好') || lowerQuery.includes('车门')) {
    return 'lock';
  }

  // 胎压
  if (lowerQuery.includes('胎压')) {
    return 'tire';
  }

  // 空调状态
  if (lowerQuery.includes('空调') || lowerQuery.includes('冷气') || lowerQuery.includes('暖气')) {
    return 'ac';
  }

  // 座椅加热/通风
  if (lowerQuery.includes('座椅加热') || lowerQuery.includes('加热')) {
    return 'seatHeating';
  }
  if (lowerQuery.includes('座椅通风') || lowerQuery.includes('通风')) {
    return 'seatVentilation';
  }

  // 哨兵模式
  if (lowerQuery.includes('哨兵')) {
    return 'sentry';
  }

  // 驾驶模式
  if (lowerQuery.includes('驾驶模式') || lowerQuery.includes('运动') || lowerQuery.includes('舒适') || lowerQuery.includes('节能')) {
    return 'driveMode';
  }

  // 综合状态
  if (lowerQuery.includes('状态') || lowerQuery.includes('车况') || lowerQuery.includes('车辆状态')) {
    return 'full';
  }

  return null;
}

/**
 * 处理车辆状态查询请求
 */
export async function processVehicleStatus(request: AgentRequest): Promise<AgentResponse> {
  const { query, onProgress } = request;

  console.log(`[VehicleStatus Agent] Processing: ${query}`);

  // 解析查询类型
  const queryType = parseStatusQuery(query);

  if (!queryType) {
    return {
      content: '抱歉，我无法识别您的查询类型',
      action: '无法识别',
      agent: AgentType.VEHICLE_STATUS,
      intent: IntentType.VEHICLE_STATUS,
      success: false,
      error: 'Unknown query type',
    };
  }

  try {
    console.log(`[VehicleStatus Agent] Query type: ${queryType}`);
    onProgress?.('正在查询车辆状态...');

    // 获取车辆状态（模拟）
    const status = getMockVehicleStatus();

    let content = '';
    let action = '';

    switch (queryType) {
      case 'range':
        content = `当前续航约 ${status.range} 公里，电量剩余 ${status.batteryPercent}%`;
        action = `续航 ${status.range}km | 电量 ${status.batteryPercent}%`;
        break;

      case 'battery':
        content = `电量剩余 ${status.batteryPercent}%`;
        action = `电量 ${status.batteryPercent}%`;
        break;

      case 'lock':
        if (status.locked) {
          content = '车辆已锁好，门窗均已关闭';
          action = '车辆已锁定';
        } else {
          content = '车辆未锁定，是否需要帮您锁车？';
          action = '未锁定';
        }
        break;

      case 'tire':
        content = `胎压正常，前轮 ${status.tirePressure.front}bar，后轮 ${status.tirePressure.rear}bar`;
        action = `胎压 ${status.tirePressure.front}/${status.tirePressure.rear}bar`;
        break;

      case 'ac':
        const acStatus = status.acStatus === 'on' ? '已开启' : '已关闭';
        content = `空调当前${acStatus}`;
        action = `空调 ${acStatus}`;
        break;

      case 'seatHeating':
        if (status.seatHeating > 0) {
          content = `座椅加热已开启，当前为 ${status.seatHeating} 档`;
          action = `座椅加热 ${status.seatHeating}档`;
        } else {
          content = '座椅加热当前已关闭';
          action: '座椅加热 已关闭';
        }
        break;

      case 'seatVentilation':
        const ventStatus = status.seatVentilation === 'on' ? '已开启' : '已关闭';
        content = `座椅通风当前${ventStatus}`;
        action = `座椅通风 ${ventStatus}`;
        break;

      case 'sentry':
        const sentryStatus = status.sentryMode === 'on' ? '已开启' : '已关闭';
        content = `哨兵模式当前${sentryStatus}`;
        action = `哨兵模式 ${sentryStatus}`;
        break;

      case 'driveMode':
        const modeText = {
          sport: '运动模式',
          comfort: '舒适模式',
          eco: '节能模式',
        };
        content = `当前驾驶模式为 ${modeText[status.driveMode]}`;
        action = `驾驶模式: ${modeText[status.driveMode]}`;
        break;

      case 'full':
        const modeTextFull = {
          sport: '运动',
          comfort: '舒适',
          eco: '节能',
        };
        content = `车辆状态：续航 ${status.range}km，电量 ${status.batteryPercent}%，${status.locked ? '已锁车' : '未锁车'}，驾驶模式 ${modeTextFull[status.driveMode]}，${status.sentryMode === 'on' ? '哨兵模式已开启' : '哨兵模式已关闭'}`;
        action = `续航 ${status.range}km | ${status.batteryPercent}% | ${modeTextFull[status.driveMode]}`;
        break;

      default:
        content = '抱歉，无法获取该状态信息';
        action = '查询失败';
    }

    console.log(`[VehicleStatus Agent] Result:`, content);

    return {
      content,
      action,
      agent: AgentType.VEHICLE_STATUS,
      intent: IntentType.VEHICLE_STATUS,
      success: true,
      data: { queryType, status },
    };
  } catch (error: any) {
    console.error(`[VehicleStatus Agent] Error:`, error);
    const errorMsg = error?.message || error?.toString() || '未知错误';

    return {
      content: `查询车辆状态失败: ${errorMsg}`,
      action: '查询失败',
      agent: AgentType.VEHICLE_STATUS,
      intent: IntentType.VEHICLE_STATUS,
      success: false,
      error: errorMsg,
    };
  }
}
