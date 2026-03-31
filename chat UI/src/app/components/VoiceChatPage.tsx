import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Mic, Sparkles, Zap, Lightbulb, Shield, ChevronLeft, Car, MapPin, Key, Send, Plus, Camera, Image, FileText, Wand2, Loader2 } from "lucide-react";
import { carActions } from "../../services/carApi";
import { dispatch } from "../../services/agents";

// 对话消息类型
interface Message {
  id: number;
  type: "user" | "assistant";
  content: string;
  time?: string;
  action?: string;
  attachments?: {type: string, data: string, name: string}[];
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

// 生成回复 - 使用 Agent 框架
async function generateResponse(
  userQuery: string,
  onProgress?: (status: string) => void,
  attachments: { type: string; data: string; name: string }[] = [],
  history: {role: 'user' | 'assistant'; content: string; data?: any}[] = [],
  previousData?: any
): Promise<{ content: string; action: string; data?: any }> {
  try {
    console.log('[Agent] 处理请求:', userQuery);
    console.log('[Agent] attachments:', attachments);
    console.log('[Agent] history length:', history.length);
    console.log('[Agent] previousData:', previousData);

    const response = await dispatch({
      query: userQuery,
      context: {
        attachments: attachments,
        conversationHistory: history, // 传递对话历史
        previousData: previousData,   // 传递之前的数据（如地址列表）
      },
      onProgress: (status) => {
        console.log('[Agent] 进度:', status);
        onProgress?.(status);
      },
    });

    console.log('[Agent] 响应:', response);

    return {
      content: response.content,
      action: response.action,
      data: response.data,
    };
  } catch (error: any) {
    console.error('[Agent] 处理失败:', error);
    return {
      content: `处理请求失败: ${error?.message || '未知错误'}`,
      action: '处理失败',
    };
  }
}

/**
 * @deprecated 保留旧函数用于兼容，优先使用 generateResponse
 * 生成随机回复 - 旧版本实现
 */
async function _generateResponseLegacy(userQuery: string, onProgress?: (status: string) => void): Promise<{ content: string; action: string }> {
  const query = userQuery.toLowerCase();

  // 如果有图片内容描述，优先回答图片相关问题
  if (userQuery.includes("[图片内容:")) {
    // 提取图片描述
    const imageMatch = userQuery.match(/\[图片内容:\s*([^\]]+)\]/);
    if (imageMatch) {
      const imageDescription = imageMatch[1];
      // 检查用户是否在问关于图片的问题
      if (query.includes("图片") || query.includes("什么意思") || query.includes("是什么") || query.includes("描述") || query.includes("看")) {
        return { content: `这是一张图片，内容是：${imageDescription}`, action: "图片理解" };
      }
    }
  }

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

  // 基础车控回复 - 调用真实 API
  // 前备箱 - 打开
  if ((query.includes("前备箱") || (query.includes("前") && query.includes("备箱"))) && !query.includes("关闭") && !query.includes("关")) {
    try {
      console.log('[DEBUG] 准备打开前备箱...');
      onProgress?.("正在打开前备箱...");
      const result = await carActions.openHood();
      console.log('[DEBUG] 前备箱 API 返回:', result);
      return { content: "好的，已为您打开前备箱", action: "前备箱 已开启" };
    } catch (error: any) {
      console.error('[Car API] 打开前备箱失败:', error);
      const errorMsg = error?.message || error?.toString() || '未知错误';
      return { content: `抱歉，打开前备箱失败了: ${errorMsg}`, action: "前备箱 开启失败" };
    }
  }
  // 前备箱 - 关闭
  if ((query.includes("前备箱") || (query.includes("前") && query.includes("备箱"))) && (query.includes("关闭") || query.includes("关"))) {
    try {
      console.log('[DEBUG] 准备关闭前备箱...');
      onProgress?.("正在关闭前备箱...");
      const result = await carActions.closeHood();
      console.log('[DEBUG] 前备箱 API 返回:', result);
      return { content: "好的，已为您关闭前备箱", action: "前备箱 已关闭" };
    } catch (error: any) {
      console.error('[Car API] 关闭前备箱失败:', error);
      const errorMsg = error?.message || error?.toString() || '未知错误';
      return { content: `抱歉，关闭前备箱失败了: ${errorMsg}`, action: "前备箱 关闭失败" };
    }
  }
  if (query.includes("后备箱") || query.includes("尾箱")) {
    try {
      console.log('[DEBUG] 准备打开后备箱...');
      onProgress?.("正在打开后备箱...");
      const result = await carActions.openTrunk();
      console.log('[DEBUG] 后备箱 API 返回:', result);
      return { content: "好的，已为您打开后备箱", action: "后备箱 已开启" };
    } catch (error: any) {
      console.error('[Car API] 打开后备箱失败:', error);
      const errorMsg = error?.message || error?.toString() || '未知错误';
      return { content: `抱歉，打开后备箱失败了: ${errorMsg}`, action: "后备箱 开启失败" };
    }
  }
  if (query.includes("充电口")) {
    try {
      console.log('[DEBUG] 准备打开充电口...');
      onProgress?.("正在打开充电口...");
      const result = await carActions.openChargePort();
      console.log('[DEBUG] 充电口 API 返回:', result);
      return { content: "好的，已为您打开充电口盖", action: "充电口盖 已开启" };
    } catch (error: any) {
      console.error('[Car API] 打开充电口失败:', error);
      const errorMsg = error?.message || error?.toString() || '未知错误';
      return { content: `抱歉，打开充电口失败了: ${errorMsg}`, action: "充电口 开启失败" };
    }
  }
  if (query.includes("解锁") || query.includes("开锁")) {
    try {
      console.log('[DEBUG] 准备解锁车辆...');
      onProgress?.("正在解锁车辆...");
      const result = await carActions.unlockCar();
      console.log('[DEBUG] 解锁 API 返回:', result);
      return { content: "好的，车辆已解锁", action: "车辆已解锁" };
    } catch (error: any) {
      console.error('[Car API] 解锁车辆失败:', error);
      const errorMsg = error?.message || error?.toString() || '未知错误';
      return { content: `抱歉，解锁车辆失败了: ${errorMsg}`, action: "解锁 失败" };
    }
  }
  if (query.includes("锁门") || query.includes("锁车")) {
    try {
      console.log('[DEBUG] 准备锁车...');
      onProgress?.("正在锁车...");
      const result = await carActions.lockCar();
      console.log('[DEBUG] 锁车 API 返回:', result);
      return { content: "好的，车辆已锁好", action: "车辆已锁定" };
    } catch (error: any) {
      console.error('[Car API] 锁车失败:', error);
      const errorMsg = error?.message || error?.toString() || '未知错误';
      return { content: `抱歉，锁车失败了: ${errorMsg}`, action: "锁车 失败" };
    }
  }
  if (query.includes("鸣笛")) {
    try {
      console.log('[DEBUG] 准备鸣笛...');
      onProgress?.("正在鸣笛...");
      const result = await carActions.honk();
      console.log('[DEBUG] 鸣笛 API 返回:', result);
      return { content: "好的，已为您鸣笛", action: "鸣笛 1次" };
    } catch (error: any) {
      console.error('[Car API] 鸣笛失败:', error);
      const errorMsg = error?.message || error?.toString() || '未知错误';
      return { content: `抱歉，鸣笛失败了: ${errorMsg}`, action: "鸣笛 失败" };
    }
  }
  if (query.includes("闪灯") || query.includes("车灯")) {
    try {
      console.log('[DEBUG] 准备闪灯...');
      onProgress?.("正在闪灯...");
      const result = await carActions.flashLights();
      console.log('[DEBUG] 闪灯 API 返回:', result);
      return { content: "好的，已为您闪灯", action: "车灯 闪烁" };
    } catch (error: any) {
      console.error('[Car API] 闪灯失败:', error);
      const errorMsg = error?.message || error?.toString() || '未知错误';
      return { content: `抱歉，闪灯失败了: ${errorMsg}`, action: "闪灯 失败" };
    }
  }

  // 舒适控制回复（排除股票查询）
  // 空调控制 - 打开
  if ((query.includes("打开空调") || query.includes("开启空调") || query.includes("开空调") || query.includes("空调打开") || query.includes("把空调打开")) && !query.includes("股票")) {
    try {
      console.log('[DEBUG] 准备打开空调...');
      onProgress?.("正在打开空调...");
      const result = await carActions.turnOnAC();
      console.log('[DEBUG] 空调打开 API 返回:', result);
      return { content: "好的，已为您打开空调", action: "空调 已开启" };
    } catch (error: any) {
      console.error('[Car API] 打开空调失败:', error);
      const errorMsg = error?.message || error?.toString() || '未知错误';
      return { content: `抱歉，打开空调失败了: ${errorMsg}`, action: "空调 开启失败" };
    }
  }
  // 空调控制 - 关闭
  if ((query.includes("关闭空调") || query.includes("关空调") || query.includes("空调关闭") || query.includes("把空调关闭") || query.includes("把空调关掉")) && !query.includes("股票")) {
    try {
      console.log('[DEBUG] 准备关闭空调...');
      onProgress?.("正在关闭空调...");
      const result = await carActions.turnOffAC();
      console.log('[DEBUG] 空调关闭 API 返回:', result);
      return { content: "好的，已为您关闭空调", action: "空调 已关闭" };
    } catch (error: any) {
      console.error('[Car API] 关闭空调失败:', error);
      const errorMsg = error?.message || error?.toString() || '未知错误';
      return { content: `抱歉，关闭空调失败了: ${errorMsg}`, action: "空调 关闭失败" };
    }
  }
  // 空调温度调节
  if ((query.includes("空调") || query.includes("温度") || query.includes("冷") || query.includes("热")) && query.includes("度") && !query.includes("股票")) {
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
  // 一键备车 - 调用真实 API
  if (query.includes("备车") || query.includes("明天") || query.includes("早上") || query.includes("出门")) {
    try {
      console.log('[DEBUG] 准备一键备车...');
      onProgress?.("正在执行一键备车...");
      const result = await carActions.prepareCar();
      console.log('[DEBUG] 一键备车 API 返回:', result);
      const hour = Math.floor(Math.random() * 4) + 7;
      return { content: `已为您设置明早 ${hour} 点一键备车`, action: `一键备车 | 明天 ${hour}:00` };
    } catch (error: any) {
      console.error('[Car API] 一键备车失败:', error);
      const errorMsg = error?.message || error?.toString() || '未知错误';
      return { content: `抱歉，一键备车失败了: ${errorMsg}`, action: "一键备车 失败" };
    }
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

  // 哨兵模式回复 - 调用真实 API
  if (query.includes("打开哨兵") || query.includes("开启哨兵")) {
    try {
      console.log('[DEBUG] 准备开启哨兵模式...');
      onProgress?.("正在开启哨兵模式...");
      const result = await carActions.sentryOn();
      console.log('[DEBUG] 哨兵开启 API 返回:', result);
      return { content: "好的，已为您开启哨兵模式", action: "哨兵模式 已开启" };
    } catch (error: any) {
      console.error('[Car API] 开启哨兵模式失败:', error);
      const errorMsg = error?.message || error?.toString() || '未知错误';
      return { content: `抱歉，开启哨兵模式失败了: ${errorMsg}`, action: "哨兵模式 开启失败" };
    }
  }
  if (query.includes("关哨兵") || query.includes("关闭哨兵")) {
    try {
      console.log('[DEBUG] 准备关闭哨兵模式...');
      onProgress?.("正在关闭哨兵模式...");
      const result = await carActions.sentryOff();
      console.log('[DEBUG] 哨兵关闭 API 返回:', result);
      return { content: "好的，已为您关闭哨兵模式", action: "哨兵模式 已关闭" };
    } catch (error: any) {
      console.error('[Car API] 关闭哨兵模式失败:', error);
      const errorMsg = error?.message || error?.toString() || '未知错误';
      return { content: `抱歉，关闭哨兵模式失败了: ${errorMsg}`, action: "哨兵模式 关闭失败" };
    }
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
  setAddMessage?: (fn: (message: Message) => void) => void;
}

export function VoiceChatPage({ onClose, setAddMessage }: VoiceChatPageProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [processingStatus, setProcessingStatus] = useState(""); // 处理状态：推理中、搜索中、准备回复等
  const [isRecording, setIsRecording] = useState(false); // 语音录制状态
  const [showAttachMenu, setShowAttachMenu] = useState(false); // 附件菜单显示状态
  const [showCameraModal, setShowCameraModal] = useState(false); // 摄像头拍照弹窗
  const [attachments, setAttachments] = useState<{type: string, data: string, name: string}[]>([]); // 附件列表

  // 图片生成状态
  const [showImageGenModal, setShowImageGenModal] = useState(false); // 图片生成弹窗
  const [imagePrompt, setImagePrompt] = useState(""); // 图片描述
  const [imageAspectRatio, setImageAspectRatio] = useState("1:1"); // 宽高比
  const [isGeneratingImage, setIsGeneratingImage] = useState(false); // 生成中状态
  const [generatedImageUrl, setGeneratedImageUrl] = useState(""); // 生成的图片URL

  // 图片预览状态
  const [previewImageUrl, setPreviewImageUrl] = useState(""); // 预览中的图片URL

  // 语音合成状态
  const [playingMessageId, setPlayingMessageId] = useState<number | null>(null); // 当前播放的消息ID
  const [loadingMessageId, setLoadingMessageId] = useState<number | null>(null); // 当前加载中的消息ID
  const audioRef = useRef<HTMLAudioElement | null>(null); // 音频元素引用

  // 对话上下文历史（最近5轮）
  const [conversationHistory, setConversationHistory] = useState<{role: 'user' | 'assistant'; content: string; data?: any}[]>([]);

  // 场景引擎提醒状态
  const [scenarioAlerts, setScenarioAlerts] = useState<{time: string; scenario: string; alerts: {type: string; message: string}[]}[]>([]);
  const lastFetchTimeRef = useRef<string>('2020-01-01T00:00:00.000Z'); // 初始化为很早的时间，确保能获取历史提醒

  // 轮询场景引擎提醒
  useEffect(() => {
    let isMounted = true;

    const checkScenarioAlerts = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/alerts?since=' + encodeURIComponent(lastFetchTimeRef.current));
        if (!response.ok) return;

        const data = await response.json();
        if (!isMounted || !data.success) return;

        if (data.hasNew && data.alerts && data.alerts.length > 0) {
          // 有新提醒，添加到状态并显示消息
          const latestAlerts = data.alerts.slice(-5); // 取最近5条

          // 检查是否已经显示过（避免重复显示）
          setScenarioAlerts(prev => {
            const existingTimes = new Set(prev.map(a => a.time));
            const newAlerts = latestAlerts.filter((a: any) => !existingTimes.has(a.time));

            if (newAlerts.length === 0) return prev;

            // 生成提醒消息（包含处理建议）
            const alertMessages = newAlerts.map((alert: any) => {
              const alertDetail = alert.alerts.map((a: any) => a.message).join('、');
              let message = `【${alert.scenario}】检测到: ${alertDetail}\n\n`;

              // 根据提醒类型添加处理建议
              for (const a of alert.alerts) {
                if (a.type === 'tire_pressure') {
                  // 显示四个轮子的胎压
                  const tp = (a as any).tirePressure;
                  if (tp) {
                    message += `🛞 胎压数据 (bar):\n`;
                    message += `   左前: ${tp.fl} | 右前: ${tp.fr}\n`;
                    message += `   左后: ${tp.rl} | 右后: ${tp.rr}\n\n`;
                  }
                  message += `📋 处理建议:\n`;
                  message += `1. 检查轮胎是否有扎钉\n`;
                  message += `2. 尽快补气到2.9bar\n`;
                  message += `3. 如持续漏气，到店检查\n\n`;
                } else if (a.type === 'battery_low' || a.type === 'battery_critical') {
                  message += `📋 处理建议:\n`;
                  if (a.type === 'battery_critical') {
                    message += `1. 电量极低，请立即充电！\n`;
                  } else {
                    message += `1. 电量偏低，建议及时充电\n`;
                  }
                  message += `2. 可使用一键备车功能预热\n`;
                  message += `3. 避免激烈驾驶以省电\n\n`;
                }
              }

              return message.trim();
            });

            // 显示系统提醒消息
            alertMessages.forEach(msg => {
              setMessages(prev => [...prev, {
                id: prev.length + 1,
                type: 'assistant',
                content: msg,
                time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
              }]);
            });

            return [...prev, ...newAlerts];
          });

          // 确认收到提醒
          await fetch('http://localhost:3001/api/ack', { method: 'POST' });
        }

        // 更新最后获取时间
        lastFetchTimeRef.current = new Date().toISOString();
      } catch (e) {
        // 忽略连接错误（服务可能未启动）
      }
    };

    // 立即检查一次
    checkScenarioAlerts();

    // 每30秒轮询一次
    const interval = setInterval(checkScenarioAlerts, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // 注册添加消息的函数，供其他组件调用
  useEffect(() => {
    if (setAddMessage) {
      setAddMessage((message: Message) => {
        setMessages(prev => [...prev, message]);
      });
    }

    // 加载语音命令历史记录
    try {
      const history = JSON.parse(localStorage.getItem('voiceCommandHistory') || '[]');
      if (history.length > 0) {
        // 将历史记录添加到消息中
        setMessages(prev => [...prev, ...history]);
        // 清除 localStorage 中的历史记录（已经加载到消息中）
        localStorage.removeItem('voiceCommandHistory');
      }
    } catch (e) {
      console.error('[VoiceChat] 加载历史记录失败:', e);
    }
  }, [setAddMessage]);

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

  // 播放语音（调用 TTS API）
  const handlePlaySpeech = async (messageId: number, text: string) => {
    if (loadingMessageId !== null || !text.trim()) return;

    // 如果正在播放同一条消息，则停止
    if (playingMessageId === messageId && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlayingMessageId(null);
      return;
    }

    // 如果正在播放其他消息，先停止
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlayingMessageId(null);
    }

    setLoadingMessageId(messageId);

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          model: 'speech-2.8-hd',
          voice_id: 'male-qn-qingse',
          speed: 1,
          output_format: 'url',
        })
      });

      const result = await response.json();
      console.log('[TTS] Response:', result);

      if (result.base_resp?.status_code === 0 && result.data?.audio) {
        const audioUrl = result.data.audio;

        // 创建音频元素并播放
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        setLoadingMessageId(null);
        setPlayingMessageId(messageId);

        audio.onended = () => {
          setPlayingMessageId(null);
          audioRef.current = null;
        };

        audio.onerror = () => {
          setPlayingMessageId(null);
          audioRef.current = null;
          alert('音频播放失败');
        };

        await audio.play();
      } else {
        alert('语音合成失败：' + (result.base_resp?.status_msg || '未知错误'));
        setLoadingMessageId(null);
      }
    } catch (error) {
      console.error('[TTS] Error:', error);
      setLoadingMessageId(null);
      alert('语音合成失败，请重试');
    }
  };

  // 生成图片
  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) return;

    setIsGeneratingImage(true);
    setGeneratedImageUrl("");

    try {
      const response = await fetch('/api/image-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt,
          aspect_ratio: imageAspectRatio,
          n: 1,
          response_format: 'url'
        })
      });

      const result = await response.json();
      console.log('[Image Gen] Result:', result);

      if (result.base_resp?.status_code === 0 && result.data?.image_urls?.[0]) {
        const imageUrl = result.data.image_urls[0];
        const promptPreview = `${imagePrompt.slice(0, 20)}${imagePrompt.length > 20 ? '...' : ''}`;
        const timeStr = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });

        // 将生成的图片作为消息添加到对话中（包含图片描述和图片）
        // 使用函数式更新确保使用最新的 messages 长度
        setMessages(prev => {
          const newMessage: Message = {
            id: prev.length + 1,
            type: 'assistant',
            content: `根据您的描述「${promptPreview}」生成了一张图片：`,
            time: timeStr,
            attachments: [{ type: 'image_url', data: imageUrl, name: 'generated_image.png' }]
          };
          return [...prev, newMessage];
        });

        // 关闭弹窗并清空（不需要延迟，消息已添加到状态）
        setShowImageGenModal(false);
        setImagePrompt("");
        setGeneratedImageUrl("");
      } else {
        alert('图片生成失败：' + (result.base_resp?.status_msg || '未知错误'));
      }
    } catch (error) {
      console.error('[Image Gen] Error:', error);
      alert('图片生成失败，请重试');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // 语音识别功能（使用 Web Speech API）
  const handleVoiceRecord = async () => {
    if (isRecording) {
      // 停止识别
      if (mediaRecorderRef.current) {
        (mediaRecorderRef.current as any).stop();
      }
      setIsRecording(false);
      return;
    }

    try {
      // 检查浏览器是否支持语音识别
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert('您的浏览器不支持语音识别功能，请使用 Chrome 或 Edge 浏览器');
        return;
      }

      // 创建语音识别实例
      const recognition = new SpeechRecognition();
      mediaRecorderRef.current = recognition as any;

      recognition.lang = 'zh-CN';
      recognition.interimResults = false;
      recognition.continuous = false;

      // 识别成功
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        console.log('语音识别结果:', transcript);
        setInputText(transcript);
        setIsRecording(false);
      };

      // 识别结束
      recognition.onend = () => {
        console.log('语音识别结束');
        setIsRecording(false);
      };

      // 识别错误
      recognition.onerror = (event: any) => {
        console.error('语音识别错误:', event.error);
        setIsRecording(false);
        if (event.error === 'not-allowed') {
          alert('请允许麦克风权限后重试');
        } else if (event.error === 'no-speech') {
          console.log('未检测到语音');
        } else {
          alert('语音识别失败: ' + event.error);
        }
      };

      // 开始识别
      recognition.start();
      setIsRecording(true);
      console.log('开始语音识别...');

    } catch (error) {
      console.error('语音识别初始化失败:', error);
      alert('无法启动语音识别，请检查设备设置');
      setIsRecording(false);
    }
  };

  // 附件处理函数
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const processFile = (file: File): Promise<{type: string, data: string, name: string}> => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          const type = file.type.startsWith('image/') ? 'image' : 'file';
          resolve({
            type,
            data: result,
            name: file.name
          });
        };
        reader.readAsDataURL(file);
      });
    };

    Promise.all(Array.from(files).map(processFile)).then(newAttachments => {
      setAttachments(prev => [...prev, ...newAttachments]);
    });

    // 清空 input 以便重复选择相同文件
    event.target.value = '';
    setShowAttachMenu(false);
  };

  const handleCameraCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setAttachments(prev => [...prev, {
        type: 'image',
        data: result,
        name: `camera_${Date.now()}.jpg`
      }]);
    };
    reader.readAsDataURL(file);

    // 清空 input
    event.target.value = '';
    setShowAttachMenu(false);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const toggleAttachMenu = () => {
    setShowAttachMenu(!showAttachMenu);
  };

  // 打开摄像头拍照
  const openCamera = async () => {
    setShowAttachMenu(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setShowCameraModal(true);
      }
    } catch (error) {
      console.error('打开摄像头失败:', error);
      alert('无法打开摄像头，请检查权限设置');
    }
  };

  // 拍照并关闭弹窗
  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setAttachments(prev => [...prev, {
          type: 'image',
          data: dataUrl,
          name: `camera_${Date.now()}.jpg`
        }]);
      }
      // 关闭摄像头
      const stream = videoRef.current.srcObject as MediaStream;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      setShowCameraModal(false);
    }
  };

  // 关闭摄像头弹窗
  const closeCameraModal = () => {
    if (videoRef.current) {
      const stream = videoRef.current.srcObject as MediaStream;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    }
    setShowCameraModal(false);
  };

  // 理解图片内容
  const understandImage = async (imageData: string): Promise<string> => {
    console.log('[Frontend] Starting image understanding, data length:', imageData.length);
    try {
      const response = await fetch('/api/understand-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData: imageData,
          prompt: '请详细描述这张图片的内容，包括其中的物体、场景、颜色等细节'
        })
      });
      const result = await response.json();
      console.log('[Frontend] Image understanding result:', result);
      return result.description || '';
    } catch (error) {
      console.error('[Frontend] 图片理解失败:', error);
      return '图片理解失败';
    }
  };

  const handleSend = async () => {
    // 如果没有输入也没有附件，则不发送
    if (!inputText.trim() && attachments.length === 0) return;
    if (isLoading) return;

    const userContent = inputText.trim();
    const currentAttachments = [...attachments]; // 保存当前附件
    setInputText(""); // 清空输入框
    setAttachments([]); // 清空附件

    // 记录用户输入
    await logToServer('step', { step: `用户输入: ${userContent}` });

    // 1. 先显示用户消息（包含附件）
    const newUserMessage: Message = {
      id: messages.length + 1,
      type: "user",
      content: userContent,
      attachments: currentAttachments,
      time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
    };

    // 添加用户消息
    setMessages(prev => [...prev, newUserMessage]);

    // 2. 显示 loading 状态
    setIsLoading(true);
    setProcessingStatus("正在理解您的问题...");

    // 记录开始处理
    await logToServer('step', { step: '开始处理请求...' });

    console.log('[DEBUG] currentAttachments:', currentAttachments);
    console.log('[DEBUG] attachments state:', attachments);

    // 3. 获取回复（附件由Agent自己处理）
    setProcessingStatus("正在思考回复方案...");

    // 获取之前的上下文数据（找最后一条assistant消息的data）
    let previousData: any = undefined;
    for (let i = conversationHistory.length - 1; i >= 0; i--) {
      if (conversationHistory[i].role === 'assistant' && conversationHistory[i].data) {
        previousData = conversationHistory[i].data;
        break;
      }
    }

    const { content, action, data } = await generateResponse(
      userContent,
      setProcessingStatus,
      currentAttachments,
      conversationHistory,
      previousData
    );

    // 记录完成
    await logToServer('step', { step: `处理完成，回复: ${content.substring(0, 30)}...` });

    // 更新对话历史（保留最近5轮）
    const newHistory = [
      ...conversationHistory,
      { role: 'user' as const, content: userContent },
      { role: 'assistant' as const, content, data },
    ].slice(-10); // 5轮 = 10条记录

    setConversationHistory(newHistory);

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

    // 获取之前的上下文数据（找最后一条assistant消息的data）
    let previousData: any = undefined;
    for (let i = conversationHistory.length - 1; i >= 0; i--) {
      if (conversationHistory[i].role === 'assistant' && conversationHistory[i].data) {
        previousData = conversationHistory[i].data;
        break;
      }
    }

    // 2. 获取回复
    const { content, action: actionText, data } = await generateResponse(
      userContent,
      undefined,
      [],
      conversationHistory,
      previousData
    );

    // 3. 添加助手回复
    const assistantMessage: Message = {
      id: messages.length + 2,
      type: "assistant",
      content,
      action: actionText,
    };

    setMessages(prev => [...prev, assistantMessage]);

    // 更新对话历史
    const newHistory = [
      ...conversationHistory,
      { role: 'user' as const, content: userContent },
      { role: 'assistant' as const, content, data },
    ].slice(-10);

    setConversationHistory(newHistory);
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
                  {/* 显示文本内容 */}
                  {msg.content && (
                    <p style={{ fontSize: 14, color: "rgba(255,255,255,0.9)", lineHeight: 1.5, fontFamily: "sans-serif" }}>
                      {msg.content}
                    </p>
                  )}
                  {/* 显示附件（图片）- 在文字下方 */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {msg.attachments.map((attachment, idx) => (
                        (attachment.type === 'image' || attachment.type === 'image_url') ? (
                          <a
                            key={idx}
                            href={attachment.data}
                            download={attachment.name}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'block' }}
                            title="点击放大，右键保存图片"
                          >
                            <img
                              src={attachment.data}
                              alt={attachment.name}
                              style={{
                                maxWidth: 260,
                                maxHeight: 200,
                                borderRadius: 8,
                                objectFit: 'cover',
                                cursor: 'pointer',
                              }}
                              onClick={(e) => {
                                e.preventDefault();
                                setPreviewImageUrl(attachment.data);
                              }}
                            />
                          </a>
                        ) : (
                          <div
                            key={idx}
                            style={{
                              padding: '8px 12px',
                              background: 'rgba(255,255,255,0.1)',
                              borderRadius: 6,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            <FileText size={14} color="rgba(255,255,255,0.6)" />
                            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
                              {attachment.name}
                            </span>
                          </div>
                        )
                      ))}
                    </div>
                  )}
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
                    maxWidth: 280,
                  }}
                >
                  {/* 显示文本内容 */}
                  {msg.content && (
                    <p style={{ fontSize: 14, color: "rgba(255,255,255,0.9)", lineHeight: 1.5, fontFamily: "sans-serif" }}>
                      {msg.content}
                    </p>
                  )}
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
                  {/* 播放语音按钮 - 在文字内容下方 */}
                  {msg.content && msg.type === 'assistant' && (
                    <button
                      onClick={() => handlePlaySpeech(msg.id, msg.content)}
                      disabled={loadingMessageId === msg.id}
                      style={{
                        marginTop: 8,
                        padding: '6px 12px',
                        background: loadingMessageId === msg.id
                          ? 'rgba(51,136,255,0.1)'
                          : playingMessageId === msg.id
                            ? 'rgba(51,136,255,0.25)'
                            : 'rgba(51,136,255,0.15)',
                        border: '0.5px solid rgba(51,136,255,0.3)',
                        borderRadius: 16,
                        cursor: loadingMessageId === msg.id ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        width: 'fit-content',
                        opacity: loadingMessageId === msg.id ? 0.7 : 1,
                        transition: 'all 0.2s ease',
                        animation: loadingMessageId === msg.id ? 'pulse 1.5s ease-in-out infinite' : 'none',
                      }}
                      title={playingMessageId === msg.id ? "点击暂停" : "点击播放语音"}
                    >
                      {/* 生成中显示转圈，播放中不显示图标 */}
                      {loadingMessageId === msg.id ? (
                        <Loader2 size={14} color="rgba(51,136,255,0.9)" style={{ animation: 'spin 1s linear infinite' }} />
                      ) : playingMessageId === msg.id ? null : (
                        <Sparkles size={14} color="rgba(51,136,255,0.9)" />
                      )}
                      <span style={{ fontSize: 12, color: 'rgba(51,136,255,0.9)' }}>
                        {loadingMessageId === msg.id ? '生成中...' : playingMessageId === msg.id ? '播放中...' : '朗读'}
                      </span>
                    </button>
                  )}
                  {/* 显示附件（图片）- 在文字下方 */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {msg.attachments.map((attachment, idx) => (
                        (attachment.type === 'image' || attachment.type === 'image_url') ? (
                          <a
                            key={idx}
                            href={attachment.data}
                            download={attachment.name}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'block' }}
                            title="点击放大，右键保存图片"
                          >
                            <img
                              src={attachment.data}
                              alt={attachment.name}
                              style={{
                                maxWidth: 260,
                                maxHeight: 200,
                                borderRadius: 8,
                                objectFit: 'cover',
                                cursor: 'pointer',
                              }}
                              onClick={(e) => {
                                e.preventDefault();
                                setPreviewImageUrl(attachment.data);
                              }}
                            />
                          </a>
                        ) : (
                          <div
                            key={idx}
                            style={{
                              padding: '8px 12px',
                              background: 'rgba(255,255,255,0.1)',
                              borderRadius: 6,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            <FileText size={14} color="rgba(255,255,255,0.6)" />
                            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
                              {attachment.name}
                            </span>
                          </div>
                        )
                      ))}
                    </div>
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

      {/* 底部输入框区域 */}
      <div
        style={{
          background: "rgba(10,12,15,0.98)",
          borderTop: "0.5px solid rgba(255,255,255,0.07)",
          padding: '12px 16px 20px 16px',
        }}
      >
        {/* 附件预览 - 显示在输入框上方 */}
        {attachments.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {attachments.map((attachment, index) => (
              <div
                key={index}
                style={{
                  position: 'relative',
                  width: 60,
                  height: 60,
                  borderRadius: 8,
                  overflow: 'hidden',
                  background: 'rgba(255,255,255,0.1)',
                }}
              >
                {attachment.type === 'image' ? (
                  <img
                    src={attachment.data}
                    alt={attachment.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 2 }}>
                    <FileText size={20} color="rgba(255,255,255,0.6)" />
                    <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', maxWidth: 50, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {attachment.name}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => removeAttachment(index)}
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: 'rgba(255,0,0,0.8)',
                    border: 'none',
                    color: 'white',
                    fontSize: 12,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 输入框和按钮行 */}
        <div className="flex items-center gap-3">
        {/* 隐藏的文件输入 */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.txt"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleCameraCapture}
          style={{ display: 'none' }}
        />

        {/* + 按钮 - 附件菜单 */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={toggleAttachMenu}
            disabled={isLoading}
            className="flex items-center justify-center cursor-pointer"
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              background: "rgba(255,255,255,0.1)",
              border: "none",
              opacity: isLoading ? 0.6 : 1,
            }}
            title="添加附件"
          >
            <Plus size={20} color="rgba(255,255,255,0.6)" />
          </button>

          {/* 附件菜单 */}
          {showAttachMenu && (
            <div
              style={{
                position: 'absolute',
                bottom: 54,
                left: 0,
                background: 'rgba(30,30,30,0.95)',
                borderRadius: 12,
                padding: '8px 0',
                minWidth: 160,
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                zIndex: 1000,
              }}
            >
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  fontSize: 14,
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <Image size={18} color="rgba(255,255,255,0.7)" />
                选择文件/图片
              </button>
              <button
                onClick={openCamera}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  fontSize: 14,
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <Camera size={18} color="rgba(255,255,255,0.7)" />
                拍照
              </button>
              <button
                onClick={() => {
                  setShowAttachMenu(false);
                  setShowImageGenModal(true);
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  fontSize: 14,
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <Wand2 size={18} color="rgba(255,255,255,0.7)" />
                AI 画图
              </button>
            </div>
          )}
        </div>

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
        {/* 麦克风按钮 - 语音输入 */}
        <button
          onClick={handleVoiceRecord}
          disabled={isLoading}
          className="flex items-center justify-center cursor-pointer"
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            background: isRecording ? "rgba(255,59,48,0.9)" : "rgba(255,255,255,0.1)",
            border: "none",
            opacity: isLoading ? 0.6 : 1,
            marginRight: 8,
            animation: isRecording ? "pulse 1.5s ease-in-out infinite" : "none",
            boxShadow: isRecording ? "0 0 0 0 rgba(255,59,48,0.7)" : "none",
          }}
          title={isRecording ? "点击停止录音" : "点击开始语音输入"}
        >
          <Mic size={20} color={isRecording ? "white" : "rgba(255,255,255,0.6)"} />
        </button>
        {/* 发送按钮 */}
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
            <Send size={20} color={inputText.trim() ? "white" : "rgba(255,255,255,0.35)"} />
          )}
        </button>
        </div>
      </div>

      {/* 摄像头拍照弹窗 */}
      {showCameraModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.9)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{
              maxWidth: '90%',
              maxHeight: '70%',
              borderRadius: 12,
            }}
          />
          <div style={{ display: 'flex', gap: 20, marginTop: 20 }}>
            <button
              onClick={capturePhoto}
              style={{
                padding: '12px 32px',
                fontSize: 16,
                background: 'rgba(51,136,255,0.9)',
                color: 'white',
                border: 'none',
                borderRadius: 22,
                cursor: 'pointer',
              }}
            >
              拍照
            </button>
            <button
              onClick={closeCameraModal}
              style={{
                padding: '12px 32px',
                fontSize: 16,
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                border: 'none',
                borderRadius: 22,
                cursor: 'pointer',
              }}
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* AI 图片生成弹窗 - 贴合聊天页面 */}
      {showImageGenModal && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            style={{
              background: 'rgba(20,22,25,0.98)',
              borderRadius: 16,
              padding: 20,
              width: '100%',
              maxWidth: 380,
              maxHeight: 'calc(100% - 32px)',
              overflow: 'auto',
              border: '0.5px solid rgba(255,255,255,0.1)',
            }}
          >
            {/* 标题栏 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Wand2 size={20} color="rgba(51,136,255,0.9)" />
                <span style={{ fontSize: 16, fontWeight: 600, color: 'white' }}>AI 图片生成</span>
              </div>
              <button
                onClick={() => {
                  setShowImageGenModal(false);
                  setImagePrompt("");
                  setGeneratedImageUrl("");
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: 20,
                  cursor: 'pointer',
                  padding: 4,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            {/* 图片描述输入 */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>
                图片描述
              </label>
              <textarea
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                placeholder="描述你想要生成的图片内容..."
                disabled={isGeneratingImage}
                style={{
                  width: '100%',
                  height: 80,
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '0.5px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'white',
                  fontSize: 13,
                  resize: 'none',
                  outline: 'none',
                  fontFamily: 'sans-serif',
                }}
              />
            </div>

            {/* 宽高比选择 */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>
                宽高比
              </label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['1:1', '16:9', '4:3', '3:2', '9:16', '21:9'].map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setImageAspectRatio(ratio)}
                    disabled={isGeneratingImage}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      border: imageAspectRatio === ratio ? '1px solid rgba(51,136,255,0.9)' : '0.5px solid rgba(255,255,255,0.15)',
                      background: imageAspectRatio === ratio ? 'rgba(51,136,255,0.2)' : 'rgba(255,255,255,0.06)',
                      color: imageAspectRatio === ratio ? 'rgba(51,136,255,0.9)' : 'rgba(255,255,255,0.7)',
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            {/* 预览区域 */}
            {generatedImageUrl && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>
                  生成的图片
                </label>
                <img
                  src={generatedImageUrl}
                  alt="Generated"
                  style={{
                    width: '100%',
                    borderRadius: 10,
                    border: '0.5px solid rgba(255,255,255,0.1)',
                  }}
                />
              </div>
            )}

            {/* 按钮 */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowImageGenModal(false);
                  setImagePrompt("");
                  setGeneratedImageUrl("");
                }}
                disabled={isGeneratingImage}
                style={{
                  padding: '8px 18px',
                  fontSize: 13,
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 18,
                  cursor: isGeneratingImage ? 'not-allowed' : 'pointer',
                  opacity: isGeneratingImage ? 0.6 : 1,
                }}
              >
                取消
              </button>
              <button
                onClick={handleGenerateImage}
                disabled={isGeneratingImage || !imagePrompt.trim()}
                style={{
                  padding: '8px 18px',
                  fontSize: 13,
                  background: isGeneratingImage || !imagePrompt.trim() ? 'rgba(51,136,255,0.3)' : 'rgba(51,136,255,0.9)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 18,
                  cursor: isGeneratingImage || !imagePrompt.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {isGeneratingImage ? (
                  <>
                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    生成中...
                  </>
                ) : (
                  <>
                    <Wand2 size={14} />
                    生成
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 加载动画样式 */}
          <style>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {/* 图片预览弹窗 - 点击放大 */}
      {previewImageUrl && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.95)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: 20,
          }}
          onClick={() => setPreviewImageUrl("")}
        >
          {/* 关闭按钮 */}
          <button
            onClick={() => setPreviewImageUrl("")}
            style={{
              position: 'absolute',
              top: 20,
              right: 20,
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: 'white',
              fontSize: 20,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </button>

          {/* 提示文字 */}
          <div style={{
            position: 'absolute',
            bottom: 30,
            left: 0,
            right: 0,
            textAlign: 'center',
            color: 'rgba(255,255,255,0.5)',
            fontSize: 13,
          }}>
            点击任意处关闭 · 右键图片可保存
          </div>

          {/* 预览图片 */}
          <img
            src={previewImageUrl}
            alt="Preview"
            style={{
              maxWidth: '90%',
              maxHeight: '80%',
              objectFit: 'contain',
              borderRadius: 12,
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
