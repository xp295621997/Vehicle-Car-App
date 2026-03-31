// 图片理解 Agent - 处理图片理解请求

import { AgentRequest, AgentResponse, AgentType, IntentType, Attachment } from './types';

interface ImageUnderstandingContext {
  imageData?: string;
}

/**
 * 处理图片理解请求
 */
export async function processImageUnderstanding(request: AgentRequest): Promise<AgentResponse> {
  const { query, context, attachments, onProgress } = request;

  console.log(`[ImageUnderstanding Agent] Processing: ${query}`);

  // 优先从附件获取图片数据
  let imageData: string | undefined;
  let imageName: string | undefined;

  if (attachments && attachments.length > 0) {
    const imageAttachment = attachments.find(a => a.type === 'image');
    if (imageAttachment) {
      imageData = imageAttachment.data;
      imageName = imageAttachment.name;
    }
  }

  // 从上下文中获取图片数据
  if (!imageData && context) {
    imageData = (context as ImageUnderstandingContext).imageData;
  }

  // 尝试从查询中提取图片描述
  const imageMatch = query.match(/\[图片内容:\s*([^\]]+)\]/);
  const imageDescription = imageMatch ? imageMatch[1] : null;

  // 如果有图片数据，调用 API
  if (imageData) {
    try {
      console.log(`[ImageUnderstanding Agent] Understanding image...`);
      onProgress?.('正在理解图片内容...');

      const response = await fetch('/api/understand-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData,
          prompt: query,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      console.log(`[ImageUnderstanding Agent] Result:`, result);

      if (result.error) {
        throw new Error(result.error);
      }

      const description = result.description || '图片理解失败';

      return {
        content: `这是一张图片，内容是：${description}`,
        action: '图片理解',
        agent: AgentType.IMAGE_UNDERSTANDING,
        intent: IntentType.IMAGE_UNDERSTANDING,
        success: true,
        data: { description },
      };
    } catch (error: any) {
      console.error(`[ImageUnderstanding Agent] Error:`, error);

      // 如果有图片描述，降级到本地处理
      if (imageDescription) {
        return {
          content: `这是一张图片，内容是：${imageDescription}`,
          action: '图片理解',
          agent: AgentType.IMAGE_UNDERSTANDING,
          intent: IntentType.IMAGE_UNDERSTANDING,
          success: true,
          data: { description: imageDescription },
        };
      }

      const errorMsg = error?.message || error?.toString() || '未知错误';
      return {
        content: `图片理解失败: ${errorMsg}`,
        action: '图片理解失败',
        agent: AgentType.IMAGE_UNDERSTANDING,
        intent: IntentType.IMAGE_UNDERSTANDING,
        success: false,
        error: errorMsg,
      };
    }
  }

  // 如果没有图片数据但有图片描述
  if (imageDescription) {
    return {
      content: `这是一张图片，内容是：${imageDescription}`,
      action: '图片理解',
      agent: AgentType.IMAGE_UNDERSTANDING,
      intent: IntentType.IMAGE_UNDERSTANDING,
      success: true,
      data: { description: imageDescription },
    };
  }

  // 无法获取图片
  return {
    content: '抱歉，我无法获取图片内容。请发送图片后再询问',
    action: '无法理解',
    agent: AgentType.IMAGE_UNDERSTANDING,
    intent: IntentType.IMAGE_UNDERSTANDING,
    success: false,
    error: 'No image data available',
  };
}
