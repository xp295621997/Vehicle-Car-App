#!/usr/bin/env node

/**
 * 场景引擎独立服务
 * 端口: 3001
 *
 * 功能:
 * - 每10分钟生成模拟场景并进行推理
 * - 每天10点定时推送
 *
 * 启动: node scenario-service.cjs
 * API:
 *   GET /api/scenario - 获取当前场景
 *   GET /api/trigger - 手动触发一次推理
 *   GET /api/stats - 获取场景统计
 *   GET /api/status - 获取服务状态
 *   GET / - Web控制台界面
 */

const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

const HTML_FILE = path.join(__dirname, 'scenario-console.html');

// 模拟的场景库
const SCENARIO_LIBRARY = {
  'morning_commute': { id: 'morning_commute', name: '早高峰通勤', description: '工作日早晨用车上班', typicalActions: ['一键备车', '导航到公司'] },
  'workday_parking': { id: 'workday_parking', name: '工作日驻车', description: '白天在公司停车', typicalActions: ['锁车', '哨兵模式'] },
  'lunch_break': { id: 'lunch_break', name: '午休用车', description: '午休时间短暂用车', typicalActions: ['开车窗通风', '开空调'] },
  'evening_commute': { id: 'evening_commute', name: '晚高峰通勤', description: '下班回家', typicalActions: ['一键备车', '导航回家'] },
  'night_parking': { id: 'night_parking', name: '夜间驻车', description: '夜间停车休息', typicalActions: ['锁车', '哨兵模式'] },
  'night_charging': { id: 'night_charging', name: '夜间充电', description: '夜间充电高峰期', typicalActions: ['插枪充电', '预约充电'] },
};

const timeSlots = [
  { time: '07:30', type: 'morning_commute' },
  { time: '08:30', type: 'workday_parking' },
  { time: '12:00', type: 'lunch_break' },
  { time: '13:00', type: 'workday_parking' },
  { time: '18:00', type: 'evening_commute' },
  { time: '19:00', type: 'night_parking' },
  { time: '21:00', type: 'night_charging' },
  { time: '23:00', type: 'night_parking' },
  { time: '06:00', type: 'morning_commute' },
];

// 状态
let simulationCount = 0;
let isRunning = false;
let alerts = [];
let lastAlertCount = 0; // 记录上次获取的提醒数量，用于判断是否有新提醒
const PORT = 3001;

// 生成模拟场景
function generateSimulatedScenario() {
  simulationCount++;
  const slotIndex = simulationCount % timeSlots.length;
  const slot = timeSlots[slotIndex];
  const scenario = SCENARIO_LIBRARY[slot.type] || SCENARIO_LIBRARY.morning_commute;

  // 模拟车辆状态
  const vehicleState = {
    batteryPercent: Math.floor(Math.random() * 60) + 30,
    range: 300 + Math.floor(Math.random() * 200),
    locked: slot.type.includes('parking') || slot.type.includes('night'),
    isCharging: slot.type === 'night_charging',
    tirePressure: { fl: 2.5 + Math.random() * 0.5, fr: 2.5 + Math.random() * 0.5, rl: 2.5 + Math.random() * 0.5, rr: 2.5 + Math.random() * 0.5 },
  };

  // 随机异常
  if (Math.random() < 0.15) vehicleState.batteryPercent = 5 + Math.floor(Math.random() * 10);
  if (Math.random() < 0.1) vehicleState.tirePressure.rl = 2.0 + Math.random() * 0.2;

  return {
    scenario,
    simulatedTime: slot.time,
    description: `${slot.time} - ${scenario.name}`,
    vehicleState,
  };
}

// 推理是否需要提醒
function shouldTriggerAlert(scenario, vehicleState) {
  const alertList = [];

  if (vehicleState.batteryPercent < 10) {
    alertList.push({ type: 'battery_critical', message: '电量极低(<10%)' });
  } else if (vehicleState.batteryPercent < 20 && !scenario.id.includes('night')) {
    alertList.push({ type: 'battery_low', message: '电量偏低(<20%)' });
  }

  if (vehicleState.tirePressure.rl < 2.3) {
    const tp = vehicleState.tirePressure;
    alertList.push({
      type: 'tire_pressure',
      message: '胎压偏低',
      tirePressure: {
        fl: tp.fl.toFixed(2),
        fr: tp.fr.toFixed(2),
        rl: tp.rl.toFixed(2),
        rr: tp.rr.toFixed(2),
      }
    });
  }

  return alertList;
}

// HTTP服务
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // 静态文件服务
  if (pathname === '/' || pathname === '/index.html') {
    fs.readFile(HTML_FILE, (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading HTML file');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });
    return;
  }

  if (pathname === '/api/scenario') {
    // 获取当前场景
    const result = generateSimulatedScenario();
    const alertList = shouldTriggerAlert(result.scenario, result.vehicleState);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      data: {
        ...result,
        alerts: alertList,
        simulationCount,
      }
    }));
  } else if (pathname === '/api/trigger') {
    // 手动触发
    const result = generateSimulatedScenario();
    const alertList = shouldTriggerAlert(result.scenario, result.vehicleState);

    if (alertList.length > 0) {
      alerts.push({
        time: new Date().toISOString(),
        scenario: result.scenario.name,
        alerts: alertList,
      });
    }

    console.log(`[${new Date().toLocaleTimeString()}] 触发场景: ${result.scenario.name}, 提醒: ${alertList.length > 0 ? '是' : '否'}`);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      message: `场景: ${result.scenario.name}`,
      alertCount: alertList.length,
      details: result,
    }));
  } else if (pathname === '/api/stats') {
    // 获取统计
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      simulationCount,
      recentAlerts: alerts.slice(-10),
    }));
  } else if (pathname === '/api/alerts') {
    // 获取提醒列表（用于前端轮询）
    const sinceLastFetch = parsedUrl.query.since;
    let newAlerts = alerts;

    // 如果传了since参数，返回该时间点之后的提醒
    if (sinceLastFetch) {
      newAlerts = alerts.filter(a => new Date(a.time) > new Date(sinceLastFetch));
    }

    // 返回所有提醒和是否有新提醒的标记
    // 有胎压或电量相关提醒时也标记为新
    const hasTireOrBatteryAlert = alerts.some(a =>
      a.alerts.some(alert => alert.type === 'tire_pressure' || alert.type.includes('battery'))
    );
    const hasNew = hasTireOrBatteryAlert || alerts.length > lastAlertCount;
    if (hasNew) {
      lastAlertCount = alerts.length;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      hasNew,
      alerts: alerts.slice(-20), // 返回最近20条
      count: alerts.length,
    }));
  } else if (pathname === '/api/ack') {
    // 确认收到提醒（标记已读）
    lastAlertCount = alerts.length;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
  } else if (pathname === '/api/mock-alert') {
    // 手动添加一个mock提醒
    const alertType = parsedUrl.query.type || 'tire_pressure';
    const scenarioName = parsedUrl.query.scenario || '早高峰通勤';

    let alertData;
    if (alertType === 'tire_pressure') {
      // 生成随机胎压数据，其中至少一个低于2.3
      const rl = (2.0 + Math.random() * 0.25).toFixed(2);
      const tp = {
        fl: (2.5 + Math.random() * 0.4).toFixed(2),
        fr: (2.5 + Math.random() * 0.4).toFixed(2),
        rl: rl,
        rr: (2.5 + Math.random() * 0.4).toFixed(2),
      };
      alertData = { type: 'tire_pressure', message: '胎压偏低', tirePressure: tp };
    } else {
      alertData = { type: alertType, message: '电量偏低(<20%)' };
    }

    const mockAlert = {
      time: new Date().toISOString(),
      scenario: scenarioName,
      alerts: [alertData]
    };

    alerts.push(mockAlert);
    lastAlertCount = alerts.length;

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      message: `已添加${scenarioName}的${alertType}提醒`,
      alert: mockAlert
    }));
  } else if (pathname === '/api/clear') {
    // 清空所有提醒
    alerts = [];
    lastAlertCount = 0;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: '已清空所有提醒' }));
  } else if (pathname === '/api/status') {
    // 服务状态
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      status: isRunning ? 'running' : 'stopped',
      simulationCount,
      uptime: process.uptime(),
    }));
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

// 启动服务
server.listen(PORT, () => {
  isRunning = true;
  console.log(`
╔═══════════════════════════════════════════╗
║     🚗 场景引擎服务已启动                  ║
╠═══════════════════════════════════════════╣
║  端口: ${PORT}                              ║
║                                           ║
║  API:                                      ║
║  - GET /api/scenario  获取当前场景        ║
║  - GET /api/trigger  手动触发推理        ║
║  - GET /api/stats   获取统计              ║
║  - GET /api/status  服务状态              ║
║                                           ║
║  每10分钟自动生成场景 + 推理              ║
╚═══════════════════════════════════════════╝
  `);

  // 立即触发一次
  console.log('\n初始化触发...\n');
  const result = generateSimulatedScenario();
  const alertList = shouldTriggerAlert(result.scenario, result.vehicleState);
  console.log(`场景: ${result.scenario.name}`);
  console.log(`电量: ${result.vehicleState.batteryPercent}%`);
  console.log(`胎压: ${JSON.stringify(result.vehicleState.tirePressure)}`);
  console.log(`提醒: ${alertList.length > 0 ? '是 - ' + alertList.map(a => a.message).join(', ') : '否'}`);
  console.log('\n每10分钟会自动运行...\n');
});

// 每10分钟运行一次
setInterval(() => {
  const result = generateSimulatedScenario();
  const alertList = shouldTriggerAlert(result.scenario, result.vehicleState);

  console.log(`\n[${new Date().toLocaleTimeString()}] ========== 场景扫描 ==========`);
  console.log(`场景: ${result.scenario.name} (${result.simulatedTime})`);
  console.log(`电量: ${result.vehicleState.batteryPercent}% | 续航: ${result.vehicleState.range}km`);
  console.log(`胎压: FL:${result.vehicleState.tirePressure.fl.toFixed(1)} FR:${result.vehicleState.tirePressure.fr.toFixed(1)} RL:${result.vehicleState.tirePressure.rl.toFixed(1)} RR:${result.vehicleState.tirePressure.rr.toFixed(1)}`);

  if (alertList.length > 0) {
    console.log(`⚠️  触发提醒: ${alertList.map(a => a.message).join(', ')}`);
    alerts.push({
      time: new Date().toISOString(),
      scenario: result.scenario.name,
      alerts: alertList,
    });
    lastAlertCount = alerts.length;
  } else {
    console.log(`✅ 状态正常`);
  }
  console.log(`==========================================\n`);
}, 10 * 60 * 1000);

// 每天10点检查
function scheduleMorningPush() {
  const now = new Date();
  const target = new Date();
  target.setHours(10, 0, 0, 0);

  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }

  const delay = target.getTime() - now.getTime();
  console.log(`[定时任务] 下次早上推送: ${target.toLocaleString()}`);

  setTimeout(() => {
    console.log('\n🌅 ========== 早上10点定时推送 ==========\n');

    const result = generateSimulatedScenario();
    const alertList = shouldTriggerAlert(result.scenario, result.vehicleState);

    console.log(`当前场景: ${result.scenario.name}`);
    console.log(`车辆状态: 电量${result.vehicleState.batteryPercent}%, 续航${result.vehicleState.range}km`);
    console.log(`提醒: ${alertList.length > 0 ? alertList.map(a => a.message).join(', ') : '无'}\n`);

    // 重新设置明天的推送
    scheduleMorningPush();
  }, delay);
}

scheduleMorningPush();
