// Agent 系统类型定义

// Agent 类型枚举
export enum AgentType {
  INTENT_CLASSIFIER = 'intent_classifier',
  PAGE_OPTIMIZATION = 'page_optimization',
  VEHICLE_CONTROL = 'vehicle_control',
  VEHICLE_STATUS = 'vehicle_status',
  VEHICLE_KNOWLEDGE = 'vehicle_knowledge',
  IMAGE_UNDERSTANDING = 'image_understanding',
  WEB_SEARCH = 'web_search',
  CAR_PHONE_INTEROP = 'car_phone_interop',
  PROACTIVE_INTELLIGENCE = 'proactive_intelligence',  // 主动智能Agent
  SCENARIO_ENGINE = 'scenario_engine',                // 场景引擎Agent
}

// 意图类型枚举
export enum IntentType {
  // 车辆控制
  VEHICLE_CONTROL = 'vehicle_control',
  // 车辆状态查询
  VEHICLE_STATUS = 'vehicle_status',
  // 车辆配置问答（RAG）
  VEHICLE_KNOWLEDGE = 'vehicle_knowledge',
  // 图片理解
  IMAGE_UNDERSTANDING = 'image_understanding',
  // 联网搜索/闲聊
  WEB_SEARCH = 'web_search',
  // 手车互联
  CAR_PHONE_INTEROP = 'car_phone_interop',
  // 页面优化
  PAGE_OPTIMIZATION = 'page_optimization',
  // 主动智能（根据车辆状态主动提醒）
  PROACTIVE_INTELLIGENCE = 'proactive_intelligence',
  // 场景引擎（特定场景的问题解答和引导）
  SCENARIO_ENGINE = 'scenario_engine',
  // 未知/默认
  UNKNOWN = 'unknown',
}

// Agent 请求接口
export interface AgentRequest {
  query: string;
  context?: Record<string, any>;
  attachments?: Attachment[];
  intent?: IntentType;
  onProgress?: (status: string) => void;
}

// 附件类型
export interface Attachment {
  type: 'image' | 'audio' | 'location' | 'file';
  data: string;
  name?: string;
}

// Agent 响应接口
export interface AgentResponse {
  content: string;
  action: string;
  agent: AgentType;
  intent: IntentType;
  success: boolean;
  error?: string;
  data?: Record<string, any>;
}

// 车辆状态信息
export interface VehicleStatus {
  range: number;           // 续航公里数
  batteryPercent: number;  // 电量百分比
  locked: boolean;         // 是否锁车
  tirePressure: {          // 胎压
    front: number;
    rear: number;
  };
  acStatus: 'on' | 'off' | 'auto';
  seatHeating: number;     // 座椅加热档位 (0-3)
  seatVentilation: 'on' | 'off';
  sentryMode: 'on' | 'off';
  driveMode: 'sport' | 'comfort' | 'eco';
}

// 车辆控制命令映射
export interface VehicleControlCommand {
  action: string;
  apiCall: () => Promise<any>;
  successMessage: string;
  errorMessage: string;
}

// 图片理解结果
export interface ImageUnderstandingResult {
  description: string;
  tags?: string[];
  hasCoordinates?: boolean;
  coordinates?: { x: number; y: number };
}

// 搜索结果
export interface SearchResult {
  title: string;
  body: string;
  link: string;
}

// Web 搜索结果
export interface WebSearchResult {
  results: SearchResult[];
  query: string;
  timestamp: string;
}

// 手车互联数据
export interface CarPhoneInteropData {
  type: 'image' | 'location' | 'audio';
  data: string;
  metadata?: Record<string, any>;
}

// ========== 胎压知识库类型 ==========

// 胎压级别
export enum TirePressureLevel {
  NORMAL = 'normal',        // 正常 (2.6-3.4 bar)
  LOW_LEVEL_1 = 'low_1',   // 一级提醒 (2.28 bar 报警)
  LOW_LEVEL_2 = 'low_2',   // 二级提醒 (1.8 bar 报警)
  TOO_HIGH = 'too_high',   // 过高
}

// 胎压状态信息
export interface TirePressureStatus {
  frontLeft: number;   // 左前轮 (bar)
  frontRight: number;  // 右前轮 (bar)
  rearLeft: number;    // 左后轮 (bar)
  rearRight: number;   // 右后轮 (bar)
  level: TirePressureLevel;
  isDriving: boolean;  // 行车中/驻车
  alertTime?: Date;    // 报警时间
}

// 胎压提醒信息
export interface TirePressureAlert {
  level: TirePressureLevel;
  title: string;
  message: string;
  canDrive: boolean;
  suggestions: string[];
  nextActions: string[];
}

// 场景类型
export type ScenarioType =
  | 'tire_pressure'
  | 'battery'
  | 'door'
  | 'charging'
  | 'sentry'
  | 'ac'
  | 'maintenance'
  | 'unknown';

// 场景引擎结果
export interface ScenarioResult {
  scenario: ScenarioType;
  title: string;
  description: string;
  steps: string[];
  warnings: string[];
  recommendedActions: string[];
  relevantKnowledge?: string[];
}
