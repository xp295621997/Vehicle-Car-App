// 主动智能Agent - 基于场景引擎推理，主动提醒用户

import { AgentRequest, AgentResponse, AgentType, IntentType, TirePressureStatus, TirePressureLevel, TirePressureAlert } from './types';
import { getCurrentScenario, shouldTriggerAlert, recordScenario, getScenarioHistory } from './scenarioEngine';

// 胎压知识库配置
const TIRE_PRESSURE_CONFIG = {
  normal: { min: 2.6, max: 3.4 },
  level1: { alert: 2.28, release: 2.48 },
  level2: { alert: 1.8, release: 2.0 },
};

/**
 * 判断胎压级别
 */
function getTirePressureLevel(pressure: number): TirePressureLevel {
  if (pressure < TIRE_PRESSURE_CONFIG.level2.alert) return TirePressureLevel.LOW_LEVEL_2;
  if (pressure < TIRE_PRESSURE_CONFIG.level1.alert) return TirePressureLevel.LOW_LEVEL_1;
  if (pressure > TIRE_PRESSURE_CONFIG.normal.max) return TirePressureLevel.TOO_HIGH;
  return TirePressureLevel.NORMAL;
}

/**
 * 获取胎压提醒
 */
function getTirePressureAlert(status: TirePressureStatus): TirePressureAlert | null {
  const levels = [
    getTirePressureLevel(status.frontLeft),
    getTirePressureLevel(status.frontRight),
    getTirePressureLevel(status.rearLeft),
    getTirePressureLevel(status.rearRight),
  ];

  const worstLevel = levels.reduce((worst, level) => {
    if (level === TirePressureLevel.LOW_LEVEL_2) return TirePressureLevel.LOW_LEVEL_2;
    if (level === TirePressureLevel.LOW_LEVEL_1 && worst !== TirePressureLevel.LOW_LEVEL_2) return TirePressureLevel.LOW_LEVEL_1;
    if (level === TirePressureLevel.TOO_HIGH && worst === TirePressureLevel.NORMAL) return TirePressureLevel.TOO_HIGH;
    return worst;
  }, TirePressureLevel.NORMAL as TirePressureLevel);

  if (worstLevel === TirePressureLevel.NORMAL) return null;

  const isDriving = status.isDriving;

  if (worstLevel === TirePressureLevel.LOW_LEVEL_2) {
    return {
      level: TirePressureLevel.LOW_LEVEL_2,
      title: '⚠️ 胎压二级报警',
      message: isDriving ? '当前胎压低于1.8bar，继续行驶会损坏轮胎！' : '胎压低于1.8bar，请勿驾驶！',
      canDrive: false,
      suggestions: [isDriving ? '请立即靠边停车' : '请勿启动车辆', '联系客服', '预约上门服务'],
      nextActions: ['联系客服', '预约上门服务', '道路救援'],
    };
  }

  if (worstLevel === TirePressureLevel.LOW_LEVEL_1) {
    return {
      level: TirePressureLevel.LOW_LEVEL_1,
      title: '⚡ 胎压一级提醒',
      message: isDriving ? '当前胎压低于2.3bar，建议检查轮胎并补气' : '胎压偏低，建议补气至2.9bar',
      canDrive: true,
      suggestions: [isDriving ? '谨慎驾驶' : '检查轮胎扎钉', '尽快补气到2.9bar', '如持续漏气到店检查'],
      nextActions: ['查看轮胎状态', '预约补胎', '自行补气'],
    };
  }

  if (worstLevel === TirePressureLevel.TOO_HIGH) {
    return {
      level: TirePressureLevel.TOO_HIGH,
      title: '⚠️ 胎压过高',
      message: '胎压超过3.4bar，存在安全隐患',
      canDrive: true,
      suggestions: ['适当放气至2.6-3.4bar', '避免高速行驶'],
      nextActions: ['放气到正常范围', '预约检查'],
    };
  }

  return null;
}

/**
 * 格式化胎压提醒
 */
function formatAlert(alert: TirePressureAlert): string {
  let content = `${alert.title}\n\n${alert.message}\n\n`;
  if (!alert.canDrive) content += '🚫 禁止驾驶\n\n';
  content += '📋 建议操作：\n';
  alert.suggestions.forEach((s, i) => content += `${i + 1}. ${s}\n`);
  content += '\n⬇️ 快捷操作：\n';
  alert.nextActions.forEach(action => content += `• ${action}\n`);
  return content;
}

/**
 * 主动智能Agent处理函数
 */
export async function processProactiveIntelligence(
  request: AgentRequest
): Promise<AgentResponse> {
  const { query: _query, context, onProgress } = request;

  try {
    onProgress?.('获取当前场景...');

    // 1. 获取当前场景
    const scenario = getCurrentScenario();

    if (!scenario) {
      return {
        content: '无法获取当前场景',
        action: '场景获取失败',
        agent: AgentType.PROACTIVE_INTELLIGENCE,
        intent: IntentType.PROACTIVE_INTELLIGENCE,
        success: false,
        error: 'No scenario found',
      };
    }

    onProgress?.('检查车辆状态...');

    // 2. 获取车辆状态
    const vehicleStatus = context?.vehicleStatus || context?.vehicleData || {};

    // 3. 记录当前场景
    recordScenario(scenario, vehicleStatus);

    // 4. 场景推理 - 判断是否需要提醒
    const alertDecision = shouldTriggerAlert(scenario, vehicleStatus);

    // 5. 生成提醒内容
    const alerts: string[] = [];

    // 5.1 场景推理产生的提醒
    if (alertDecision.shouldAlert) {
      alerts.push(`🏠 当前场景：${scenario.name}\n\n💡 ${alertDecision.reason}`);
    }

    // 5.2 胎压检查
    if (vehicleStatus.tirePressure) {
      const tp = vehicleStatus.tirePressure;
      const tpStatus: TirePressureStatus = {
        frontLeft: tp.fl ?? tp.frontLeft ?? 0,
        frontRight: tp.fr ?? tp.frontRight ?? 0,
        rearLeft: tp.rl ?? tp.rearLeft ?? 0,
        rearRight: tp.rr ?? tp.rearRight ?? 0,
        level: TirePressureLevel.NORMAL,
        isDriving: context?.isDriving ?? false,
      };

      const tpAlert = getTirePressureAlert(tpStatus);
      if (tpAlert) {
        alerts.push(formatAlert(tpAlert));
      }
    }

    // 5.3 电量低提醒（场景引擎未覆盖的场景）
    if (vehicleStatus.batteryPercent !== undefined && vehicleStatus.batteryPercent < 20) {
      // 检查是否已被场景引擎处理
      const alreadyHandled = alertDecision.alertType === 'battery_critical' ||
                           alertDecision.alertType === 'battery_low' ||
                           alertDecision.alertType === 'battery_commute';
      if (!alreadyHandled) {
        alerts.push(`🔋 电量提醒：当前电量仅${vehicleStatus.batteryPercent}%，建议及时充电`);
      }
    }

    // 5.4 车门未锁提醒
    if (vehicleStatus.locked === false) {
      alerts.push('🔒 车门提醒：车辆未锁，请注意锁车');
    }

    onProgress?.('生成提醒完成');

    // 6. 返回响应
    if (alerts.length === 0) {
      // 正常状态，给出场景化建议
      let content = `✅ 车辆状态正常\n\n`;
      content += `🕐 当前场景：${scenario.name}\n`;
      content += `📝 ${scenario.description}\n\n`;

      // 基于场景的智能建议
      if (scenario.id === 'morning_commute') {
        content += `☀️ 早安！为您准备了以下服务：\n`;
        content += `• 一键备车：提前预热车辆\n`;
        content += `• 续航充足：${vehicleStatus.range ?? '?'}km\n`;
        content += `• 空调已就绪：上车即享舒适温度`;
      } else if (scenario.id === 'night_charging') {
        content += `🌙 夜间充电建议：\n`;
        content += `• 当前电量：${vehicleStatus.batteryPercent ?? '?'}%\n`;
        content += `• 建议设置预约充电，峰谷电价更省钱`;
      } else if (scenario.id === 'night_parking') {
        content += `🚗 夜间驻车：哨兵模式已开启，车辆安全有保障`;
      } else {
        content += `💡 典型操作：\n`;
        scenario.typicalActions.slice(0, 3).forEach(action => {
          content += `• ${action}\n`;
        });
      }

      return {
        content,
        action: `场景：${scenario.name}`,
        agent: AgentType.PROACTIVE_INTELLIGENCE,
        intent: IntentType.PROACTIVE_INTELLIGENCE,
        success: true,
        data: {
          scenario,
          alerts: [],
          normal: true,
          vehicleStatus,
        },
      };
    }

    return {
      content: alerts.join('\n\n---\n\n'),
      action: '主动提醒',
      agent: AgentType.PROACTIVE_INTELLIGENCE,
      intent: IntentType.PROACTIVE_INTELLIGENCE,
      success: true,
      data: {
        scenario,
        alerts,
        alertDecision,
        vehicleStatus,
      },
    };
  } catch (error: any) {
    console.error('[ProactiveIntelligence] Error:', error);
    return {
      content: `检查车辆状态失败: ${error?.message || '未知错误'}`,
      action: '检查失败',
      agent: AgentType.PROACTIVE_INTELLIGENCE,
      intent: IntentType.PROACTIVE_INTELLIGENCE,
      success: false,
      error: error?.message,
    };
  }
}

/**
 * 主动检查胎压状态（供外部调用）
 */
export function checkTirePressureStatus(
  pressureData: { fl?: number; fr?: number; rl?: number; rr?: number; front?: number; rear?: number },
  isDriving: boolean = false
): TirePressureAlert | null {
  const status: TirePressureStatus = {
    frontLeft: pressureData.fl ?? pressureData.front ?? 0,
    frontRight: pressureData.fr ?? pressureData.front ?? 0,
    rearLeft: pressureData.rl ?? pressureData.rear ?? 0,
    rearRight: pressureData.rr ?? pressureData.rear ?? 0,
    level: TirePressureLevel.NORMAL,
    isDriving,
  };
  return getTirePressureAlert(status);
}

/**
 * 获取场景历史（供外部调用）
 */
export function getHistory(days: number = 1) {
  return getScenarioHistory(days);
}
