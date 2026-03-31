// Agent 系统统一导出

// 类型定义
export * from './types';

// 调度器
export { dispatch, dispatchSync, classifyIntent } from './dispatcher';

// Agents
export { processVehicleControl } from './vehicleControl';
export { processVehicleStatus } from './vehicleStatus';
export { processImageUnderstanding } from './imageUnderstanding';
export { processWebSearch } from './webSearch';
export { processCarPhoneInterop } from './carPhoneInterop';
export { processPageOptimization, debugLog, getConfig, updateConfig, getAnimationStyle, LogLevel } from './pageOptimization';
// 主动智能Agent
export { processProactiveIntelligence, checkTirePressureStatus, getHistory } from './proactiveIntelligence';
// 场景引擎Agent
export { processScenarioEngine, getCurrentScenario, shouldTriggerAlert, recordScenario, getScenarioHistory, getScenarioStats, generateSimulatedScenario, resetSimulation, getSimulationCount } from './scenarioEngine';
export type { Scenario } from './scenarioEngine';
// 场景调度器（后台服务）
export { scenarioScheduler, ScenarioScheduler } from './scenarioScheduler';
// 手车互联API
export { initUserConfig, sendAddressToCar, sendImageToCar, sendVoiceToCar } from '../carPhoneApi';
// 车辆知识库
export { retrieveVehicleKnowledge, isVehicleConfigQuery, getKnowledgeBase } from './vehicleKnowledge';
export { processVehicleKnowledge } from './vehicleKnowledgeAgent';
