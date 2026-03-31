// 场景引擎后台服务 - 定时任务调度

import { getCurrentScenario, shouldTriggerAlert, recordScenario, generateSimulatedScenario, Scenario } from './scenarioEngine';
import { processProactiveIntelligence } from './proactiveIntelligence';
import { AgentRequest } from './types';

// 定时任务配置
const SCHEDULE_CONFIG = {
  // 每10分钟运行一次场景生成
  SCAN_INTERVAL: 10 * 60 * 1000, // 10分钟
  // 每天早上10点定时推送
  MORNING_PUSH_HOUR: 10,
  MORNING_PUSH_MINUTE: 0,
};

// 车辆状态模拟（实际项目中应从API获取）
interface VehicleState {
  batteryPercent: number;
  range: number;
  locked: boolean;
  tirePressure: {
    fl: number;
    fr: number;
    rl: number;
    rr: number;
  };
  isCharging: boolean;
  acStatus: 'on' | 'off';
  seatHeating: number;
  sentryMode: 'on' | 'off';
}

// 用户配置
interface UserConfig {
  userId: string;
  vehicleId: string;
  enableMorningPush: boolean;    // 开启早上10点推送
  enable10MinScan: boolean;     // 开启10分钟扫描
  enabledAlerts: string[];      // 开启的提醒类型
}

// 回调函数类型
type AlertCallback = (alert: {
  scenario: Scenario;
  vehicleState: VehicleState;
  reason: string;
  alertType: string;
}) => void;

// 场景调度器类
class ScenarioScheduler {
  private static instance: ScenarioScheduler;
  private timer: NodeJS.Timeout | null = null;
  private morningTimer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private callbacks: AlertCallback[] = [];
  private userConfig: UserConfig | null = null;
  private vehicleState: VehicleState | null = null;

  private constructor() {}

  static getInstance(): ScenarioScheduler {
    if (!ScenarioScheduler.instance) {
      ScenarioScheduler.instance = new ScenarioScheduler();
    }
    return ScenarioScheduler.instance;
  }

  /**
   * 初始化调度器
   */
  initialize(config: UserConfig, vehicleState: VehicleState) {
    this.userConfig = config;
    this.vehicleState = vehicleState;
    console.log('[ScenarioScheduler] 初始化完成');
  }

  /**
   * 更新车辆状态
   */
  updateVehicleState(state: VehicleState) {
    this.vehicleState = state;
  }

  /**
   * 注册提醒回调
   */
  onAlert(callback: AlertCallback) {
    this.callbacks.push(callback);
  }

  /**
   * 移除提醒回调
   */
  offAlert(callback: AlertCallback) {
    const index = this.callbacks.indexOf(callback);
    if (index > -1) {
      this.callbacks.splice(index, 1);
    }
  }

  /**
   * 启动调度器
   */
  start() {
    if (this.isRunning) {
      console.log('[ScenarioScheduler] 已在运行中');
      return;
    }

    this.isRunning = true;
    console.log('[ScenarioScheduler] 启动场景引擎服务');

    // 1. 启动10分钟扫描任务
    if (this.userConfig?.enable10MinScan) {
      this.start10MinScan();
    }

    // 2. 启动早上10点定时推送
    if (this.userConfig?.enableMorningPush) {
      this.scheduleMorningPush();
    }
  }

  /**
   * 停止调度器
   */
  stop() {
    this.isRunning = false;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    if (this.morningTimer) {
      clearTimeout(this.morningTimer);
      this.morningTimer = null;
    }

    console.log('[ScenarioScheduler] 停止场景引擎服务');
  }

  /**
   * 10分钟扫描任务
   */
  private start10MinScan() {
    console.log('[ScenarioScheduler] 启动10分钟扫描任务');

    this.timer = setInterval(async () => {
      await this.runSceneScan();
    }, SCHEDULE_CONFIG.SCAN_INTERVAL);

    // 立即执行一次
    this.runSceneScan();
  }

  /**
   * 执行场景扫描 - 生成模拟场景并推理
   */
  private async runSceneScan() {
    if (!this.userConfig) {
      console.log('[ScenarioScheduler] 缺少用户配置，跳过扫描');
      return;
    }

    console.log('[ScenarioScheduler] ========== 执行场景扫描 ==========');

    try {
      // 1. 生成模拟场景（每10分钟生成一个模拟的用户出行场景）
      const simulated = generateSimulatedScenario(this.vehicleState || undefined);
      const { scenario, simulatedTime, simulatedDay, description, vehicleState } = simulated;

      console.log(`[ScenarioScheduler] 模拟时间: ${simulatedDay} ${simulatedTime}`);
      console.log(`[ScenarioScheduler] 场景: ${scenario.name}`);
      console.log(`[ScenarioScheduler] 车辆状态: 电量${vehicleState.batteryPercent}%, 续航${vehicleState.range}km`);

      // 2. 记录场景
      recordScenario(scenario, vehicleState);

      // 3. 场景推理，判断是否需要提醒
      const alertDecision = shouldTriggerAlert(scenario, vehicleState);

      // 4. 如果需要提醒，触发回调
      if (alertDecision.shouldAlert) {
        console.log('[ScenarioScheduler] ⚠️ 触发提醒:', alertDecision.reason);

        // 通知所有回调
        this.callbacks.forEach(callback => {
          callback({
            scenario,
            vehicleState: vehicleState as any,
            reason: alertDecision.reason,
            alertType: alertDecision.alertType,
          });
        });
      } else {
        console.log('[ScenarioScheduler] ✅ 车辆状态正常，无需提醒');
      }

      console.log('[ScenarioScheduler] ========== 扫描完成 ==========\n');
    } catch (error) {
      console.error('[ScenarioScheduler] 场景扫描失败:', error);
    }
  }

  /**
   * 定时早上10点推送
   */
  private scheduleMorningPush() {
    console.log('[ScenarioScheduler] 设置早上10点定时推送');

    const scheduleNextPush = () => {
      const now = new Date();
      const target = new Date();

      // 设置为今天或明天的10点
      target.setHours(SCHEDULE_CONFIG.MORNING_PUSH_HOUR, SCHEDULE_CONFIG.MORNING_PUSH_MINUTE, 0, 0);

      if (target <= now) {
        // 如果今天10点已过，设置为明天
        target.setDate(target.getDate() + 1);
      }

      const delay = target.getTime() - now.getTime();
      console.log(`[ScenarioScheduler] 下次推送时间: ${target.toLocaleString()}`);

      this.morningTimer = setTimeout(async () => {
        await this.runMorningPush();

        // 重新设置明天的推送
        scheduleNextPush();
      }, delay);
    };

    scheduleNextPush();
  }

  /**
   * 执行早上10点推送
   */
  private async runMorningPush() {
    if (!this.vehicleState || !this.userConfig) {
      console.log('[ScenarioScheduler] 缺少配置，跳过推送');
      return;
    }

    console.log('[ScenarioScheduler] 执行早上10点推送...');

    try {
      // 使用主动智能Agent进行深度推理
      const request: AgentRequest = {
        query: '早上好，请检查车辆状态并给我一个场景化的出行建议',
        context: {
          vehicleStatus: this.vehicleState,
          isMorning: true,
          isScheduled: true, // 标记为定时任务
        },
      };

      const response = await processProactiveIntelligence(request);

      console.log('[ScenarioScheduler] 推送内容:', response.content);

      // 触发回调
      this.callbacks.forEach(callback => {
        const scenario = getCurrentScenario();
        if (scenario) {
          callback({
            scenario,
            vehicleState: this.vehicleState!,
            reason: response.content,
            alertType: 'morning_push',
          });
        }
      });

      return response;
    } catch (error) {
      console.error('[ScenarioScheduler] 早上推送失败:', error);
    }
  }

  /**
   * 手动触发一次场景扫描（供测试或手动调用）
   */
  async manualTrigger(): Promise<{
    scenario: Scenario | null;
    shouldAlert: boolean;
    reason: string;
    alertType: string;
  }> {
    const scenario = getCurrentScenario();

    if (!scenario || !this.vehicleState) {
      return {
        scenario: null,
        shouldAlert: false,
        reason: '缺少配置',
        alertType: 'error',
      };
    }

    const alertDecision = shouldTriggerAlert(scenario, this.vehicleState);

    return {
      scenario,
      shouldAlert: alertDecision.shouldAlert,
      reason: alertDecision.reason,
      alertType: alertDecision.alertType,
    };
  }

  /**
   * 获取调度器状态
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      config: this.userConfig,
      hasVehicleState: !!this.vehicleState,
      callbackCount: this.callbacks.length,
    };
  }
}

// 导出单例
export const scenarioScheduler = ScenarioScheduler.getInstance();

// 导出类（供测试）
export { ScenarioScheduler };

// ========== 使用示例 ==========

/*
// 1. 初始化（在应用启动时）
import { scenarioScheduler } from './scenarioScheduler';

scenarioScheduler.initialize(
  {
    userId: 'user_001',
    vehicleId: 'car_001',
    enableMorningPush: true,   // 开启早上10点推送
    enable10MinScan: true,    // 开启10分钟扫描
    enabledAlerts: ['battery', 'tire_pressure', 'door', 'scenario'],
  },
  {
    batteryPercent: 65,
    range: 420,
    locked: true,
    tirePressure: { fl: 2.8, fr: 2.8, rl: 2.7, rr: 2.7 },
    isCharging: false,
    acStatus: 'off',
    seatHeating: 0,
    sentryMode: 'on',
  }
);

// 2. 注册提醒回调
scenarioScheduler.onAlert((alert) => {
  console.log('收到提醒:', alert);
  // 可以发送推送通知、显示Toast等
});

// 3. 启动服务
scenarioScheduler.start();

// 4. 停止服务
// scenarioScheduler.stop();

// 5. 更新车辆状态（定时从API获取）
setInterval(() => {
  fetchVehicleState().then(state => {
    scenarioScheduler.updateVehicleState(state);
  });
}, 60000); // 每分钟更新一次
*/
