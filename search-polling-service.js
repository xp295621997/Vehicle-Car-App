// 搜索轮询服务 - 检测到搜索请求后通知 Claude Code
const fs = require('fs');
const path = require('path');

const SEARCH_REQUEST_PATH = '/Users/mi/Desktop/Claude Code/Chatbox/chat UI/public/search-request.json';
const SEARCH_RESULT_PATH = '/Users/mi/Desktop/Claude Code/Chatbox/chat UI/public/search-result.json';
const NOTIFY_FILE = '/Users/mi/Desktop/Claude Code/Chatbox/chat UI/logs/search-notify.txt';

let lastQuery = '';
let isProcessing = false;

// 读取 JSON 文件
function readJsonFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return null;
  }
}

// 写入 JSON 文件
function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error.message);
    return false;
  }
}

// 通知文件（通知 Claude Code 来处理搜索）
function notifySearch(query) {
  try {
    // 写入通知文件，包含时间戳
    const notifyData = {
      query: query,
      timestamp: Date.now(),
      status: 'pending'
    };
    fs.writeFileSync(NOTIFY_FILE, JSON.stringify(notifyData, null, 2), 'utf-8');
    console.log(`\n[${new Date().toISOString()}] 需要搜索: "${query}"`);
    console.log('请在 Claude Code 对话中输入搜索命令或等待自动处理...\n');
  } catch (error) {
    console.error('通知失败:', error.message);
  }
}

// 处理搜索请求
function handleSearchRequest() {
  if (isProcessing) {
    return;
  }

  const requestData = readJsonFile(SEARCH_REQUEST_PATH);

  if (!requestData) {
    return;
  }

  const currentQuery = requestData.query;

  // 检查 query 是否有效且与上次不同，且状态不是 done
  if (currentQuery && currentQuery !== lastQuery && requestData.status !== 'done') {
    isProcessing = true;
    lastQuery = currentQuery;

    console.log(`\n[${new Date().toISOString()}] 检测到新搜索请求: "${currentQuery}"`);

    // 更新状态为搜索中
    writeJsonFile(SEARCH_REQUEST_PATH, {
      ...requestData,
      status: 'searching'
    });

    // 通知 Claude Code 来处理（通过写入通知文件）
    notifySearch(currentQuery);

    // 同时更新 result 文件状态
    writeJsonFile(SEARCH_RESULT_PATH, {
      query: currentQuery,
      status: 'waiting_for_mcp',
      results: []
    });

    isProcessing = false;
  }
}

// 启动轮询
function startPolling() {
  console.log('='.repeat(50));
  console.log('Search Polling Service Started');
  console.log('Monitoring:', SEARCH_REQUEST_PATH);
  console.log('Notify file:', NOTIFY_FILE);
  console.log('Polling interval: 1 second');
  console.log('='.repeat(50));
  console.log('\n当检测到搜索请求时，请手动在 Claude Code 中调用 MCP 搜索\n');

  // 初始化时读取当前 query
  const initialData = readJsonFile(SEARCH_REQUEST_PATH);
  if (initialData) {
    lastQuery = initialData.query || '';
  }

  // 每秒检查一次文件变化
  setInterval(handleSearchRequest, 1000);
}

// 启动服务
startPolling();
