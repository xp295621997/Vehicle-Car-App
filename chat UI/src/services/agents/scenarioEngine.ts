// 场景引擎Agent - 按时间点生成动态场景

import { AgentRequest, AgentResponse, AgentType, IntentType, ScenarioType } from './types';

// ========== 场景定义 ==========

export interface Scenario {
  id: string;
  name: string;
  timeRange: string;        // 时间范围，如 "07:00-09:00"
  description: string;
  typicalActions: string[]; // 典型行为
  context: Record<string, any>; // 场景上下文
  frequency: number;       // 出现频率权重
}

// 新能源汽车典型场景库
const SCENARIO_LIBRARY: Scenario[] = [
  // 早晨场景
  {
    id: 'morning_commute',
    name: '早高峰通勤',
    timeRange: '07:00-09:00',
    description: '工作日早晨用车上班',
    typicalActions: ['一键备车', '导航到公司', '查看续航', '开启空调'],
    context: { isWeekday: true, isMorning: true, purpose: 'commute' },
    frequency: 5,
  },
  {
    id: 'morning_prepare',
    name: '早晨准备',
    timeRange: '06:00-08:00',
    description: '早晨检查车辆状态，准备出行',
    typicalActions: ['查看电量', '检查胎压', '开启空调预热', '查看续航'],
    context: { isWeekday: true, isMorning: true, purpose: 'prepare' },
    frequency: 3,
  },

  // 白天场景
  {
    id: 'workday_parking',
    name: '工作日驻车',
    timeRange: '09:00-18:00',
    description: '白天在公司停车',
    typicalActions: ['锁车', '哨兵模式', '充电预约'],
    context: { isWeekday: true, isWorkingHours: true, parked: true },
    frequency: 4,
  },
  {
    id: 'lunch_break',
    name: '午间用车',
    timeRange: '12:00-14:00',
    description: '午休时间短暂用车',
    typicalActions: ['开车窗通风', '开空调', '短暂出行'],
    context: { isWeekday: true, isNoon: true },
    frequency: 2,
  },

  // 傍晚场景
  {
    id: 'evening_commute',
    name: '晚高峰通勤',
    timeRange: '17:00-19:00',
    description: '下班回家',
    typicalActions: ['一键备车', '导航回家', '开启座椅加热'],
    context: { isWeekday: true, isEvening: true, purpose: 'commute' },
    frequency: 5,
  },

  // 夜间场景
  {
    id: 'night_charging',
    name: '夜间充电',
    timeRange: '21:00-23:00',
    description: '夜间充电高峰期',
    typicalActions: ['插枪充电', '预约充电', '查看充电状态'],
    context: { isEvening: true, isCharging: true, timeOfDay: 'night' },
    frequency: 4,
  },
  {
    id: 'night_parking',
    name: '夜间驻车',
    timeRange: '21:00-06:00',
    description: '夜间停车休息',
    typicalActions: ['锁车', '哨兵模式', '关闭车窗'],
    context: { parked: true, timeOfDay: 'night', security: 'sentry' },
    frequency: 5,
  },

  // 周末场景
  {
    id: 'weekend_morning',
    name: '周末早晨',
    timeRange: '08:00-11:00',
    description: '周末睡个懒觉，然后出行',
    typicalActions: ['查看电量', '规划出行', '一键备车'],
    context: { isWeekend: true, isMorning: true, purpose: 'outdoor' },
    frequency: 3,
  },
  {
    id: 'weekend_trip',
    name: '周末出行',
    timeRange: '10:00-16:00',
    description: '周末长途出行游玩',
    typicalActions: ['规划路线', '检查续航', '充电规划', '开启空调'],
    context: { isWeekend: true, purpose: 'trip', longTrip: true },
    frequency: 2,
  },
  {
    id: 'weekend_return',
    name: '周末返程',
    timeRange: '15:00-19:00',
    description: '周末晚上返程回家',
    typicalActions: ['导航回家', '查看续航', '预约充电'],
    context: { isWeekend: true, isEvening: true, purpose: 'return' },
    frequency: 2,
  },

  // 特殊场景
  {
    id: 'shopping',
    name: '购物出行',
    timeRange: '14:00-21:00',
    description: '商场购物',
    typicalActions: ['查找停车场', '哨兵模式', '远程查看车辆'],
    context: { purpose: 'shopping', location: 'mall' },
    frequency: 2,
  },
  {
    id: 'airport_pickup',
    name: '接送机',
    timeRange: '06:00-09:00,16:00-20:00',
    description: '机场接送',
    typicalActions: ['导航到机场', '一键备车', '远程开空调'],
    context: { purpose: 'airport', location: 'airport' },
    frequency: 1,
  },
  {
    id: 'cold_weather',
    name: '寒冷天气',
    timeRange: '全年冬季',
    description: '冬天用车需要提前预热',
    typicalActions: ['一键备车', '开启空调', '座椅加热', '方向盘加热'],
    context: { weather: 'cold', temperature: '<10°C' },
    frequency: 3,
  },
  {
    id: 'hot_weather',
    name: '炎热天气',
    timeRange: '5月-9月',
    description: '夏天用车需要提前降温',
    typicalActions: ['一键备车', '远程开空调', '开车窗通风'],
    context: { weather: 'hot', temperature: '>30°C' },
    frequency: 3,
  },
  {
    id: 'rainy_weather',
    name: '雨天出行',
    timeRange: '雨季',
    description: '雨天用车注意安全',
    typicalActions: ['开启雨刷', '除雾', '小心驾驶'],
    context: { weather: 'rainy', visibility: 'low' },
    frequency: 2,
  },
];

// ========== 场景引擎核心逻辑 ==========

/**
 * 获取当前时间场景
 */
function getCurrentTimeScenario(): { hour: number; minute: number; isWeekday: boolean; scenario: string } {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const dayOfWeek = now.getDay();
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

  let scenario = '';

  // 根据时间判断场景
  if (hour >= 6 && hour < 9) {
    scenario = isWeekday ? 'morning_commute' : 'weekend_morning';
  } else if (hour >= 9 && hour < 12) {
    scenario = isWeekday ? 'workday_parking' : 'weekend_trip';
  } else if (hour >= 12 && hour < 14) {
    scenario = 'lunch_break';
  } else if (hour >= 14 && hour < 17) {
    scenario = isWeekday ? 'workday_parking' : 'weekend_trip';
  } else if (hour >= 17 && hour < 20) {
    scenario = isWeekday ? 'evening_commute' : 'weekend_return';
  } else if (hour >= 20 && hour < 23) {
    scenario = 'night_charging';
  } else {
    scenario = 'night_parking';
  }

  return { hour, minute, isWeekday, scenario };
}

/**
 * 根据时间范围匹配场景
 */
function matchScenariosByTime(hour: number, minute: number, isWeekday: boolean): Scenario[] {
  const matched: Scenario[] = [];

  for (const scenario of SCENARIO_LIBRARY) {
    const timeRanges = scenario.timeRange.split(',');

    for (const range of timeRanges) {
      if (range.includes('-')) {
        const [start, end] = range.split('-').map(t => {
          const [h] = t.split(':').map(Number);
          return h;
        });

        // 处理跨天的情况
        if (start > end) {
          // 例如 21:00-06:00
          if (hour >= start || hour < end) {
            matched.push(scenario);
          }
        } else {
          if (hour >= start && hour < end) {
            // 工作日/周末筛选
            if ((isWeekday && scenario.context.isWeekday) ||
                (!isWeekday && scenario.context.isWeekend) ||
                (!scenario.context.isWeekday && !scenario.context.isWeekend)) {
              matched.push(scenario);
            }
          }
        }
      }
    }
  }

  return matched;
}

/**
 * 获取当前活跃场景
 */
function getActiveScenario(): Scenario | null {
  const { hour, minute, isWeekday } = getCurrentTimeScenario();
  const matched = matchScenariosByTime(hour, minute, isWeekday);

  if (matched.length === 0) {
    return SCENARIO_LIBRARY.find(s => s.id === 'night_parking') || null;
  }

  // 返回权重最高的场景
  return matched.reduce((prev, curr) =>
    curr.frequency > prev.frequency ? curr : prev
  );
}

/**
 * 获取建议的操作（基于当前场景）
 */
function getSuggestedActions(scenario: Scenario, vehicleStatus?: Record<string, any>): string[] {
  const actions: string[] = [...scenario.typicalActions];

  // 根据车辆状态调整建议
  if (vehicleStatus) {
    // 电量低时
    if (vehicleStatus.batteryPercent !== undefined && vehicleStatus.batteryPercent < 30) {
      if (!actions.includes('充电') && !actions.includes('充电规划')) {
        actions.unshift('⚠️ 电量低，建议尽快充电');
      }
    }

    // 胎压异常时
    if (vehicleStatus.tirePressure) {
      const tp = vehicleStatus.tirePressure;
      if (tp.front < 2.3 || tp.rear < 2.3) {
        actions.unshift('⚠️ 胎压偏低，注意检查');
      }
    }
  }

  return actions;
}

/**
 * 生成场景描述
 */
function formatScenarioDescription(scenario: Scenario, vehicleStatus?: Record<string, any>): string {
  let content = `🕐 当前场景：${scenario.name}\n`;
  content += `📝 ${scenario.description}\n\n`;

  // 时间信息
  const { hour, minute, isWeekday } = getCurrentTimeScenario();
  content += `⏰ 时间：${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${isWeekday ? '工作日' : '周末'}\n\n`;

  // 建议操作
  const actions = getSuggestedActions(scenario, vehicleStatus);
  content += `💡 建议操作：\n`;
  actions.forEach((action, index) => {
    content += `${index + 1}. ${action}\n`;
  });

  return content;
}

// ========== 场景历史记录 ==========

interface ScenarioHistory {
  timestamp: Date;
  scenarioId: string;
  scenarioName: string;
  vehicleStatus?: Record<string, any>;
  alerts?: string[];
}

// 场景历史记录（内存中，可扩展为持久化存储）
const scenarioHistory: ScenarioHistory[] = [];

/**
 * 记录场景（每天24小时运行沉淀数据）
 */
export function recordScenario(
  scenario: Scenario,
  vehicleStatus?: Record<string, any>,
  alerts?: string[]
): void {
  scenarioHistory.push({
    timestamp: new Date(),
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    vehicleStatus,
    alerts,
  });

  // 保留最近7天的记录
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const oldLength = scenarioHistory.length;
  for (let i = oldLength - 1; i >= 0; i--) {
    if (scenarioHistory[i].timestamp < oneWeekAgo) {
      scenarioHistory.splice(i, 1);
    }
  }
}

/**
 * 获取历史场景记录
 */
export function getScenarioHistory(days: number = 1): ScenarioHistory[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  return scenarioHistory.filter(s => s.timestamp >= cutoff);
}

/**
 * 获取场景统计
 */
export function getScenarioStats(): { scenarioId: string; count: number }[] {
  const stats: Record<string, number> = {};

  for (const record of scenarioHistory) {
    stats[record.scenarioId] = (stats[record.scenarioId] || 0) + 1;
  }

  return Object.entries(stats).map(([id, count]) => ({
    scenarioId: id,
    count,
  }));
}

// ========== 场景引擎Agent处理函数 ==========

/**
 * 场景引擎Agent处理函数
 */
export async function processScenarioEngine(
  request: AgentRequest
): Promise<AgentResponse> {
  const { query, context, onProgress } = request;

  try {
    onProgress?.('分析当前场景...');

    // 1. 获取当前场景
    const activeScenario = getActiveScenario();

    if (!activeScenario) {
      return {
        content: '无法确定当前场景',
        action: '场景分析失败',
        agent: AgentType.SCENARIO_ENGINE,
        intent: IntentType.SCENARIO_ENGINE,
        success: false,
        error: 'No active scenario found',
      };
    }

    onProgress?.('生成场景建议...');

    // 2. 获取车辆状态
    const vehicleStatus = context?.vehicleStatus || context?.vehicleData;

    // 3. 记录场景到历史
    const alerts = context?.alerts as string[] | undefined;
    recordScenario(activeScenario, vehicleStatus, alerts);

    // 4. 格式化输出
    const content = formatScenarioDescription(activeScenario, vehicleStatus);

    // 5. 附加历史统计（如果有）
    const history = getScenarioHistory(7);
    if (history.length > 0) {
      const stats = getScenarioStats();
      const totalRecords = stats.reduce((sum, s) => sum + s.count, 0);

      // 找出最频繁的场景
      const topScenario = stats.sort((a, b) => b.count - a.count)[0];
      if (topScenario) {
        const top = SCENARIO_LIBRARY.find(s => s.id === topScenario.scenarioId);
        if (top) {
          // content += `\n📊 本周常用场景：${top.name} (${Math.round(topScenario.count / totalRecords * 100)}%)`;
        }
      }
    }

    return {
      content,
      action: `当前场景：${activeScenario.name}`,
      agent: AgentType.SCENARIO_ENGINE,
      intent: IntentType.SCENARIO_ENGINE,
      success: true,
      data: {
        scenario: activeScenario,
        vehicleStatus,
        historyCount: scenarioHistory.length,
      },
    };
  } catch (error: any) {
    console.error('[ScenarioEngine] Error:', error);
    return {
      content: `场景分析失败: ${error?.message || '未知错误'}`,
      action: '场景分析失败',
      agent: AgentType.SCENARIO_ENGINE,
      intent: IntentType.SCENARIO_ENGINE,
      success: false,
      error: error?.message,
    };
  }
}

/**
 * 获取当前场景（供主动智能Agent调用）
 */
export function getCurrentScenario(): Scenario | null {
  return getActiveScenario();
}

/**
 * 场景推理 - 判断是否需要触发主动提醒
 */
export function shouldTriggerAlert(
  scenario: Scenario,
  vehicleStatus: Record<string, any>
): { shouldAlert: boolean; reason: string; alertType: string } {
  const alerts: { reason: string; type: string }[] = [];

  // 1. 电量检查
  if (vehicleStatus.batteryPercent !== undefined) {
    const battery = vehicleStatus.batteryPercent;

    if (battery < 10) {
      alerts.push({ reason: '电量极低(<10%)，可能无法正常出行', type: 'battery_critical' });
    } else if (battery < 20) {
      // 夜间驻车或充电场景不需要立即提醒
      if (!scenario.id.includes('night')) {
        alerts.push({ reason: '电量偏低(<20%)，建议及时充电', type: 'battery_low' });
      }
    } else if (scenario.id.includes('commute') && battery < 30) {
      alerts.push({ reason: '早/晚通勤需要充足电量', type: 'battery_commute' });
    }
  }

  // 2. 胎压检查
  if (vehicleStatus.tirePressure) {
    const tp = vehicleStatus.tirePressure;
    if (tp.front < 2.28 || tp.rear < 2.28) {
      alerts.push({ reason: '胎压异常，触发一级提醒', type: 'tire_pressure_l1' });
    }
    if (tp.front < 1.8 || tp.rear < 1.8) {
      alerts.push({ reason: '胎压过低(二级报警)，禁止驾驶', type: 'tire_pressure_l2' });
    }
  }

  // 3. 场景特定检查
  if (scenario.id === 'morning_commute') {
    // 早高峰通勤，检查续航是否足够
    if (vehicleStatus.range !== undefined && vehicleStatus.range < 50) {
      alerts.push({ reason: '续航不足50km，可能无法到达目的地', type: 'range_low' });
    }
  }

  if (scenario.id === 'night_charging') {
    // 夜间充电场景，但未在充电
    if (!vehicleStatus.isCharging && vehicleStatus.batteryPercent < 80) {
      alerts.push({ reason: '建议开始充电，迎接新的一天', type: 'charging_suggest' });
    }
  }

  // 4. 天气场景提醒
  if (scenario.context.weather === 'cold' && vehicleStatus.seatHeating === 0) {
    alerts.push({ reason: '寒冷天气，建议开启座椅加热', type: 'cold_weather' });
  }

  if (scenario.context.weather === 'hot' && vehicleStatus.acStatus === 'off') {
    alerts.push({ reason: '炎热天气，建议提前开启空调降温', type: 'hot_weather' });
  }

  // 返回最紧急的提醒
  if (alerts.length > 0) {
    // 优先级：tire_pressure_l2 > battery_critical > 其他
    const priority = ['tire_pressure_l2', 'battery_critical', 'tire_pressure_l1', 'battery_commute', 'range_low'];

    const sorted = alerts.sort((a, b) => {
      const aIdx = priority.indexOf(a.type);
      const bIdx = priority.indexOf(b.type);
      return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
    });

    return {
      shouldAlert: true,
      reason: sorted[0].reason,
      alertType: sorted[0].type,
    };
  }

  return {
    shouldAlert: false,
    reason: '车辆状态正常，无需提醒',
    alertType: 'none',
  };
}

// ========== 场景模拟器（用于生成模拟场景） ==========

// 模拟计数器
let simulationCount = 0;

/**
 * 生成模拟场景 - 模拟用户出行场景
 * 每10分钟被调度器调用，生成一个模拟的用户出行场景
 */
export function generateSimulatedScenario(
  vehicleStatus?: Record<string, any>
): {
  scenario: Scenario;
  simulatedTime: string;
  simulatedDay: string;
  description: string;
  vehicleState: Record<string, any>;
} {
  simulationCount++;

  // 模拟的时间点（按顺序循环）
  const timeSlots = [
    { time: '07:30', name: '早上通勤', type: 'morning_commute' },
    { time: '08:30', name: '到达公司', type: 'workday_parking' },
    { time: '12:00', name: '午休用车', type: 'lunch_break' },
    { time: '13:00', name: '继续工作', type: 'workday_parking' },
    { time: '18:00', name: '下班通勤', type: 'evening_commute' },
    { time: '19:00', name: '到达家中', type: 'night_parking' },
    { time: '21:00', name: '夜间充电', type: 'night_charging' },
    { time: '23:00', name: '夜间驻车', type: 'night_parking' },
    { time: '06:00', name: '凌晨准备', type: 'morning_prepare' },
  ];

  // 按周期循环选择场景
  const slotIndex = simulationCount % timeSlots.length;
  const slot = timeSlots[slotIndex];

  // 模拟星期几（假设工作日）
  const dayTypes = ['工作日', '工作日', '工作日', '周末', '周末'];
  const dayIndex = Math.floor(simulationCount / timeSlots.length) % dayTypes.length;
  const simulatedDay = dayTypes[dayIndex];

  // 查找匹配的场
  let scenario = SCENARIO_LIBRARY.find(s => s.id === slot.type) || SCENARIO_LIBRARY[0];

  // 根据模拟时间动态调整车辆状态
  let simulatedVehicleState: Record<string, any> = {
    batteryPercent: 75,  // 默认电量
    range: 480,
    locked: false,
    isCharging: false,
    acStatus: 'off',
    seatHeating: 0,
    sentryMode: 'off',
    tirePressure: { fl: 2.8, fr: 2.8, rl: 2.7, rr: 2.7 },
  };

  // 根据场景动态模拟车辆状态
  if (slot.type === 'morning_commute' || slot.type === 'evening_commute') {
    // 通勤场景：车辆已解锁，驾驶中
    simulatedVehicleState = {
      ...simulatedVehicleState,
      locked: false,
      isDriving: true,
      batteryPercent: 65 + Math.floor(Math.random() * 20),  // 电量消耗中
      range: 350 + Math.floor(Math.random() * 100),
    };
  } else if (slot.type === 'workday_parking') {
    // 工作日驻车：已锁车，开启哨兵
    simulatedVehicleState = {
      ...simulatedVehicleState,
      locked: true,
      isDriving: false,
      sentryMode: 'on',
      batteryPercent: 60 + Math.floor(Math.random() * 15),
      range: 320 + Math.floor(Math.random() * 80),
    };
  } else if (slot.type === 'night_charging') {
    // 夜间充电：插枪充电中
    simulatedVehicleState = {
      ...simulatedVehicleState,
      locked: true,
      isCharging: true,
      isDriving: false,
      batteryPercent: 30 + Math.floor(Math.random() * 30),
      sentryMode: 'on',
    };
  } else if (slot.type === 'night_parking') {
    // 夜间驻车：已锁车，哨兵开启
    simulatedVehicleState = {
      ...simulatedVehicleState,
      locked: true,
      isDriving: false,
      sentryMode: 'on',
      batteryPercent: simulatedVehicleState.isCharging ? 95 : 50 + Math.floor(Math.random() * 30),
    };
  }

  // 如果传入了真实车辆状态，以传入的为准，但添加一些随机波动
  if (vehicleStatus) {
    simulatedVehicleState = {
      ...simulatedVehicleState,
      ...vehicleStatus,
      // 通勤场景消耗电量
      batteryPercent: slot.type.includes('commute')
        ? Math.max(10, (vehicleStatus.batteryPercent || 70) - Math.floor(Math.random() * 10))
        : vehicleStatus.batteryPercent,
    };
  }

  // 特殊场景：随机模拟异常状态
  if (Math.random() < 0.15) {
    // 15%概率模拟电量低
    simulatedVehicleState.batteryPercent = Math.floor(Math.random() * 15) + 5;
    simulatedVehicleState.lowBatteryAlert = true;
  }

  if (Math.random() < 0.1) {
    // 10%概率模拟胎压低
    simulatedVehicleState.tirePressure = {
      fl: 2.2 + Math.random() * 0.3,
      fr: 2.8,
      rl: 2.1 + Math.random() * 0.3,
      rr: 2.7,
    };
    simulatedVehicleState.lowTirePressureAlert = true;
  }

  return {
    scenario,
    simulatedTime: slot.time,
    simulatedDay,
    description: `【模拟场景】${simulatedDay} ${slot.time} - ${slot.name}`,
    vehicleState: simulatedVehicleState,
  };
}

/**
 * 重置模拟计数器
 */
export function resetSimulation(): void {
  simulationCount = 0;
}

/**
 * 获取模拟计数
 */
export function getSimulationCount(): number {
  return simulationCount;
}
