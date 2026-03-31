// 车辆知识库 Agent - RAG 问答

import { AgentRequest, AgentResponse, AgentType, IntentType } from './types';
import { retrieveVehicleKnowledge, isVehicleConfigQuery, getKnowledgeBase } from './vehicleKnowledge';

/**
 * 处理车辆配置问答
 */
export async function processVehicleKnowledge(request: AgentRequest): Promise<AgentResponse> {
  const { query, context, onProgress } = request;

  try {
    console.log(`[VehicleKnowledge Agent] Processing: ${query}`);
    onProgress?.('检索车辆配置信息...');

    // RAG 检索
    const result = retrieveVehicleKnowledge(query);

    if (result && result.relevance > 0.3) {
      console.log(`[VehicleKnowledge Agent] Found answer, relevance: ${result.relevance}`);

      return {
        content: result.answer,
        action: `已为您查询到${result.category}信息`,
        agent: AgentType.VEHICLE_KNOWLEDGE,
        intent: IntentType.VEHICLE_KNOWLEDGE,
        success: true,
        data: {
          category: result.category,
          relevance: result.relevance,
        },
      };
    }

    // 没有找到匹配的信息
    return {
      content: '抱歉，关于这个问题我暂时没有找到对应的配置信息。您可以换个方式问我，比如问"续航多少"、"加速怎么样"、"有哪些颜色"等。',
      action: '未找到匹配信息',
      agent: AgentType.VEHICLE_KNOWLEDGE,
      intent: IntentType.VEHICLE_KNOWLEDGE,
      success: true,
    };
  } catch (error: any) {
    console.error('[VehicleKnowledge Agent] Error:', error);
    return {
      content: `查询失败: ${error?.message || '未知错误'}`,
      action: '查询失败',
      agent: AgentType.VEHICLE_KNOWLEDGE,
      intent: IntentType.VEHICLE_KNOWLEDGE,
      success: false,
      error: error?.message,
    };
  }
}

/**
 * 检查问题是否属于车辆配置范畴
 */
export { isVehicleConfigQuery };
