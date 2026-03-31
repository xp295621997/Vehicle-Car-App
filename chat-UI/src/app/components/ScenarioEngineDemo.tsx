// 场景引擎演示组件 - 可在页面上查看场景运行状态

import { useState, useEffect } from 'react';
import { scenarioScheduler, generateSimulatedScenario, getSimulationCount, getScenarioHistory, getScenarioStats } from '../../services/agents';

// 模拟车辆状态
const mockVehicleState = {
  batteryPercent: 75,
  range: 480,
  locked: true,
  tirePressure: { fl: 2.8, fr: 2.8, rl: 2.7, rr: 2.7 },
  isCharging: false,
  acStatus: 'off' as const,
  seatHeating: 0,
  sentryMode: 'on' as const,
};

export default function ScenarioEngineDemo() {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [simCount, setSimCount] = useState(0);
  const [stats, setStats] = useState<{ scenarioId: string; count: number }[]>([]);
  const [lastScenario, setLastScenario] = useState<string>('');

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-9), `${time} ${msg}`]);
  };

  const handleStart = () => {
    // 初始化
    scenarioScheduler.initialize(
      {
        userId: 'user_001',
        vehicleId: 'car_001',
        enableMorningPush: true,
        enable10MinScan: true,
        enabledAlerts: ['battery', 'tire_pressure', 'door', 'scenario'],
      },
      mockVehicleState
    );

    // 注册回调
    scenarioScheduler.onAlert((alert) => {
      addLog(`⚠️ 提醒: ${alert.scenario.name} - ${alert.reason}`);
      setLastScenario(alert.scenario.name);
    });

    // 启动
    scenarioScheduler.start();
    setIsRunning(true);
    addLog('🚗 场景引擎服务已启动');
    addLog('⏰ 每10分钟生成模拟场景');
    addLog('🌅 每天10点定时推送');

    // 更新统计
    setInterval(() => {
      setSimCount(getSimulationCount());
      setStats(getScenarioStats());
    }, 1000);
  };

  const handleStop = () => {
    scenarioScheduler.stop();
    setIsRunning(false);
    addLog('⏹️ 服务已停止');
  };

  const handleManualTrigger = async () => {
    const result = scenarioScheduler.manualTrigger();
    addLog(`🔄 手动触发: ${(await result).scenario?.name || '无'}`);
    setSimCount(getSimulationCount());
  };

  return (
    <div style={{
      padding: '20px',
      maxWidth: '600px',
      margin: '0 auto',
      fontFamily: 'monospace'
    }}>
      <h2>🛤️ 场景引擎演示</h2>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={handleStart}
          disabled={isRunning}
          style={{
            padding: '10px 20px',
            marginRight: '10px',
            background: isRunning ? '#ccc' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isRunning ? 'not-allowed' : 'pointer'
          }}
        >
          启动服务
        </button>

        <button
          onClick={handleStop}
          disabled={!isRunning}
          style={{
            padding: '10px 20px',
            marginRight: '10px',
            background: !isRunning ? '#ccc' : '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: !isRunning ? 'not-allowed' : 'pointer'
          }}
        >
          停止
        </button>

        <button
          onClick={handleManualTrigger}
          style={{
            padding: '10px 20px',
            background: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          手动触发
        </button>
      </div>

      <div style={{
        background: '#f5f5f5',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h3>📊 状态</h3>
        <p>运行状态: {isRunning ? '✅ 运行中' : '⏹️ 已停止'}</p>
        <p>模拟次数: {simCount}</p>
        <p>当前场景: {lastScenario || '-'}</p>
      </div>

      <div style={{
        background: '#f5f5f5',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h3>📈 场景统计</h3>
        {stats.length === 0 ? (
          <p>暂无数据</p>
        ) : (
          <ul>
            {stats.map(s => (
              <li key={s.scenarioId}>{s.scenarioId}: {s.count}次</li>
            ))}
          </ul>
        )}
      </div>

      <div style={{
        background: '#1e1e1e',
        color: '#0f0',
        padding: '15px',
        borderRadius: '8px',
        height: '200px',
        overflow: 'auto'
      }}>
        {logs.map((log, i) => (
          <div key={i} style={{ marginBottom: '5px' }}>{log}</div>
        ))}
      </div>
    </div>
  );
}
