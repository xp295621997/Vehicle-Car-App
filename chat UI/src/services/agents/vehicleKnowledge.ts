// 车辆配置 RAG 知识库

// 知识库文档
const KNOWLEDGE_BASE = [
  {
    id: 1,
    category: '基本信息',
    question: '车型定位',
    answer: '小米 SU7 Ultra 定位为纯电动高性能四门轿跑，官方售价 529,900 元，于 2025 年上市。车身结构为 4 门 5 座三厢车，采用三电机四驱。'
  },
  {
    id: 2,
    category: '动力性能',
    question: '动力参数',
    answer: '系统总功率 1138 kW（1548 马力），峰值扭矩 1770 N·m。0-100km/h 加速仅需 1.98 秒，0-200km/h 加速 5.86 秒，0-400m 加速 9.23 秒，最高车速可达 350 km/h。'
  },
  {
    id: 3,
    category: '动力性能',
    question: '电池续航',
    answer: '搭载 93.7 kWh 麒麟Ⅱ赛道专用高功率电池，CLTC 续航 630 km。支持 480kW 超快充，10%-80% 仅需 11 分钟。'
  },
  {
    id: 4,
    category: '车身尺寸',
    question: '尺寸空间',
    answer: '长×宽×高：5070×1970×1465 mm，轴距 3000 mm。前备厢容积 105 L，后备厢容积 454 L。'
  },
  {
    id: 5,
    category: '外观颜色',
    question: '标配颜色',
    answer: '标配颜色：闪电黄、珍珠白。选配颜色：曜石黑、太空银、鹦鹉绿。'
  },
  {
    id: 6,
    category: '外观颜色',
    question: '配色方案',
    answer: '可选配色方案：明黄撞黑（标配）、黑黄双色、黑红双色。'
  },
  {
    id: 7,
    category: '核心亮点',
    question: '核心卖点',
    answer: '核心亮点：三电机四驱 1.98 秒破百、800V 高压平台 + 480kW 超充、空气悬架 + 碳陶刹车、主动空气动力学套件、高强度车身 + 赛道级安全配置、小米澎湃 OS + 高阶智能驾驶。'
  },
  {
    id: 8,
    category: '基本信息',
    question: '售价',
    answer: '小米 SU7 Ultra 官方售价为 529,900 元。'
  },
  {
    id: 9,
    category: '动力性能',
    question: '充电速度',
    answer: '支持 480kW 超快充，从 10% 充到 80% 仅需 11 分钟。'
  },
  {
    id: 10,
    category: '动力性能',
    question: '加速性能',
    answer: '加速性能强劲：0-100km/h 1.98 秒，0-200km/h 5.86 秒，0-400m 9.23 秒。'
  },
];

// 关键词映射
const KEYWORD_CHUNKS: Record<string, string[]> = {
  '价格': ['售价', '价格', '多少钱', '优惠'],
  '续航': ['续航', '电量', '电池', '充一次电'],
  '加速': ['加速', '百公里', '破百', '0-100', '马力', '功率', '扭矩'],
  '充电': ['充电', '快充', '超充', '充电时间'],
  '颜色': ['颜色', '配色', '外观', '车身颜色'],
  '尺寸': ['尺寸', '空间', '后备箱', '前备箱', '轴距', '长宽高'],
  '配置': ['配置', '亮点', '卖点', '有什么'],
};

/**
 * 简单RAG检索 - 基于关键词匹配
 */
export function retrieveVehicleKnowledge(query: string): {
  answer: string;
  category: string;
  relevance: number;
} | null {
  const lowerQuery = query.toLowerCase();

  // 1. 精确匹配
  for (const doc of KNOWLEDGE_BASE) {
    if (lowerQuery.includes(doc.question.toLowerCase()) ||
        doc.question.toLowerCase().includes(lowerQuery)) {
      return {
        answer: doc.answer,
        category: doc.category,
        relevance: 1.0,
      };
    }
  }

  // 2. 关键词匹配
  let bestMatch: typeof KNOWLEDGE_BASE[0] | null = null;
  let bestScore = 0;

  for (const doc of KNOWLEDGE_BASE) {
    let score = 0;

    // 检查是否包含类别关键词
    for (const [category, keywords] of Object.entries(KEYWORD_CHUNKS)) {
      for (const keyword of keywords) {
        if (lowerQuery.includes(keyword)) {
          // 匹配到关键词
          if (doc.category.includes(category) || doc.question.includes(keyword)) {
            score += 0.5;
          }
          // 检查答案中是否也包含关键词
          if (doc.answer.toLowerCase().includes(keyword)) {
            score += 0.3;
          }
        }
      }
    }

    // 常见问法匹配
    const commonPatterns = [
      ['续航', '多少', '跑'],  // 续航多少
      ['加速', '多少', '秒'],  // 加速多少秒
      ['充电', '多久', '时间'], // 充电多久
      ['尺寸', '多大'],        // 尺寸多大
      ['价格', '售价', '钱'],  // 多少钱
      ['颜色', '有哪些'],      // 颜色有哪些
    ];

    for (const pattern of commonPatterns) {
      const matchCount = pattern.filter(p => lowerQuery.includes(p)).length;
      if (matchCount > 0 && doc.answer.toLowerCase().includes(pattern[0])) {
        score += matchCount * 0.2;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = doc;
    }
  }

  if (bestMatch && bestScore > 0.3) {
    return {
      answer: bestMatch.answer,
      category: bestMatch.category,
      relevance: Math.min(bestScore / 2, 1.0),
    };
  }

  return null;
}

/**
 * 检查是否是车辆配置相关问题
 */
export function isVehicleConfigQuery(query: string): boolean {
  const lowerQuery = query.toLowerCase();

  const configKeywords = [
    '车型', '配置', '价格', '售价', '续航', '电池', '加速', '充电',
    '颜色', '尺寸', '空间', '马力', '功率', '扭矩', '电机',
    '小米su7', 'su7 ultra', '小米汽车', '车怎么样', '这车',
  ];

  return configKeywords.some(kw => lowerQuery.includes(kw));
}

/**
 * 获取完整知识库（用于调试）
 */
export function getKnowledgeBase() {
  return KNOWLEDGE_BASE;
}
