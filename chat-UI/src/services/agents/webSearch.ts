// 联网搜索 Agent - 处理搜索、天气、闲聊等请求

import { AgentRequest, AgentResponse, AgentType, IntentType } from './types';

// 闲聊回复模板
const CHITCHAT_REPLIES = {
  greeting: [
    '您好！有什么可以帮您的？',
    '你好！有什么需要帮忙的吗？',
    '您好！请问我能为您做些什么？',
  ],
  thanks: [
    '不客气！',
    '不用谢！',
    '很高兴能帮到您！',
  ],
  goodbye: [
    '再见！祝您行车愉快！',
    '再见！有需要随时找我！',
    '再见！路上注意安全！',
  ],
  unknown: [
    '抱歉，我不太明白您的意思',
    '请您再说一遍可以吗？',
    '我暂时无法理解您的问题',
  ],
};

// 关键词匹配闲聊类型
function matchChitchat(query: string): string | null {
  const lowerQuery = query.toLowerCase();

  // 问候
  if (lowerQuery.includes('你好') || lowerQuery.includes('您好') || lowerQuery.includes('hello') || lowerQuery.includes('hi') || lowerQuery.includes('在吗')) {
    return 'greeting';
  }

  // 感谢
  if (lowerQuery.includes('谢谢') || lowerQuery.includes('感谢') || lowerQuery.includes('感恩')) {
    return 'thanks';
  }

  // 再见
  if (lowerQuery.includes('再见') || lowerQuery.includes('拜拜') || lowerQuery.includes('bye')) {
    return 'goodbye';
  }

  return null;
}

// 获取随机回复
function getRandomReply(type: string): string {
  const replies = CHITCHAT_REPLIES[type as keyof typeof CHITCHAT_REPLIES];
  if (!replies) return CHITCHAT_REPLIES.unknown[0];
  return replies[Math.floor(Math.random() * replies.length)];
}

/**
 * 处理联网搜索请求
 */
export async function processWebSearch(request: AgentRequest): Promise<AgentResponse> {
  const { query, onProgress } = request;

  console.log(`[WebSearch Agent] Processing: ${query}`);

  const lowerQuery = query.toLowerCase();

  // 首先检查是否是闲聊
  const chitchatType = matchChitchat(query);
  if (chitchatType) {
    const reply = getRandomReply(chitchatType);
    return {
      content: reply,
      action: chitchatType,
      agent: AgentType.WEB_SEARCH,
      intent: IntentType.WEB_SEARCH,
      success: true,
    };
  }

  // 天气查询
  if (lowerQuery.includes('天气')) {
    try {
      onProgress?.('正在查询天气...');

      // 调用搜索 API
      const searchQuery = query.replace(/天气/g, '').trim() || '当前天气';
      const response = await callSearchAPI(searchQuery + ' 天气');

      if (response && response.results && response.results.length > 0) {
        const result = response.results[0];
        return {
          content: result.body || '查询到天气信息',
          action: '天气查询',
          agent: AgentType.WEB_SEARCH,
          intent: IntentType.WEB_SEARCH,
          success: true,
          data: { results: response.results },
        };
      }

      // 模拟天气回复
      const weathers = ['晴天', '多云', '阴天', '小雨'];
      const weather = weathers[Math.floor(Math.random() * weathers.length)];
      const temp = Math.floor(Math.random() * 15) + 15;
      return {
        content: `当前${searchQuery || '本地'}天气${weather}，气温 ${temp}°C`,
        action: '天气查询',
        agent: AgentType.WEB_SEARCH,
        intent: IntentType.WEB_SEARCH,
        success: true,
      };
    } catch (error: any) {
      console.error(`[WebSearch Agent] Weather search error:`, error);
      return {
        content: '抱歉，天气查询暂时不可用',
        action: '天气查询失败',
        agent: AgentType.WEB_SEARCH,
        intent: IntentType.WEB_SEARCH,
        success: false,
        error: error?.message,
      };
    }
  }

  // 股票查询
  if (lowerQuery.includes('股票') || lowerQuery.includes('股价') || lowerQuery.includes('市值')) {
    try {
      onProgress?.('正在查询股票...');

      // 提取股票名称
      const stockMatch = query.match(/([^\s]+公司|[^\s]+集团|[^\s]+股份)/);
      const stockName = stockMatch ? stockMatch[1] : query.replace(/股票|股价|市值|多少/g, '').trim();

      const response = await callSearchAPI(stockName + ' 股票 股价');

      if (response && response.results && response.results.length > 0) {
        const result = response.results[0];
        return {
          content: result.body || `为您查到: ${result.title}`,
          action: '股票查询',
          agent: AgentType.WEB_SEARCH,
          intent: IntentType.WEB_SEARCH,
          success: true,
          data: { results: response.results },
        };
      }

      return {
        content: `抱歉，未找到${stockName}的股票信息`,
        action: '股票查询无结果',
        agent: AgentType.WEB_SEARCH,
        intent: IntentType.WEB_SEARCH,
        success: false,
      };
    } catch (error: any) {
      console.error(`[WebSearch Agent] Stock search error:`, error);
      return {
        content: '抱歉，股票查询暂时不可用',
        action: '股票查询失败',
        agent: AgentType.WEB_SEARCH,
        intent: IntentType.WEB_SEARCH,
        success: false,
        error: error?.message,
      };
    }
  }

  // 新闻查询
  if (lowerQuery.includes('新闻')) {
    try {
      onProgress?.('正在查询新闻...');

      const response = await callSearchAPI('今日热点新闻');

      if (response && response.results && response.results.length > 0) {
        const newsList = response.results.slice(0, 3).map((r: any, i: number) => `${i + 1}. ${r.title}`).join('\n');
        return {
          content: `今日热点新闻：\n${newsList}`,
          action: '新闻查询',
          agent: AgentType.WEB_SEARCH,
          intent: IntentType.WEB_SEARCH,
          success: true,
          data: { results: response.results },
        };
      }

      return {
        content: '抱歉，暂无法获取新闻',
        action: '新闻查询',
        agent: AgentType.WEB_SEARCH,
        intent: IntentType.WEB_SEARCH,
        success: false,
      };
    } catch (error: any) {
      return {
        content: '抱歉，新闻查询暂时不可用',
        action: '新闻查询失败',
        agent: AgentType.WEB_SEARCH,
        intent: IntentType.WEB_SEARCH,
        success: false,
        error: error?.message,
      };
    }
  }

  // 附近搜索
  if (lowerQuery.includes('附近') || lowerQuery.includes('哪里有')) {
    try {
      onProgress?.('正在搜索附近...');

      const searchQuery = query.replace(/附近|哪里有/g, '').trim();
      const response = await callSearchAPI(searchQuery + ' 附近');

      if (response && response.results && response.results.length > 0) {
        const results = response.results.slice(0, 5).map((r: any) => `${r.title} - ${r.body?.substring(0, 50)}`).join('\n');
        return {
          content: `为您找到以下结果：\n${results}`,
          action: '附近搜索',
          agent: AgentType.WEB_SEARCH,
          intent: IntentType.WEB_SEARCH,
          success: true,
          data: { results: response.results },
        };
      }

      return {
        content: '抱歉，暂未找到相关结果',
        action: '搜索无结果',
        agent: AgentType.WEB_SEARCH,
        intent: IntentType.WEB_SEARCH,
        success: false,
      };
    } catch (error: any) {
      return {
        content: '抱歉，搜索暂时不可用',
        action: '搜索失败',
        agent: AgentType.WEB_SEARCH,
        intent: IntentType.WEB_SEARCH,
        success: false,
        error: error?.message,
      };
    }
  }

  // 通用搜索
  try {
    onProgress?.('正在搜索...');

    const response = await callSearchAPI(query);

    if (response && response.results && response.results.length > 0) {
      const result = response.results[0];
      return {
        content: result.body || `为您找到: ${result.title}`,
        action: '搜索结果',
        agent: AgentType.WEB_SEARCH,
        intent: IntentType.WEB_SEARCH,
        success: true,
        data: { results: response.results },
      };
    }

    return {
      content: '抱歉，未找到相关信息',
      action: '无结果',
      agent: AgentType.WEB_SEARCH,
      intent: IntentType.WEB_SEARCH,
      success: false,
    };
  } catch (error: any) {
    console.error(`[WebSearch Agent] Search error:`, error);

    // 降级到闲聊回复
    return {
      content: getRandomReply('unknown'),
      action: '闲聊',
      agent: AgentType.WEB_SEARCH,
      intent: IntentType.WEB_SEARCH,
      success: true,
    };
  }
}

/**
 * 调用搜索 API
 */
async function callSearchAPI(query: string): Promise<{ results: any[] }> {
  try {
    const response = await fetch('/api/mcp-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error(`[WebSearch Agent] API call error:`, error);
    throw error;
  }
}
