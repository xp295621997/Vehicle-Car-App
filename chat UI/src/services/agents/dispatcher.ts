// 意图分类与分发器

import { IntentType, AgentRequest, AgentResponse, AgentType } from './types';
import { processVehicleControl } from './vehicleControl';
import { processVehicleStatus } from './vehicleStatus';
import { processImageUnderstanding } from './imageUnderstanding';
import { processWebSearch } from './webSearch';
import { processCarPhoneInterop } from './carPhoneInterop';
import { processPageOptimization } from './pageOptimization';
import { processProactiveIntelligence } from './proactiveIntelligence';
import { processScenarioEngine } from './scenarioEngine';
import { processVehicleKnowledge } from './vehicleKnowledgeAgent';
import { classifyIntentByVector } from './vectorClassifier';

// 意图分类关键词映射
const INTENT_KEYWORDS: Record<IntentType, string[]> = {
  [IntentType.VEHICLE_CONTROL]: [
    // 车身控制
    '前备箱', '后备箱', '尾箱', '充电口',
    '解锁', '开锁', '锁车', '锁门', '上锁',
    '开车窗', '关车窗', '开窗', '关窗',
    // 空调
    '空调', '冷气', '暖气', '温度', '制热', '制冷',
    // 灯光
    '闪灯', '车灯', '大灯', '灯光',
    // 喇叭
    '鸣笛', '喇叭', '按喇叭',
    // 哨兵
    '哨兵', '哨兵模式',
    // 座椅
    '座椅加热', '座椅通风', '加热', '通风',
    // 方向盘
    '方向盘加热', '方向盘',
    // 备车
    '备车', '一键备车', '预热', '准备车',
    // 驾驶模式
    '运动模式', '舒适模式', '节能模式', '经济模式', 'sport', 'eco',
    // 充电
    '充电', '停止充电', '开始充电', '预约充电',
    // 氛围灯（暂不支持）
    // '氛围灯',
    // 动能回收
    '动能回收', '回收',
    // 车道保持
    '车道保持', '车道偏离',
  ],
  [IntentType.VEHICLE_STATUS]: [
    '续航', '公里', '还能跑', '电量', '电', 'percent',
    '锁好', '锁了吗', '车锁', '车门',
    '胎压', '车况', '状态', '车辆状态',
    '车速', '玻璃水', '保养', '里程',
  ],
  // 车辆配置知识库（RAG）
  [IntentType.VEHICLE_KNOWLEDGE]: [
    'su7', 'ultra', '小米汽车', '小米车',
    '售价', '多少钱', '优惠',
    '续航', '电池', '充电', '快充',
    '加速', '马力', '功率', '扭矩', '破百',
    '颜色', '配色', '外观',
    '尺寸', '空间', '后备箱', '前备箱', '轴距',
    '配置', '亮点', '卖点', '有什么',
    '怎么样', '如何', '好不好',
  ],
  [IntentType.IMAGE_UNDERSTANDING]: [
    '图片', '照片', '这张', '那个图', '图像', '画面',
    '什么意思', '是什么', '描述', '看看', '识别',
  ],
  [IntentType.WEB_SEARCH]: [
    '天气', '新闻', '查询', '搜索', '附近',
    '股票', '股价', '怎么样', '如何', '为什么',
    '今天', '明天', '后天', '昨天',
    '哪里', '什么', '谁', '多少', '几点',
    // 闲聊
    '你好', 'hello', 'hi', '在吗', '帮忙',
  ],
  [IntentType.CAR_PHONE_INTEROP]: [
    '发送到车', '发到车机', '发送到车机',
    '导航到', '设置导航', '去这里',
    '显示在车上', '投屏', '发送到车辆',
  ],
  [IntentType.PAGE_OPTIMIZATION]: [
    '动画', '效果', '调试', '日志', 'log',
    '优化', '卡顿', '流畅', '样式',
  ],
  // 主动智能Agent - 车辆状态主动提醒
  [IntentType.PROACTIVE_INTELLIGENCE]: [
    '主动检查', '检查状态', '看看车怎么样',
    '有什么提醒', '提醒我', '车况提醒',
    '状态异常', '主动推送', '智能提醒',
    '检查下', '帮我看看', '现在怎么样',
  ],
  // 场景引擎Agent - 特定场景的问题解答
  [IntentType.SCENARIO_ENGINE]: [
    '怎么处理', '怎么办', '如何处理',
    '胎压低', '胎压正常', '胎压高',
    '轮胎漏气', '扎钉', '补气',
    '电量低', '充电问题', '故障',
    '保养', '维修', '问题', '解决方案',
  ],
  [IntentType.UNKNOWN]: [],
};

/**
 * 意图分类器 - 基于向量检索
 */
export function classifyIntent(query: string, attachments?: { type: string }[]): IntentType {
  const lowerQuery = query.toLowerCase();

  // 智能判断附件+语义的意图
  if (attachments && attachments.length > 0) {
    // 检查是否有发送到车机的意图（语义分析）
    const carRelatedKeywords = [
      '车', '车机', '导航', '发送', '发到', '投屏', '显示',
      '目的地', '地址', '路线', '驾驶', '开过去'
    ];
    const hasCarIntent = carRelatedKeywords.some(kw => lowerQuery.includes(kw));

    for (const attachment of attachments) {
      // 有车机相关意图+图片 = 图片地址发送到车机
      if (attachment.type === 'image' && hasCarIntent) {
        return IntentType.CAR_PHONE_INTEROP;
      }
      // 有车机相关意图+位置/音频 = 直接发送到车机
      if (attachment.type === 'location' || attachment.type === 'audio') {
        return IntentType.CAR_PHONE_INTEROP;
      }
      // 仅图片 = 图片理解
      if (attachment.type === 'image') {
        return IntentType.IMAGE_UNDERSTANDING;
      }
    }
  }

  // 优先检查图片内容描述
  if (lowerQuery.includes('图片内容') || lowerQuery.includes('[图片')) {
    return IntentType.IMAGE_UNDERSTANDING;
  }

  // 使用向量检索进行意图分类
  return classifyIntentByVector(query);
}

/**
 * 关键词匹配
 */
function matchKeywords(query: string, keywords: string[]): boolean {
  for (const keyword of keywords) {
    if (query.includes(keyword)) {
      return true;
    }
  }
  return false;
}

/**
 * Agent 分发器 - 根据意图分发到对应 Agent
 */
export async function dispatch(request: AgentRequest): Promise<AgentResponse> {
  const { query, context, attachments, onProgress } = request;

  // 解析附件
  const parsedAttachments = context?.attachments as { type: string; data: string }[] | undefined;

  // 检查是否在地址选择上下文中（但不是已发送成功/失败的状态）
  const previousData = context?.previousData as { awaitingSelection?: boolean; addresses?: string[]; type?: string } | undefined;
  console.log('[Agent Dispatcher] previousData:', previousData);

  // 如果是send_success或send_failed，需要重新分发
  if (previousData?.type === 'send_success' || previousData?.type === 'send_failed') {
    // 清除状态，重新进行意图分类
    console.log('[Agent Dispatcher] Previous action completed, re-classifying intent');
  } else if (previousData?.awaitingSelection) {
    // 用户正在选择地址，直接交给手车互联Agent处理
    console.log('[Agent Dispatcher] In address selection context, dispatching to CAR_PHONE_INTEROP');
    return await processCarPhoneInterop({ query, context, attachments: parsedAttachments, onProgress });
  }

  // 意图分类
  const intent = classifyIntent(query, parsedAttachments as { type: string }[] | undefined);

  console.log(`[Agent Dispatcher] Intent classified: ${intent}, Query: ${query}`);

  // 分发到对应 Agent
  try {
    switch (intent) {
      case IntentType.VEHICLE_CONTROL:
        return await processVehicleControl({ query, context, onProgress });

      case IntentType.VEHICLE_STATUS:
        return await processVehicleStatus({ query, context, onProgress });

      case IntentType.VEHICLE_KNOWLEDGE:
        return await processVehicleKnowledge({ query, context, onProgress });

      case IntentType.IMAGE_UNDERSTANDING:
        return await processImageUnderstanding({ query, context, attachments: parsedAttachments, onProgress });

      case IntentType.WEB_SEARCH:
        return await processWebSearch({ query, context, onProgress });

      case IntentType.CAR_PHONE_INTEROP:
        return await processCarPhoneInterop({ query, context, attachments: parsedAttachments, onProgress });

      case IntentType.PAGE_OPTIMIZATION:
        return await processPageOptimization({ query, context, onProgress });

      case IntentType.PROACTIVE_INTELLIGENCE:
        return await processProactiveIntelligence({ query, context, onProgress });

      case IntentType.SCENARIO_ENGINE:
        return await processScenarioEngine({ query, context, onProgress });

      default:
        return {
          content: '抱歉，我暂时无法理解您的指令。您可以试试说"打开空调"、"锁车"、"续航还有多少"等',
          action: '无法识别',
          agent: AgentType.INTENT_CLASSIFIER,
          intent: IntentType.UNKNOWN,
          success: false,
          error: 'Unknown intent',
        };
    }
  } catch (error: any) {
    console.error('[Agent Dispatcher] Error:', error);
    return {
      content: `处理您的请求时出现错误: ${error?.message || '未知错误'}`,
      action: '处理失败',
      agent: AgentType.INTENT_CLASSIFIER,
      intent,
      success: false,
      error: error?.message || 'Unknown error',
    };
  }
}

/**
 * 同步分发器 - 用于不需要异步处理的场景
 */
export function dispatchSync(request: AgentRequest): AgentResponse {
  const { query, context } = request;

  const intent = classifyIntent(query, context?.attachments as { type: string }[] | undefined);

  console.log(`[Agent Dispatcher] Intent classified (sync): ${intent}, Query: ${query}`);

  // 同步版本只返回意图信息，实际处理由异步版本完成
  return {
    content: '',
    action: `意图识别: ${intent}`,
    agent: AgentType.INTENT_CLASSIFIER,
    intent,
    success: true,
  };
}
