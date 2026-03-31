// 向量检索意图分类器

import { IntentType } from './types';

// 每个意图的示例句子（用于计算相似度）
const INTENT_EXAMPLES: Record<IntentType, string[]> = {
  [IntentType.VEHICLE_CONTROL]: [
    '打开空调',
    '关闭空调',
    '开车窗',
    '关车窗',
    '锁车',
    '解锁',
    '打开后备箱',
    '关闭后备箱',
    '打开前备箱',
    '打开充电口',
    '关闭充电口',
    '开启哨兵模式',
    '关闭哨兵模式',
    '打开座椅加热',
    '关闭座椅加热',
    '打开座椅通风',
    '打开方向盘加热',
    '一键备车',
    '运动模式',
    '舒适模式',
    '节能模式',
    '开始充电',
    '停止充电',
    '预约充电',
    '闪灯',
    '鸣笛',
    '打开车窗',
    '把空调关一下',
    '把车锁了',
  ],
  [IntentType.VEHICLE_STATUS]: [
    '续航还有多少',
    '电量还有多少',
    '车有没有锁好',
    '胎压正常吗',
    '车辆状态怎么样',
    '还能跑多少公里',
    '车锁好了吗',
    '现在车速多少',
    '车门关好了吗',
    '玻璃水够不够',
    '保养还有多久',
    '车况怎么样',
  ],
  [IntentType.VEHICLE_KNOWLEDGE]: [
    '小米SU7售价多少',
    '小米汽车多少钱',
    'SU7 Ultra价格',
    '续航多少公里',
    '电池容量多大',
    '充电速度',
    '百公里加速',
    '马力多少',
    '功率多大',
    '扭矩多少',
    '有哪些颜色',
    '外观颜色',
    '车身尺寸',
    '车内空间',
    '轴距多少',
    '后备箱多大',
    '前备箱多大',
    '有什么配置',
    '有哪些亮点',
    '卖点是什么',
    '质量怎么样',
    '好不好',
    'SU7怎么样',
  ],
  [IntentType.IMAGE_UNDERSTANDING]: [
    '看看这张图片',
    '图片里是什么',
    '这张照片什么意思',
    '描述一下这个图',
    '识别一下',
  ],
  [IntentType.WEB_SEARCH]: [
    '今天天气怎么样',
    '明天天气',
    '查一下天气',
    '有什么新闻',
    '今日新闻',
    '附近有充电站吗',
    '附近加油站',
    '小米公司股票价格',
    '股票怎么样',
    '查一下这个',
    '搜索一下',
    '今天几号',
    '现在几点',
    '你好',
    'hello',
    '在吗',
  ],
  [IntentType.CAR_PHONE_INTEROP]: [
    '发送到车机',
    '发到车上',
    '发送到车辆',
    '导航到这里',
    '设置导航',
    '去这个地方',
    '显示在车上',
    '投屏到车',
    '把这个地址发到车上',
    '把图片发到车里',
  ],
  [IntentType.PAGE_OPTIMIZATION]: [
    '打开动画',
    '关闭动画',
    '调试模式',
    '显示日志',
    '优化页面',
    '样式调整',
  ],
  [IntentType.PROACTIVE_INTELLIGENCE]: [
    '主动检查车况',
    '看看车怎么样',
    '有什么提醒',
    '车况怎么样',
    '检查下车辆状态',
    '现在怎么样',
  ],
  [IntentType.SCENARIO_ENGINE]: [
    '胎压低怎么办',
    '电量低怎么处理',
    '充电问题',
    '故障怎么办',
    '保养提醒',
  ],
  [IntentType.UNKNOWN]: [],
};

// 简单的字符串相似度计算（基于字符重叠）
function cosineSimilarity(str1: string, str2: string): number {
  const set1 = new Set(str1.toLowerCase().split(''));
  const set2 = new Set(str2.toLowerCase().split(''));

  let intersection = 0;
  for (const char of set1) {
    if (set2.has(char)) intersection++;
  }

  const magnitude1 = Math.sqrt(set1.size);
  const magnitude2 = Math.sqrt(set2.size);

  if (magnitude1 === 0 || magnitude2 === 0) return 0;

  return intersection / (magnitude1 * magnitude2);
}

// 更智能的相似度计算（考虑词序和多字符序列）
function smartSimilarity(query: string, example: string): number {
  const q = query.toLowerCase();
  const e = example.toLowerCase();

  // 1. 精确包含
  if (q.includes(e) || e.includes(q)) {
    return 0.9;
  }

  // 2. 词组匹配
  const qWords = q.split(/[\s,，。？！]+/).filter(w => w.length > 1);
  const eWords = e.split(/[\s,，。？！]+/).filter(w => w.length > 1);

  let matchScore = 0;
  for (const qw of qWords) {
    for (const ew of eWords) {
      if (qw === ew) {
        matchScore += 1;
      } else if (ew.includes(qw) || qw.includes(ew)) {
        matchScore += 0.5;
      }
    }
  }

  const wordScore = matchScore / Math.max(qWords.length, eWords.length);

  // 3. 字符级相似度
  const charScore = cosineSimilarity(q, e);

  return Math.max(wordScore * 0.7, charScore * 0.3);
}

/**
 * 向量检索意图分类器
 */
export function classifyIntentByVector(query: string): IntentType {
  if (!query || query.trim().length === 0) {
    return IntentType.UNKNOWN;
  }

  let bestIntent = IntentType.UNKNOWN;
  let bestScore = 0;

  // 计算与每个意图的相似度
  for (const [intent, examples] of Object.entries(INTENT_EXAMPLES)) {
    if (intent === IntentType.UNKNOWN) continue;

    for (const example of examples) {
      const score = smartSimilarity(query, example);

      if (score > bestScore) {
        bestScore = score;
        bestIntent = intent as IntentType;
      }
    }
  }

  // 设置阈值，太低则返回UNKNOWN
  const threshold = 0.3;

  console.log(`[Vector Classifier] Query: "${query}", Best: ${bestIntent}, Score: ${bestScore.toFixed(3)}`);

  return bestScore >= threshold ? bestIntent : IntentType.UNKNOWN;
}
