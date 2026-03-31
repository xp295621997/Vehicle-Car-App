// 对话日志服务
// 实时记录语音对话的执行过程

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, 'logs');
const CONVERSATION_LOG = path.join(LOG_DIR, 'conversations');
const REALTIME_LOG = path.join(LOG_DIR, 'realtime.log');

// 确保目录存在
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}
if (!fs.existsSync(CONVERSATION_LOG)) {
  fs.mkdirSync(CONVERSATION_LOG, { recursive: true });
}

// 获取今天的日期字符串
function getToday() {
  return new Date().toISOString().split('T')[0];
}

// 获取时间戳
function getTimestamp() {
  return new Date().toISOString();
}

// 写入实时日志（显示推理过程）
function writeRealtimeLog(content) {
  const logEntry = `[${getTimestamp()}] ${content}\n`;
  fs.appendFileSync(REALTIME_LOG, logEntry);
  console.log(logEntry.trim());
}

// 写入对话历史（按日归类）
function writeConversation(userQuery, assistantResponse, action) {
  const today = getToday();
  const logFile = path.join(CONVERSATION_LOG, `${today}.json`);

  let conversations = [];

  // 如果文件已存在，读取现有数据
  if (fs.existsSync(logFile)) {
    try {
      const existingData = fs.readFileSync(logFile, 'utf-8');
      conversations = JSON.parse(existingData);
    } catch (e) {
      conversations = [];
    }
  }

  // 添加新对话
  const newConversation = {
    id: conversations.length + 1,
    timestamp: getTimestamp(),
    userQuery,
    assistantResponse,
    action,
  };

  conversations.push(newConversation);

  // 写入文件
  fs.writeFileSync(logFile, JSON.stringify(conversations, null, 2), 'utf-8');

  // 同时写入实时日志
  writeRealtimeLog(`[对话 #${newConversation.id}] 用户: ${userQuery}`);
  writeRealtimeLog(`[对话 #${newConversation.id}] 助手: ${assistantResponse.substring(0, 50)}...`);
  writeRealtimeLog(`[对话 #${newConversation.id}] 操作: ${action}`);
  writeRealtimeLog('---');
}

// 写入推理步骤
function write推理Step(step) {
  writeRealtimeLog(`[推理] ${step}`);
}

// 写入搜索过程
function write搜索Process(query) {
  writeRealtimeLog(`[搜索] 开始搜索: ${query}`);
}

// 搜索完成
function write搜索Complete(resultsCount) {
  writeRealtimeLog(`[搜索] 找到 ${resultsCount} 个结果`);
}

// 清空实时日志
function clearRealtimeLog() {
  fs.writeFileSync(REALTIME_LOG, '', 'utf-8');
}

// 读取今日对话历史
function getTodayConversations() {
  const today = getToday();
  const logFile = path.join(CONVERSATION_LOG, `${today}.json`);

  if (fs.existsSync(logFile)) {
    try {
      return JSON.parse(fs.readFileSync(logFile, 'utf-8'));
    } catch (e) {
      return [];
    }
  }
  return [];
}

// 读取指定日期的对话历史
function getConversationsByDate(date) {
  const logFile = path.join(CONVERSATION_LOG, `${date}.json`);

  if (fs.existsSync(logFile)) {
    try {
      return JSON.parse(fs.readFileSync(logFile, 'utf-8'));
    } catch (e) {
      return [];
    }
  }
  return [];
}

// 导出函数
module.exports = {
  writeRealtimeLog,
  writeConversation,
  write推理Step,
  write搜索Process,
  write搜索Complete,
  clearRealtimeLog,
  getTodayConversations,
  getConversationsByDate,
  getToday,
  LOG_DIR,
  CONVERSATION_LOG,
  REALTIME_LOG,
};
