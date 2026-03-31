// 搜索轮询服务
// 前端写入搜索请求 -> 后台检测到请求 -> 调用 MCP 搜索 -> 写入结果 -> 前端读取结果

import fs from 'fs';
import path from 'path';

const REQUEST_FILE = './public/search-request.json';
const RESULT_FILE = './public/search-result.json';

// 初始化结果文件
if (!fs.existsSync(RESULT_FILE)) {
  fs.writeFileSync(RESULT_FILE, JSON.stringify({ query: '', results: [], status: 'idle' }));
}

console.log('🔍 搜索轮询服务已启动...');
console.log('📁 监控文件:', REQUEST_FILE);

let lastRequest = '';

setInterval(() => {
  try {
    const requestData = JSON.parse(fs.readFileSync(REQUEST_FILE, 'utf-8'));
    const query = requestData.query;

    // 如果有新的搜索请求
    if (query && query !== lastRequest) {
      console.log('📥 收到搜索请求:', query);
      lastRequest = query;

      // 更新状态为搜索中
      fs.writeFileSync(RESULT_FILE, JSON.stringify({
        query,
        results: [],
        status: 'searching'
      }));

      // 注意：这里不能直接调用 MCP，需要在 Claude Code 会话中手动调用
      // 用户可以在 Claude Code 对话中输入：帮我搜索"xxx"
      console.log('⏳ 请在 Claude Code 对话中输入搜索命令...');
    }
  } catch (e) {
    // 忽略文件读取错误
  }
}, 2000);

console.log('✅ 服务运行中，每2秒检查一次搜索请求');
