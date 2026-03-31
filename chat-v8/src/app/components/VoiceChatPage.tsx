import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Mic, Sparkles, Zap, Lightbulb, Shield, ChevronLeft, Car, MapPin, Key } from "lucide-react";

// 对话消息类型
interface Message {
  id: number;
  type: "user" | "assistant";
  content: string;
  time?: string;
  action?: string;
}

// 快捷操作卡片
interface QuickAction {
  id: string;
  icon: "car" | "location" | "charging" | "sentry";
  title: string;
  description: string;
}

const quickActions: QuickAction[] = [
  { id: "prepareCar", icon: "car", title: "一键备车", description: "提前准备车辆" },
  { id: "location", icon: "location", title: "车辆位置", description: "查看车辆位置" },
  { id: "charging", icon: "charging", title: "充电设置", description: "可预约充电时间" },
  { id: "sentry", icon: "sentry", title: "哨兵模式", description: "开启安全监控" },
];

// ========== 智能对话生成系统 ==========

// 用户可能的询问（随机组合）
const userQueries = {
  // 1. 基础车况
  basicStatus: [
    "续航还有多少？",
    "电量还有多少？",
    "车有没有锁好？",
    "胎压正常吗？",
    "车辆状态怎么样？",
    "还能跑多少公里？",
    "电量百分比多少？",
    "车锁好了吗？",
    "现在车速多少？",
    "车门关好了吗？",
    "玻璃水够不够？",
    "保养还有多久？",
  ],
  // 2. 基础车控
  basicControl: [
    "打开充电口盖",
    "帮我解锁车辆",
    "锁上车门",
    "打开后备箱",
    "打开前备箱",
    "闪一下车灯",
    "鸣笛一下",
    "打开车窗",
    "关闭车窗",
    "打开空调",
    "关闭空调",
    "打开雨刷",
    "关闭后备箱",
  ],
  // 3. 舒适控制
  comfort: [
    "把空调调到26度",
    "我有点冷",
    "太热了",
    "帮我打开座椅通风",
    "打开主驾座椅加热",
    "明天早上8点帮我备车",
    "预设一下空调",
    "把氛围灯调成蓝色",
    "打开方向盘加热",
    "把座椅调到最舒适的位置",
    "打开内循环",
    "打开外循环",
  ],
  // 4. 导航位置
  navigation: [
    "帮我导航回家",
    "附近有充电桩吗？",
    "查下附近哪里有充电站",
    "帮我找最近的加油站",
    "导航到公司",
    "附近有没有特斯拉超充？",
    "帮我规划一条不堵车的路线",
    "显示实时路况",
  ],
  // 5. 哨兵模式
  sentry: [
    "开启哨兵模式",
    "关闭哨兵模式",
    "有没有异常事件？",
    "帮我看下哨兵记录",
    "锁车后有没有剐蹭？",
    "有人靠近车辆了吗？",
  ],
  // 6. 充电相关
  charging: [
    "帮我设置预约充电",
    "今天冲了多少电？",
    "充电到90%",
    "停止充电",
    "开始充电",
    "最近充电花了多少钱？",
    "设置最省钱的充电时间",
    "电量到多少开始充",
    "充到80%就行",
    "改成晚上10点充电",
  ],
  // 7. 车辆设置
  settings: [
    "切换到运动模式",
    "切换到舒适模式",
    "打开自定义模式",
    "调节动能回收",
    "关闭动能回收",
    "打开车道保持",
    "关闭车道偏离",
    "打开自动驻车",
  ],
  // 8. 娱乐系统
  entertainment: [
    "打开音乐",
    "播放周杰伦的歌",
    "下一首",
    "上一首",
    "暂停播放",
    "打开收音机",
    "连接蓝牙",
    "打开座椅按摩",
  ],
};

// ========== 联网搜索功能 ==========

// 模拟异步获取天气信息
async function fetchWeatherInfo(city: string): Promise<{ content: string; action: string }> {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 500));

  // 模拟天气数据（可替换为真实 API）
  const weathers = [
    { condition: "晴", temp: Math.floor(Math.random() * 15) + 10, humidity: Math.floor(Math.random() * 40) + 30, wind: Math.floor(Math.random() * 10) + 5 },
    { condition: "多云", temp: Math.floor(Math.random() * 10) + 8, humidity: Math.floor(Math.random() * 30) + 40, wind: Math.floor(Math.random() * 15) + 3 },
    { condition: "阴", temp: Math.floor(Math.random() * 8) + 5, humidity: Math.floor(Math.random() * 20) + 50, wind: Math.floor(Math.random() * 12) + 5 },
    { condition: "小雨", temp: Math.floor(Math.random() * 8) + 5, humidity: Math.floor(Math.random() * 20) + 60, wind: Math.floor(Math.random() * 10) + 8 },
  ];

  const w = weathers[Math.floor(Math.random() * weathers.length)];

  return {
    content: `为您查询到${city}今日天气：${w.condition}，温度 ${w.temp}°C，湿度 ${w.humidity}%，风力 ${w.wind} 级。`,
    action: `${w.condition} | ${w.temp}°C | 湿度 ${w.humidity}%`
  };
}

// 处理需要联网查询的问题
async function handleOnlineQuery(query: string): Promise<{ content: string; action: string } | null> {
  const q = query.toLowerCase();

  // 天气查询
  if (q.includes("天气")) {
    let city = "武汉";
    const cities = ["武汉", "北京", "上海", "广州", "深圳", "杭州", "成都", "重庆", "西安", "南京"];
    for (const c of cities) {
      if (q.includes(c)) {
        city = c;
        break;
      }
    }
    return await fetchWeatherInfo(city);
  }

  // 新闻查询
  if (q.includes("新闻") || q.includes("今天有什么新闻")) {
    return {
      content: "为您找到以下热门新闻：1.新能源汽车销量创新高；2.智能驾驶技术取得新突破；3.充电基础设施建设加速推进。建议通过车载新闻应用查看详细内容。",
      action: "新闻摘要"
    };
  }

  // 股票/财经查询 - 具体的股价查询走联网搜索
  if ((q.includes("股票") || q.includes("股市") || q.includes("股价")) && !q.includes("空调")) {
    // 具体的股价查询返回 null，走联网搜索
    return null;
  }

  // 附近设施查询
  if (q.includes("附近") && (q.includes("停车场") || q.includes("停车"))) {
    const distances = [0.3, 0.5, 0.8, 1.2].sort(() => Math.random() - 0.5);
    return {
      content: `为您找到附近 ${distances.length} 个停车场：阳光停车场（${distances[0]}km）、世纪金源停车场（${distances[1]}km）、万达广场停车场（${distances[2]}km）。`,
      action: "停车场"
    };
  }

  // 附近美食
  if (q.includes("附近") && (q.includes("吃饭") || q.includes("美食") || q.includes("餐厅"))) {
    return {
      content: "为您找到附近美食：海底捞火锅（500m）、西贝莜面村（800m）、绿茶餐厅（1.2km）、太二酸菜鱼（1.5km）。",
      action: "美食推荐"
    };
  }

  // 电影/娱乐
  if (q.includes("电影") || q.includes("最近上映")) {
    return {
      content: "近期热门电影：1.《流浪地球2》科幻巨制；2.《满江红》悬疑喜剧；3.《深海》动画电影。您可以通过车载娱乐系统观看。",
      action: "电影推荐"
    };
  }

  return null;
}

// 记录搜索日志
async function logSearch(query: string) {
  try {
    await fetch('/api/logger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'search', query })
    });
  } catch (e) {}
}

// 使用 MCP MiniMax 搜索 API（直接调用）
async function webSearch(query: string, onProgress?: (status: string) => void): Promise<{ content: string; action: string }> {
  try {
    // 记录开始搜索
    await logSearch(`开始联网搜索: ${query}`);
    onProgress?.("正在联网搜索...");

    // 直接调用 MCP 搜索 API
    onProgress?.("正在搜索，请稍候...");

    const response = await fetch('/api/mcp-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    const resultData = await response.json();

    if (resultData.status === 'done' && resultData.results && resultData.results.length > 0) {
      onProgress?.("搜索完成，正在生成回复...");
      const topResults = resultData.results.slice(0, 3);
      const resultText = topResults.map((item: any, i: number) =>
        `${i + 1}. ${item.title || '无标题'}: ${item.body?.substring(0, 60) || '无摘要'}...`
      ).join('\n');

      return {
        content: `为您搜索到以下信息：\n${resultText}\n\n您可以通过以上信息了解更多详情。`,
        action: "联网搜索结果"
      };
    }

    // 没有结果
    onProgress?.("未找到相关结果");
    return {
      content: "抱歉，未找到相关信息。",
      action: "无搜索结果"
    };
  } catch (error) {
    console.error("Web search error:", error);
    onProgress?.("搜索失败");
    return {
      content: "抱歉，暂时无法获取联网信息。建议您通过搜索引擎查找相关内容。",
      action: "搜索不可用"
    };
  }
}

// 随机获取数组中的一个元素
function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 随机获取多个不重复的元素
function randomItems<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, arr.length));
}

// 生成随机回复
async function generateResponse(userQuery: string, onProgress?: (status: string) => void): Promise<{ content: string; action: string }> {
  const query = userQuery.toLowerCase();

  // 基础车况回复
  if (query.includes("续航") || query.includes("公里") || query.includes("还能跑")) {
    const km = Math.floor(Math.random() * 200) + 200;
    const percent = Math.floor(Math.random() * 50) + 40;
    return { content: `当前续航约 ${km} 公里，电量剩余 ${percent}%`, action: `续航 ${km}km | 电量 ${percent}%` };
  }
  if (query.includes("电") || query.includes("电量") || query.includes("percent")) {
    const percent = Math.floor(Math.random() * 60) + 30;
    return { content: `电量剩余 ${percent}%`, action: `电量 ${percent}%` };
  }
  if (query.includes("锁") || query.includes("锁好")) {
    const locked = Math.random() > 0.3;
    return locked
      ? { content: "车辆已锁好，门窗均已关闭", action: "车辆已锁定" }
      : { content: "车辆未锁定，是否需要帮您锁车？", action: "未锁定" };
  }
  if (query.includes("胎压")) {
    const front = (2.2 + Math.random() * 0.3).toFixed(1);
    const rear = (2.2 + Math.random() * 0.3).toFixed(1);
    return { content: `胎压正常，前轮 ${front}bar，后轮 ${rear}bar`, action: `胎压 ${front}/${rear}bar` };
  }

  // 基础车控回复
  if (query.includes("充电口")) {
    return { content: "好的，已为您打开充电口盖", action: "充电口盖 已开启" };
  }
  if (query.includes("后备箱")) {
    return { content: "好的，已为您打开后备箱", action: "后备箱 已开启" };
  }
  if (query.includes("前备箱")) {
    return { content: "好的，已为您打开前备箱", action: "前备箱 已开启" };
  }
  if (query.includes("解锁") || query.includes("开锁")) {
    return { content: "好的，车辆已解锁", action: "车辆已解锁" };
  }
  if (query.includes("锁门") || query.includes("锁车")) {
    return { content: "好的，车辆已锁好", action: "车辆已锁定" };
  }
  if (query.includes("鸣笛")) {
    return { content: "好的，已为您鸣笛", action: "鸣笛 1次" };
  }
  if (query.includes("闪灯") || query.includes("车灯")) {
    return { content: "好的，已为您闪灯", action: "车灯 闪烁" };
  }

  // 舒适控制回复（排除股票查询）
  if ((query.includes("空调") || query.includes("温度") || query.includes("冷") || query.includes("热")) && !query.includes("股票") && !query.includes("股价")) {
    const temp = Math.floor(Math.random() * 6) + 20;
    return { content: `好的，空调温度已调至 ${temp} 度`, action: `空调 ${temp}°` };
  }
  if (query.includes("座椅加热") || query.includes("加热")) {
    const level = Math.floor(Math.random() * 3) + 1;
    return { content: `好的，已为您打开座椅加热${level}档`, action: `座椅加热 ${level}档` };
  }
  if (query.includes("座椅通风") || query.includes("通风")) {
    return { content: "好的，已为您打开座椅通风", action: "座椅通风 中速" };
  }
  if (query.includes("备车") || query.includes("明天") || query.includes("早上") || query.includes("出门")) {
    const hour = Math.floor(Math.random() * 4) + 7;
    return { content: `已为您设置明早 ${hour} 点一键备车`, action: `一键备车 | 明天 ${hour}:00` };
  }
  if (query.includes("氛围灯") || query.includes("颜色")) {
    const colors = ["蓝色", "红色", "绿色", "紫色", "橙色"];
    const color = randomItem(colors);
    return { content: `好的，已将氛围灯调成${color}`, action: `氛围灯 ${color}` };
  }
  if (query.includes("方向盘")) {
    return { content: "好的，已为您打开方向盘加热", action: "方向盘加热 已开启" };
  }

  // 导航位置回复
  if (query.includes("充电") || query.includes("充电桩") || query.includes("充电站")) {
    const brands = ["特来电", "星星充电", "国家电网", "小桔充电", "蔚来超充"];
    const selected = randomItems(brands, 3);
    const distances = selected.map(() => (Math.random() * 3 + 0.3).toFixed(1));
    return {
      content: `为您找到附近 ${selected.length} 个充电站：${selected[0]}（${distances[0]}km）、${selected[1]}（${distances[1]}km）、${selected[2]}（${distances[2]}km）`,
      action: selected.join(" | "),
    };
  }
  // 导航位置回复（排除股票查询）
  if ((query.includes("导航") || query.includes("回家")) && !query.includes("股票") && !query.includes("股价")) {
    const dest = query.includes("家") ? "家" : "目的地";
    return { content: `好的，正在为您导航到${dest}，预计25分钟到达`, action: `导航至${dest}` };
  }

  // 哨兵模式回复
  if (query.includes("开启") || query.includes("打开哨兵")) {
    return { content: "好的，已为您开启哨兵模式", action: "哨兵模式 已开启" };
  }
  if (query.includes("关闭") || query.includes("关哨兵")) {
    return { content: "好的，已为您关闭哨兵模式", action: "哨兵模式 已关闭" };
  }
  if (query.includes("异常") || query.includes("事件") || query.includes("剐蹭") || query.includes("告警")) {
    const events = Math.floor(Math.random() * 5);
    const scratches = Math.floor(Math.random() * 3);
    const nears = Math.floor(Math.random() * 5);
    if (events === 0) {
      return { content: "过去24小时没有异常事件，车辆安全", action: "无异常" };
    }
    return {
      content: `过去24小时共记录 ${events} 次事件：${nears} 次有人靠近、${scratches} 次剐蹭告警，已为您保存相关视频`,
      action: `事件: ${events}次 | 剐蹭: ${scratches}次`,
    };
  }

  // 充电相关回复
  if (query.includes("预约充电") || query.includes("设置充电")) {
    const hour = Math.floor(Math.random() * 8) + 22;
    return { content: `已为您设置预约充电，预计${hour}点开始充电至90%`, action: `预约充电 ${hour}:00` };
  }
  if (query.includes("充电") || query.includes("冲了")) {
    const times = Math.floor(Math.random() * 5) + 1;
    const kwh = Math.floor(Math.random() * 200) + 100;
    return { content: `最近7天您共充电 ${times} 次，累计充电 ${kwh} 度`, action: `充电 ${times}次 | ${kwh}度` };
  }
  if (query.includes("停止充电")) {
    return { content: "好的，已停止充电", action: "充电 已停止" };
  }
  if (query.includes("开始充电")) {
    return { content: "好的，已开始充电", action: "充电 进行中" };
  }

  // 车辆设置相关
  if (query.includes("运动模式") || query.includes("sport")) {
    return { content: "好的，已切换到运动模式", action: "驾驶模式: 运动" };
  }
  if (query.includes("舒适模式") || query.includes("舒适")) {
    return { content: "好的，已切换到舒适模式", action: "驾驶模式: 舒适" };
  }
  if (query.includes("节能模式") || query.includes("经济")) {
    return { content: "好的，已切换到节能模式", action: "驾驶模式: 节能" };
  }
  if (query.includes("动能回收")) {
    const level = Math.floor(Math.random() * 3) + 1;
    return { content: `好的，已将动能回收调至${level}档`, action: `动能回收 ${level}档` };
  }
  if (query.includes("车道保持") || query.includes("车道偏离")) {
    return { content: "好的，已为您开启车道保持功能", action: "车道保持 已开启" };
  }

  // 娱乐系统相关
  if (query.includes("音乐") || query.includes("播放")) {
    return { content: "好的，正在为您播放音乐", action: "音乐 播放中" };
  }
  if (query.includes("下一首") || query.includes("上一首")) {
    return { content: "好的，已切换歌曲", action: "切歌 成功" };
  }
  if (query.includes("暂停")) {
    return { content: "好的，已暂停播放", action: "音乐 已暂停" };
  }
  if (query.includes("蓝牙")) {
    return { content: "好的，已连接蓝牙", action: "蓝牙 已连接" };
  }
  if (query.includes("按摩")) {
    return { content: "好的，已为您打开座椅按摩", action: "座椅按摩 已开启" };
  }

  // 雨刷、车窗等
  if (query.includes("雨刷")) {
    return { content: "好的，已为您打开雨刷", action: "雨刷 已开启" };
  }
  if (query.includes("车速")) {
    const speed = Math.floor(Math.random() * 60);
    return { content: `当前车速 ${speed} km/h`, action: `车速 ${speed}km/h` };
  }
  if (query.includes("保养")) {
    const days = Math.floor(Math.random() * 90) + 30;
    return { content: `距离下次保养还有约 ${days} 天或 ${Math.floor(Math.random() * 3000) + 2000} 公里`, action: `保养剩余 ${days}天` };
  }
  if (query.includes("玻璃水")) {
    return { content: "玻璃水剩余约 60%", action: "玻璃水 60%" };
  }

  // 尝试联网查询（本地预设的查询）
  const onlineResult = await handleOnlineQuery(userQuery);
  if (onlineResult) {
    return onlineResult;
  }

  // 本地无法回答，尝试联网搜索
  return await webSearch(userQuery, onProgress);
}

// 生成随机时间
function generateRandomTime(): string {
  const hour = Math.floor(Math.random() * 24);
  const minute = Math.floor(Math.random() * 60);
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

// 同步版本的回复生成（用于初始对话历史）
function generateResponseSync(userQuery: string): { content: string; action: string } {
  const query = userQuery.toLowerCase();

  // 基础车况
  if (query.includes("续航") || query.includes("公里") || query.includes("还能跑")) {
    const km = Math.floor(Math.random() * 200) + 200;
    const percent = Math.floor(Math.random() * 50) + 40;
    return { content: `当前续航约 ${km} 公里，电量剩余 ${percent}%`, action: `续航 ${km}km | 电量 ${percent}%` };
  }
  if (query.includes("电") || query.includes("电量") || query.includes("percent")) {
    const percent = Math.floor(Math.random() * 60) + 30;
    return { content: `电量剩余 ${percent}%`, action: `电量 ${percent}%` };
  }
  if (query.includes("锁") || query.includes("锁好")) {
    return { content: "车辆已锁好，门窗均已关闭", action: "车辆已锁定" };
  }
  if (query.includes("胎压")) {
    const front = (2.2 + Math.random() * 0.3).toFixed(1);
    const rear = (2.2 + Math.random() * 0.3).toFixed(1);
    return { content: `胎压正常，前轮 ${front}bar，后轮 ${rear}bar`, action: `胎压 ${front}/${rear}bar` };
  }

  // 基础车控
  if (query.includes("充电口")) return { content: "好的，已为您打开充电口盖", action: "充电口盖 已开启" };
  if (query.includes("后备箱")) return { content: "好的，已为您打开后备箱", action: "后备箱 已开启" };
  if (query.includes("前备箱")) return { content: "好的，已为您打开前备箱", action: "前备箱 已开启" };
  if (query.includes("解锁")) return { content: "好的，车辆已解锁", action: "车辆已解锁" };
  if (query.includes("锁门")) return { content: "好的，车辆已锁好", action: "车辆已锁定" };
  if (query.includes("鸣笛")) return { content: "好的，已为您鸣笛", action: "鸣笛 1次" };
  if (query.includes("闪灯") || query.includes("车灯")) return { content: "好的，已为您闪灯", action: "车灯 闪烁" };

  // 舒适控制
  if (query.includes("空调") || query.includes("温度") || query.includes("度") || query.includes("冷") || query.includes("热")) {
    const temp = Math.floor(Math.random() * 6) + 20;
    return { content: `好的，空调温度已调至 ${temp} 度`, action: `空调 ${temp}°` };
  }
  if (query.includes("座椅加热") || query.includes("加热")) {
    const level = Math.floor(Math.random() * 3) + 1;
    return { content: `好的，已为您打开座椅加热${level}档`, action: `座椅加热 ${level}档` };
  }
  if (query.includes("座椅通风") || query.includes("通风")) return { content: "好的，已为您打开座椅通风", action: "座椅通风 中速" };
  if (query.includes("备车") || query.includes("明天") || query.includes("早上") || query.includes("出门")) {
    const hour = Math.floor(Math.random() * 4) + 7;
    return { content: `已为您设置明早 ${hour} 点一键备车`, action: `一键备车 | 明天 ${hour}:00` };
  }
  if (query.includes("氛围灯") || query.includes("颜色")) {
    const colors = ["蓝色", "红色", "绿色", "紫色", "橙色"];
    return { content: `好的，已将氛围灯调成${randomItem(colors)}`, action: `氛围灯 ${randomItem(colors)}` };
  }
  if (query.includes("方向盘")) return { content: "好的，已为您打开方向盘加热", action: "方向盘加热 已开启" };

  // 导航位置
  if (query.includes("充电") || query.includes("充电桩") || query.includes("充电站")) {
    const brands = ["特来电", "星星充电", "国家电网", "小桔充电", "蔚来超充"];
    const selected = randomItems(brands, 3);
    return { content: `为您找到附近 ${selected.length} 个充电站：${selected.join("、")}`, action: selected.join(" | ") };
  }
  // 导航位置（排除股票查询）
  if ((query.includes("导航") || query.includes("回家")) && !query.includes("股票") && !query.includes("股价")) {
    return { content: "好的，正在为您导航，预计25分钟到达", action: "导航进行中" };
  }

  // 哨兵模式
  if (query.includes("开启") || query.includes("打开哨兵")) return { content: "好的，已为您开启哨兵模式", action: "哨兵模式 已开启" };
  if (query.includes("关闭") || query.includes("关哨兵")) return { content: "好的，已为您关闭哨兵模式", action: "哨兵模式 已关闭" };
  if (query.includes("异常") || query.includes("事件") || query.includes("剐蹭") || query.includes("告警")) {
    return { content: "过去24小时没有异常事件，车辆安全", action: "无异常" };
  }

  // 充电相关
  if (query.includes("预约充电") || query.includes("设置充电")) {
    const hour = Math.floor(Math.random() * 8) + 22;
    return { content: `已为您设置预约充电，预计${hour}点开始充电至90%`, action: `预约充电 ${hour}:00` };
  }
  if (query.includes("充电") || query.includes("冲了")) {
    const times = Math.floor(Math.random() * 5) + 1;
    return { content: `最近7天您共充电 ${times} 次`, action: `充电 ${times}次` };
  }
  if (query.includes("停止充电")) return { content: "好的，已停止充电", action: "充电 已停止" };
  if (query.includes("开始充电")) return { content: "好的，已开始充电", action: "充电 进行中" };

  // 车辆设置
  if (query.includes("运动模式")) return { content: "好的，已切换到运动模式", action: "驾驶模式: 运动" };
  if (query.includes("舒适模式") || query.includes("舒适")) return { content: "好的，已切换到舒适模式", action: "驾驶模式: 舒适" };
  if (query.includes("动能回收")) return { content: "好的，已将动能回收调至2档", action: "动能回收 2档" };
  if (query.includes("车道保持")) return { content: "好的，已为您开启车道保持功能", action: "车道保持 已开启" };

  // 娱乐系统
  if (query.includes("音乐") || query.includes("播放")) return { content: "好的，正在为您播放音乐", action: "音乐 播放中" };
  if (query.includes("下一首") || query.includes("上一首")) return { content: "好的，已切换歌曲", action: "切歌 成功" };
  if (query.includes("暂停")) return { content: "好的，已暂停播放", action: "音乐 已暂停" };
  if (query.includes("蓝牙")) return { content: "好的，已连接蓝牙", action: "蓝牙 已连接" };
  if (query.includes("按摩")) return { content: "好的，已为您打开座椅按摩", action: "座椅按摩 已开启" };

  // 其他
  if (query.includes("雨刷")) return { content: "好的，已为您打开雨刷", action: "雨刷 已开启" };
  if (query.includes("车速")) return { content: `当前车速 45 km/h`, action: "车速 45km/h" };
  if (query.includes("保养")) return { content: "距离下次保养还有约 60 天", action: "保养剩余 60天" };
  if (query.includes("玻璃水")) return { content: "玻璃水剩余约 60%", action: "玻璃水 60%" };

  return { content: "好的，已为您处理", action: "操作成功" };
}

// 智能生成对话历史 - 用户说一句，助手回复一句
function generateSmartDialogues(): Message[] {
  // 随机选择3-5个不同的场景
  const allCategories = Object.keys(userQueries) as (keyof typeof userQueries)[];
  const numScenarios = Math.floor(Math.random() * 3) + 3;

  // 随机选择场景类别
  const selectedCategories = randomItems(allCategories, numScenarios);

  const dialogues: { user: Message; assistant: Message }[] = [];
  let id = 1;

  selectedCategories.forEach((category) => {
    // 每个类别随机选择一个用户问题
    const userQuery = randomItem(userQueries[category]);
    const { content, action } = generateResponseSync(userQuery);

    // 生成这个对话的时间
    const time = generateRandomTime();

    // 添加用户消息
    const userMessage: Message = {
      id: id++,
      type: "user",
      content: userQuery,
      time,
    };

    // 添加助手回复（时间稍后1-2分钟）
    const [hour, minute] = time.split(":").map(Number);
    const assistantMinute = (minute + Math.floor(Math.random() * 2) + 1) % 60;
    const assistantHour = assistantMinute < minute ? (hour + 1) % 24 : hour;
    const assistantTime = `${assistantHour.toString().padStart(2, "0")}:${assistantMinute.toString().padStart(2, "0")}`;

    const assistantMessage: Message = {
      id: id++,
      type: "assistant",
      content,
      action,
      time: assistantTime,
    };

    dialogues.push({ user: userMessage, assistant: assistantMessage });
  });

  // 按时间排序整个对话
  dialogues.sort((a, b) => {
    const timeA = a.user.time || "00:00";
    const timeB = b.user.time || "00:00";
    return timeA.localeCompare(timeB);
  });

  // 扁平化并重新编号
  const messages: Message[] = [];
  dialogues.forEach((d, idx) => {
    messages.push({ ...d.user, id: idx * 2 + 1 });
    messages.push({ ...d.assistant, id: idx * 2 + 2 });
  });

  return messages;
}

// 初始对话数据
const initialMessages = generateSmartDialogues();

interface VoiceChatPageProps {
  onClose: () => void;
}

export function VoiceChatPage({ onClose }: VoiceChatPageProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [processingStatus, setProcessingStatus] = useState(""); // 处理状态：推理中、搜索中、准备回复等
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // 记录日志
  const logToServer = async (type: string, data: any) => {
    try {
      await fetch('/api/logger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, ...data })
      });
    } catch (e) {
      console.error('Logger error:', e);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    const userContent = inputText.trim();
    setInputText(""); // 清空输入框

    // 记录用户输入
    await logToServer('step', { step: `用户输入: ${userContent}` });

    // 1. 先显示用户消息
    const newUserMessage: Message = {
      id: messages.length + 1,
      type: "user",
      content: userContent,
      time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
    };

    // 添加用户消息
    setMessages(prev => [...prev, newUserMessage]);

    // 2. 显示 loading 状态
    setIsLoading(true);
    setProcessingStatus("正在理解您的问题...");

    // 记录开始处理
    await logToServer('step', { step: '开始处理请求...' });

    // 3. 获取回复
    setProcessingStatus("正在思考回复方案...");
    const { content, action } = await generateResponse(userContent, setProcessingStatus);

    // 记录完成
    await logToServer('step', { step: `处理完成，回复: ${content.substring(0, 30)}...` });

    // 4. 添加助手回复
    const newAssistantMessage: Message = {
      id: messages.length + 2,
      type: "assistant",
      content,
      action,
    };

    setMessages(prev => [...prev, newAssistantMessage]);
    setIsLoading(false);
    setProcessingStatus("");

    // 5. 保存对话历史
    await logToServer('conversation', {
      userQuery: userContent,
      assistantResponse: content,
      action
    });
  };

  const handleQuickAction = async (action: QuickAction) => {
    if (isLoading) return;

    const userContent = `帮我${action.title}`;

    // 1. 先显示用户消息
    const userMessage: Message = {
      id: messages.length + 1,
      type: "user",
      content: userContent,
      time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // 2. 获取回复
    const { content, action: actionText } = await generateResponse(userContent);

    // 3. 添加助手回复
    const assistantMessage: Message = {
      id: messages.length + 2,
      type: "assistant",
      content,
      action: actionText,
    };

    setMessages(prev => [...prev, assistantMessage]);
    setIsLoading(false);
  };

  const handleClear = () => {
    setMessages([]);
  };

  const getIcon = (iconName: QuickAction["icon"]) => {
    switch (iconName) {
      case "car":
        return <Key size={20} />;
      case "location":
        return <MapPin size={20} />;
      case "charging":
        return <Zap size={20} />;
      case "sentry":
        return <Shield size={20} />;
    }
  };

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col"
      style={{
        background: "#0a0c0f",
        width: 393,
        height: 852,
      }}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

      {/* 顶部导航栏 */}
      <div
        className="flex items-center justify-between px-4 pt-12 pb-3"
        style={{
          background: "rgba(10,12,15,0.95)",
          borderBottom: "0.5px solid rgba(255,255,255,0.07)",
        }}
      >
        {/* 返回按钮 */}
        <button
          onClick={onClose}
          className="flex items-center gap-2 cursor-pointer"
        >
          <ChevronLeft size={24} color="rgba(255,255,255,0.85)" />
          <span style={{ fontSize: 16, color: "rgba(255,255,255,0.85)", fontFamily: "sans-serif" }}>
            返回
          </span>
        </button>

        {/* 标题 */}
        <span style={{ fontSize: 17, color: "rgba(255,255,255,0.9)", fontFamily: "sans-serif", fontWeight: 500 }}>
          语音对话
        </span>

        {/* 清空按钮 */}
        <button onClick={handleClear}>
          <span style={{ fontSize: 14, color: "rgba(51,136,255,0.9)", fontFamily: "sans-serif" }}>
            清空
          </span>
        </button>
      </div>

      {/* 对话区域 */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4"
        style={{ scrollbarWidth: "none" }}
      >
        {/* 时间标签 */}
        <div className="text-center mb-4">
          <span
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.35)",
              fontFamily: "sans-serif",
              background: "rgba(255,255,255,0.06)",
              padding: "4px 12px",
              borderRadius: 12,
            }}
          >
            今天 {new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>

        {/* 消息列表 */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className="mb-4"
            style={{
              animation: "fadeIn 0.3s ease",
            }}
          >
            {msg.type === "user" ? (
              /* 用户消息 */
              <div className="flex justify-end">
                <div
                  style={{
                    background: "rgba(51,136,255,0.15)",
                    border: "0.5px solid rgba(51,136,255,0.25)",
                    borderRadius: "16px 16px 4px 16px",
                    padding: "12px 16px",
                    maxWidth: 260,
                  }}
                >
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.9)", lineHeight: 1.5, fontFamily: "sans-serif" }}>
                    {msg.content}
                  </p>
                </div>
              </div>
            ) : (
              /* 助手消息 */
              <div className="flex justify-start">
                <div
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "0.5px solid rgba(255,255,255,0.1)",
                    borderRadius: "16px 16px 16px 4px",
                    padding: "12px 16px",
                    maxWidth: 260,
                  }}
                >
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.9)", lineHeight: 1.5, fontFamily: "sans-serif" }}>
                    {msg.content}
                  </p>
                  {msg.action && (
                    <p
                      style={{
                        fontSize: 11,
                        color: "rgba(255,255,255,0.4)",
                        marginTop: 8,
                        fontFamily: "sans-serif",
                      }}
                    >
                      {msg.action}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        {/* Loading 思考中 */}
        {isLoading && (
          <div className="mb-4 flex justify-start">
            <div
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "0.5px solid rgba(255,255,255,0.1)",
                borderRadius: "16px 16px 16px 4px",
                padding: "12px 16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "rgba(51,136,255,0.8)",
                  animation: "pulse 1s infinite"
                }} />
                <span style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", fontFamily: "sans-serif" }}>
                  {processingStatus || "思考中..."}
                </span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 快捷操作卡片 */}
      <div
        style={{
          background: "rgba(255,255,255,0.04)",
          borderTop: "0.5px solid rgba(255,255,255,0.08)",
          padding: "16px 16px 12px",
        }}
      >
        <p
          style={{
            fontSize: 12,
            color: "rgba(255,255,255,0.45)",
            marginBottom: 12,
            fontFamily: "sans-serif",
            textAlign: "center",
          }}
        >
          为你推荐以下控车功能
        </p>

        <div className="grid grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleQuickAction(action)}
              className="flex flex-col items-center gap-1 cursor-pointer"
              style={{
                padding: "10px 4px",
                background: "rgba(255,255,255,0.05)",
                borderRadius: 12,
                border: "0.5px solid rgba(255,255,255,0.08)",
              }}
            >
              <div
                style={{
                  color: "rgba(51,136,255,0.9)",
                  marginBottom: 4,
                }}
              >
                {getIcon(action.icon)}
              </div>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", fontFamily: "sans-serif" }}>
                {action.title}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 底部输入框 */}
      <div
        className="flex items-center gap-3 px-4 pb-6 pt-3"
        style={{
          background: "rgba(10,12,15,0.98)",
          borderTop: "0.5px solid rgba(255,255,255,0.07)",
        }}
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSend()}
          disabled={isLoading}
          placeholder={isLoading ? "等待回复中..." : "请问有什么可以帮您..."}
          style={{
            flex: 1,
            height: 44,
            padding: "0 16px",
            borderRadius: 22,
            border: "0.5px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.9)",
            fontSize: 14,
            fontFamily: "sans-serif",
            outline: "none",
            opacity: isLoading ? 0.6 : 1,
          }}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !inputText.trim()}
          className="flex items-center justify-center cursor-pointer"
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            background: isLoading ? "rgba(255,255,255,0.1)" : inputText.trim() ? "rgba(51,136,255,0.9)" : "rgba(255,255,255,0.1)",
            border: "none",
            opacity: isLoading ? 0.6 : 1,
          }}
        >
          {isLoading ? (
            <span style={{ fontSize: 16, color: "rgba(255,255,255,0.5)" }}>...</span>
          ) : (
            <Mic size={20} color={inputText.trim() ? "white" : "rgba(255,255,255,0.35)"} />
          )}
        </button>
      </div>
    </div>
  );
}
