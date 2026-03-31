const fs = require('fs');
const path = require('path');

// 文件路径配置
const NOTIFY_FILE = '/Users/mi/Desktop/Claude Code/Chatbox/chat UI/logs/search-notify.txt';
const RESULT_FILE = '/Users/mi/Desktop/Claude Code/Chatbox/chat UI/public/search-result.json';
const REQUEST_FILE = '/Users/mi/Desktop/Claude Code/Chatbox/chat UI/public/search-request.json';

// 读取并解析 JSON 文件
function readJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`读取文件失败: ${filePath}`, error.message);
    return null;
  }
}

// 写入 JSON 文件
function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`写入文件失败: ${filePath}`, error.message);
    return false;
  }
}

// 执行搜索
async function performSearch(query) {
  try {
    // 使用 mcp__MiniMax__web_search 工具
    const searchResults = await mcp__MiniMax__web_search({ query });

    // 解析搜索结果
    const results = [];
    if (searchResults && searchResults.organic) {
      for (const item of searchResults.organic) {
        results.push({
          title: item.title || '',
          body: item.snippet || '',
          link: item.link || ''
        });
      }
    }

    return results;
  } catch (error) {
    console.error('搜索失败:', error.message);
    return [];
  }
}

// 处理搜索请求
async function processSearch() {
  console.log(`[${new Date().toISOString()}] 检查搜索请求...`);

  // 读取 notify 文件
  const notifyData = readJsonFile(NOTIFY_FILE);
  if (!notifyData) {
    return;
  }

  // 检查状态是否为 pending
  if (notifyData.status !== 'pending') {
    console.log(`状态: ${notifyData.status}, 跳过处理`);
    return;
  }

  const query = notifyData.query;
  console.log(`收到搜索请求: ${query}`);

  // 执行搜索
  const results = await performSearch(query);

  // 写入搜索结果
  const resultData = {
    query: query,
    status: 'done',
    results: results
  };

  if (writeJsonFile(RESULT_FILE, resultData)) {
    console.log(`搜索结果已写入: ${RESULT_FILE}`);
  }

  // 更新 request 文件状态
  const requestData = readJsonFile(REQUEST_FILE);
  if (requestData) {
    requestData.status = 'done';
    writeJsonFile(REQUEST_FILE, requestData);
    console.log(`请求状态已更新为: done`);
  }

  // 更新 notify 文件状态为 done
  notifyData.status = 'done';
  writeJsonFile(NOTIFY_FILE, notifyData);
  console.log(`Notify 文件状态已更新为: done`);
}

// 主循环
function startSearchProcessor() {
  console.log('后台搜索处理器已启动...');
  console.log(`检查间隔: 3秒`);
  console.log('---');

  // 立即执行一次检查
  processSearch();

  // 每 3 秒执行一次检查
  setInterval(() => {
    processSearch();
  }, 3000);
}

// 启动处理器
startSearchProcessor();
