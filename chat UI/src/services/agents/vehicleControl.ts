// 车辆控制 Agent - 处理车辆控制命令

import { AgentRequest, AgentResponse, AgentType, IntentType } from './types';
import { carActions } from '../carApi';

interface VehicleControlContext {
  command?: string;
}

// 车辆控制命令映射
const CONTROL_COMMANDS: Record<string, {
  action: () => Promise<any>;
  successMessage: string;
  errorMessage: string;
  actionText: string;
}> = {
  // 车身控制
  '前备箱打开': {
    action: () => carActions.openHood(),
    successMessage: '好的，已为您打开前备箱',
    errorMessage: '抱歉，打开前备箱失败了',
    actionText: '前备箱 已开启',
  },
  '前备箱关闭': {
    action: () => carActions.closeHood(),
    successMessage: '好的，已为您关闭前备箱',
    errorMessage: '抱歉，关闭前备箱失败了',
    actionText: '前备箱 已关闭',
  },
  '后备箱打开': {
    action: () => carActions.openTrunk(),
    successMessage: '好的，已为您打开后备箱',
    errorMessage: '抱歉，打开后备箱失败了',
    actionText: '后备箱 已开启',
  },
  '后备箱关闭': {
    action: () => carActions.closeTrunk(),
    successMessage: '好的，已为您关闭后备箱',
    errorMessage: '抱歉，关闭后备箱失败了',
    actionText: '后备箱 已关闭',
  },
  '充电口打开': {
    action: () => carActions.openChargePort(),
    successMessage: '好的，已为您打开充电口盖',
    errorMessage: '抱歉，打开充电口失败了',
    actionText: '充电口盖 已开启',
  },
  '充电口关闭': {
    action: () => carActions.closeChargePort(),
    successMessage: '好的，已为您关闭充电口盖',
    errorMessage: '抱歉，关闭充电口失败了',
    actionText: '充电口盖 已关闭',
  },
  // 车门控制
  '解锁': {
    action: () => carActions.unlockCar(),
    successMessage: '好的，车辆已解锁',
    errorMessage: '抱歉，解锁车辆失败了',
    actionText: '车辆已解锁',
  },
  '开锁': {
    action: () => carActions.unlockCar(),
    successMessage: '好的，车辆已解锁',
    errorMessage: '抱歉，解锁车辆失败了',
    actionText: '车辆已解锁',
  },
  '锁车': {
    action: () => carActions.lockCar(),
    successMessage: '好的，车辆已锁好',
    errorMessage: '抱歉，锁车失败了',
    actionText: '车辆已锁定',
  },
  '上锁': {
    action: () => carActions.lockCar(),
    successMessage: '好的，车辆已锁好',
    errorMessage: '抱歉，锁车失败了',
    actionText: '车辆已锁定',
  },
  '锁门': {
    action: () => carActions.lockCar(),
    successMessage: '好的，车门已锁好',
    errorMessage: '抱歉，锁门失败了',
    actionText: '车门已锁定',
  },
  // 灯光控制
  '闪灯': {
    action: () => carActions.flashLights(),
    successMessage: '好的，已为您闪灯',
    errorMessage: '抱歉，闪灯失败了',
    actionText: '车灯 闪烁',
  },
  '车灯': {
    action: () => carActions.flashLights(),
    successMessage: '好的，已为您闪灯',
    errorMessage: '抱歉，闪灯失败了',
    actionText: '车灯 闪烁',
  },
  // 喇叭控制
  '鸣笛': {
    action: () => carActions.honk(),
    successMessage: '好的，已为您鸣笛',
    errorMessage: '抱歉，鸣笛失败了',
    actionText: '鸣笛 1次',
  },
  '喇叭': {
    action: () => carActions.honk(),
    successMessage: '好的，已为您鸣笛',
    errorMessage: '抱歉，鸣笛失败了',
    actionText: '鸣笛 1次',
  },
  // 哨兵模式
  '哨兵打开': {
    action: () => carActions.sentryOn(),
    successMessage: '好的，已为您开启哨兵模式',
    errorMessage: '抱歉，开启哨兵模式失败了',
    actionText: '哨兵模式 已开启',
  },
  '哨兵开启': {
    action: () => carActions.sentryOn(),
    successMessage: '好的，已为您开启哨兵模式',
    errorMessage: '抱歉，开启哨兵模式失败了',
    actionText: '哨兵模式 已开启',
  },
  '哨兵关闭': {
    action: () => carActions.sentryOff(),
    successMessage: '好的，已为您关闭哨兵模式',
    errorMessage: '抱歉，关闭哨兵模式失败了',
    actionText: '哨兵模式 已关闭',
  },
  // 空调控制
  '空调打开': {
    action: () => carActions.turnOnAC(),
    successMessage: '好的，已为您打开空调',
    errorMessage: '抱歉，打开空调失败了',
    actionText: '空调 已开启',
  },
  '空调开启': {
    action: () => carActions.turnOnAC(),
    successMessage: '好的，已为您打开空调',
    errorMessage: '抱歉，打开空调失败了',
    actionText: '空调 已开启',
  },
  '开空调': {
    action: () => carActions.turnOnAC(),
    successMessage: '好的，已为您打开空调',
    errorMessage: '抱歉，打开空调失败了',
    actionText: '空调 已开启',
  },
  '空调关闭': {
    action: () => carActions.turnOffAC(),
    successMessage: '好的，已为您关闭空调',
    errorMessage: '抱歉，关闭空调失败了',
    actionText: '空调 已关闭',
  },
  '关空调': {
    action: () => carActions.turnOffAC(),
    successMessage: '好的，已为您关闭空调',
    errorMessage: '抱歉，关闭空调失败了',
    actionText: '空调 已关闭',
  },
  // 一键备车
  '备车': {
    action: () => carActions.prepareCar(),
    successMessage: '已为您执行一键备车',
    errorMessage: '抱歉，一键备车失败了',
    actionText: '一键备车 执行中',
  },
  '一键备车': {
    action: () => carActions.prepareCar(),
    successMessage: '已为您执行一键备车',
    errorMessage: '抱歉，一键备车失败了',
    actionText: '一键备车 执行中',
  },
  // 驾驶模式
  '运动模式': {
    action: () => carActions.setDriveMode('sport'),
    successMessage: '好的，已切换到运动模式',
    errorMessage: '抱歉，切换运动模式失败了',
    actionText: '驾驶模式: 运动',
  },
  '舒适模式': {
    action: () => carActions.setDriveMode('comfort'),
    successMessage: '好的，已切换到舒适模式',
    errorMessage: '抱歉，切换舒适模式失败了',
    actionText: '驾驶模式: 舒适',
  },
  '节能模式': {
    action: () => carActions.setDriveMode('eco'),
    successMessage: '好的，已切换到节能模式',
    errorMessage: '抱歉，切换节能模式失败了',
    actionText: '驾驶模式: 节能',
  },
};

/**
 * 解析用户输入，匹配控制命令
 */
function parseControlCommand(query: string): string | null {
  const lowerQuery = query.toLowerCase();

  // 精确匹配
  if (CONTROL_COMMANDS[query]) {
    return query;
  }

  // 模糊匹配
  for (const [key, _] of Object.entries(CONTROL_COMMANDS)) {
    // 先检查query是否包含key
    if (lowerQuery.includes(key)) {
      // 检查开关状态是否匹配
      const keyIsOpen = key.includes('打开') || key.includes('开启');
      const keyIsClose = key.includes('关闭') || key.includes('关');
      const queryIsOpen = lowerQuery.includes('打开') || lowerQuery.includes('开启') || lowerQuery.includes('开') || lowerQuery.includes('启动');
      const queryIsClose = lowerQuery.includes('关闭') || lowerQuery.includes('关掉') || lowerQuery.includes('关');

      // 如果key和query的开关状态冲突，不返回
      if (keyIsOpen && queryIsClose) continue;
      if (keyIsClose && queryIsOpen) continue;

      return key;
    }

    // 也检查反向匹配（key是否包含query的核心词）
    const coreQuery = lowerQuery.replace(/打开|关闭|开启|关掉/g, '').trim();
    if (coreQuery && key.includes(coreQuery)) {
      const keyIsOpen = key.includes('打开') || key.includes('开启');
      const keyIsClose = key.includes('关闭') || key.includes('关');
      const queryIsOpen = lowerQuery.includes('打开') || lowerQuery.includes('开启') || lowerQuery.includes('开') || lowerQuery.includes('启动');
      const queryIsClose = lowerQuery.includes('关闭') || lowerQuery.includes('关掉') || lowerQuery.includes('关');

      if (keyIsOpen && queryIsClose) continue;
      if (keyIsClose && queryIsOpen) continue;

      return key;
    }
  }

  // 特殊处理 - 前备箱/后备箱
  if ((lowerQuery.includes('前备箱') || lowerQuery.includes('前') && lowerQuery.includes('备箱'))) {
    if (lowerQuery.includes('关闭') || lowerQuery.includes('关')) {
      return '前备箱关闭';
    }
    return '前备箱打开';
  }

  if (lowerQuery.includes('后备箱') || lowerQuery.includes('尾箱')) {
    if (lowerQuery.includes('关闭') || lowerQuery.includes('关')) {
      return '后备箱关闭';
    }
    return '后备箱打开';
  }

  // 充电口
  if (lowerQuery.includes('充电口')) {
    if (lowerQuery.includes('关闭') || lowerQuery.includes('关')) {
      return '充电口关闭';
    }
    return '充电口打开';
  }

  // 解锁/锁车
  if (lowerQuery.includes('解锁') || lowerQuery.includes('开锁')) {
    return '解锁';
  }
  if (lowerQuery.includes('锁车') || lowerQuery.includes('上锁') || lowerQuery.includes('锁门')) {
    return '锁车';
  }

  // 闪灯/鸣笛
  if (lowerQuery.includes('闪灯') || lowerQuery.includes('车灯')) {
    return '闪灯';
  }
  if (lowerQuery.includes('鸣笛') || lowerQuery.includes('喇叭') || lowerQuery.includes('按喇叭')) {
    return '鸣笛';
  }

  // 哨兵模式
  if (lowerQuery.includes('哨兵')) {
    if (lowerQuery.includes('关闭') || lowerQuery.includes('关') || lowerQuery.includes('关掉')) {
      return '哨兵关闭';
    }
    return '哨兵打开';
  }

  // 空调
  if (lowerQuery.includes('空调')) {
    if (lowerQuery.includes('关闭') || lowerQuery.includes('关') || lowerQuery.includes('关掉')) {
      return '空调关闭';
    }
    if (lowerQuery.includes('打开') || lowerQuery.includes('开启') || lowerQuery.includes('开')) {
      return '空调打开';
    }
    // 默认打开
    return '空调打开';
  }

  // 备车
  if (lowerQuery.includes('备车') || lowerQuery.includes('一键备车')) {
    return '一键备车';
  }

  // 驾驶模式
  if (lowerQuery.includes('运动模式') || lowerQuery.includes('sport')) {
    return '运动模式';
  }
  if (lowerQuery.includes('舒适模式')) {
    return '舒适模式';
  }
  if (lowerQuery.includes('节能模式') || lowerQuery.includes('经济模式') || lowerQuery.includes('eco')) {
    return '节能模式';
  }

  return null;
}

/**
 * 处理车辆控制请求
 */
export async function processVehicleControl(request: AgentRequest): Promise<AgentResponse> {
  const { query, onProgress } = request;

  console.log(`[VehicleControl Agent] Processing: ${query}`);

  // 解析控制命令
  const commandKey = parseControlCommand(query);

  if (!commandKey) {
    return {
      content: '抱歉，我无法识别您的控制指令',
      action: '无法识别',
      agent: AgentType.VEHICLE_CONTROL,
      intent: IntentType.VEHICLE_CONTROL,
      success: false,
      error: 'Unknown command',
    };
  }

  const command = CONTROL_COMMANDS[commandKey];

  if (!command) {
    return {
      content: '抱歉，暂不支持该控制指令',
      action: '不支持',
      agent: AgentType.VEHICLE_CONTROL,
      intent: IntentType.VEHICLE_CONTROL,
      success: false,
      error: 'Command not supported',
    };
  }

  try {
    console.log(`[VehicleControl Agent] Executing command: ${commandKey}`);
    onProgress?.(`正在执行${commandKey}...`);

    const result = await command.action();
    console.log(`[VehicleControl Agent] Result:`, result);

    return {
      content: command.successMessage,
      action: command.actionText,
      agent: AgentType.VEHICLE_CONTROL,
      intent: IntentType.VEHICLE_CONTROL,
      success: true,
      data: { command: commandKey, result },
    };
  } catch (error: any) {
    console.error(`[VehicleControl Agent] Error:`, error);
    const errorMsg = error?.message || error?.toString() || '未知错误';

    return {
      content: `${command.errorMessage}: ${errorMsg}`,
      action: `${commandKey} 失败`,
      agent: AgentType.VEHICLE_CONTROL,
      intent: IntentType.VEHICLE_CONTROL,
      success: false,
      error: errorMsg,
    };
  }
}
