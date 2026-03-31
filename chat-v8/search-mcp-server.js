// MCP 搜索轮询服务
// 前端写入搜索请求 -> 后台自动调用 MCP 搜索 -> 写入结果 -> 前端读取

const fs = require('fs');
const path = require('path');

const REQUEST_FILE = path.join(__dirname, 'public', 'search-request.json');
const RESULT_FILE = path.join(__dirname, 'public', 'search-result.json');

// 初始化文件
if (!fs.existsSync(RESULT_FILE)) {
  fs.writeFileSync(RESULT_FILE, JSON.stringify({
    query: '',
    status: 'idle',
    results: []
  }));
}

// 读取上次的请求
let lastRequest = '';
try {
  const data = JSON.parse(fs.readFileSync(RESULT_FILE, 'utf-8'));
  lastRequest = data.query || '';
} catch (e) {}

console.log('🔍 MCP 搜索轮询服务已启动...');
console.log('📁 监听文件:', REQUEST_FILE);
console.log('');
console.log('ℹ️  当用户在语音对话页面发起联网搜索时：');
console.log('   1. 前端会写入搜索请求到这个文件');
console.log('   2. 后台自动调用 MCP MiniMax web search');
console.log('   3. 结果写入 public/search-result.json');
console.log('   4. 前端轮询读取结果');
console.log('');
console.log('✅ 服务运行中...');
