#!/usr/bin/env node

/**
 * 每日总结自动生成脚本
 * 使用方法: node auto-summary.cjs
 * 或设置cron: 0 21 * * * cd /path/to/chat-ui && node auto-summary.cjs
 *
 * 功能：
 * 1. 支持 Claude Code CLI 和 chat UI 的对话历史
 * 2. 清理对话噪声（系统命令、路径等）
 * 3. 生成结构化模板，方便手动填写
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const SUMMARY_DIR = path.join(__dirname, 'docs/每日总结');
const LOG_DIR = path.join(__dirname, 'logs');
const CONVERSATION_LOG = path.join(LOG_DIR, 'conversations');

const SUMMARY_TEMPLATE = `---
generated: {date}
---

# 每日开发总结

## {dateStr}

### 一、功能更新

**请手动填写：**
1.

### 二、问题修复

**请手动填写：**
1.

### 三、技能学习

**请手动填写：**
1.

### 四、API/接口

**请手动填写：**
1.

### 五、今日对话记录（{count}条）

> 以下是对话记录摘要，仅供参考：

{conversations}

---

*💡 提示：请根据上方对话记录，手动填写功能更新、问题修复等详细内容。*
*参考格式见 /Users/mi/Desktop/Claude Code/Chatbox/chat UI/docs/每日总结/2026-03-23.md*
`;

// Claude Code CLI 对话历史目录
function getCliConversationDirs() {
  const cwd = process.cwd();
  const cliBase = path.join(os.homedir(), '.claude', 'projects');
  const dirs = [];

  let searchDir = cwd;
  for (let i = 0; i < 3; i++) {
    const projectPath = searchDir.replace(/[^\w-]/g, '-');
    const cliDir = path.join(cliBase, projectPath);
    if (fs.existsSync(cliDir)) {
      dirs.push(cliDir);
    }
    const parent = path.dirname(searchDir);
    if (parent === searchDir) break;
    searchDir = parent;
  }

  return dirs;
}

// 清理对话内容，去除噪声
function cleanConversation(conv) {
  if (!conv || typeof conv !== 'string') return null;

  // 去除系统命令和标记
  let cleaned = conv
    .replace(/<local-command-caveat>[\s\S]*?<\/local-command-caveat>/g, '')
    .replace(/<command-name>.*?<\/command-name>/g, '')
    .replace(/<command-message>.*?<\/command-message>/g, '')
    .replace(/<command-args>.*?<\/command-args>/g, '')
    .replace(/<local-command-stdout>[\s\S]*?<\/local-command-stdout>/g, '')
    .replace(/This session is being continued from a previous conversation.*/gi, '')
    .replace(/^[\s\n]+|[\s\n]+$/g, '')
    .replace(/\n+/g, ' ')
    .trim();

  // 简化路径
  cleaned = cleaned.replace(/\/Users\/[^\s]*?(?=\s|$)/g, '...');
  cleaned = cleaned.replace(/'[^']*?\/[^\s]*?'/g, '...');
  cleaned = cleaned.replace(/\"[^\"]*?\/[^\s]*?\"/g, '...');

  // 去除空内容
  if (!cleaned || cleaned.length < 3) {
    return null;
  }

  return cleaned;
}

// 从 CLI JSONL 提取对话
function extractCliConversationsForDate(cliDirs, dateStr) {
  const seen = new Set();
  const allConversations = [];

  for (const cliDir of cliDirs) {
    const files = fs.readdirSync(cliDir);
    for (const file of files) {
      if (!file.endsWith('.jsonl')) continue;
      const filePath = path.join(cliDir, file);
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const entry = JSON.parse(line);
            if (entry.type === 'user' && entry.timestamp && entry.timestamp.startsWith(dateStr)) {
              const msg = entry.message;
              if (msg && msg.content && typeof msg.content === 'string') {
                const cleaned = cleanConversation(msg.content);
                if (cleaned && !seen.has(cleaned)) {
                  seen.add(cleaned);
                  allConversations.push(cleaned);
                }
              }
            }
          } catch (e) {}
        }
      } catch (e) {}
    }
  }

  return allConversations;
}

// 获取已有总结的日期
function getExistingSummaryDates() {
  if (!fs.existsSync(SUMMARY_DIR)) {
    return new Set();
  }
  const files = fs.readdirSync(SUMMARY_DIR);
  return new Set(
    files
      .filter(f => f.endsWith('.md'))
      .map(f => f.replace('.md', ''))
  );
}

// 获取有对话记录的日期
function getConversationDates() {
  const dates = new Set();

  // chat UI 对话
  if (fs.existsSync(CONVERSATION_LOG)) {
    const files = fs.readdirSync(CONVERSATION_LOG);
    for (const file of files) {
      if (file.endsWith('.json')) {
        dates.add(file.replace('.json', ''));
      }
    }
  }

  // CLI 对话
  const cliDirs = getCliConversationDirs();
  for (const cliDir of cliDirs) {
    const files = fs.readdirSync(cliDir);
    for (const file of files) {
      if (!file.endsWith('.jsonl')) continue;
      const filePath = path.join(cliDir, file);
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const entry = JSON.parse(line);
            if (entry.timestamp && entry.type === 'user') {
              dates.add(entry.timestamp.split('T')[0]);
            }
          } catch (e) {}
        }
      } catch (e) {}
    }
  }

  return dates;
}

// 提取指定日期的对话
function extractConversationsForDate(dateStr) {
  const allConversations = [];
  const seen = new Set();

  // chat UI
  try {
    const conversationFile = path.join(CONVERSATION_LOG, `${dateStr}.json`);
    if (fs.existsSync(conversationFile)) {
      const data = fs.readFileSync(conversationFile, 'utf-8');
      const conversations = JSON.parse(data);
      for (const c of conversations) {
        if (c.userQuery) {
          const cleaned = cleanConversation(c.userQuery);
          if (cleaned && !seen.has(cleaned)) {
            seen.add(cleaned);
            allConversations.push(cleaned);
          }
        }
      }
    }
  } catch (e) {}

  // CLI
  const cliDirs = getCliConversationDirs();
  for (const cliDir of cliDirs) {
    try {
      const cliConvs = extractCliConversationsForDate([cliDir], dateStr);
      for (const c of cliConvs) {
        if (!seen.has(c)) {
          seen.add(c);
          allConversations.push(c);
        }
      }
    } catch (e) {}
  }

  return allConversations;
}

function parseDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function formatDateStr(date) {
  return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
}

function formatConversations(conversations) {
  if (conversations.length === 0) {
    return '（无对话记录）';
  }

  // 按类型分组（简化显示）
  const lines = conversations.slice(0, 30).map((c, i) => {
    // 截断过长内容
    const truncated = c.length > 100 ? c.substring(0, 100) + '...' : c;
    return `${i + 1}. ${truncated}`;
  });

  return lines.join('\n');
}

// 主流程
async function main() {
  const today = new Date();
  const todayStr = formatDate(today);

  const existingSummaries = getExistingSummaryDates();
  const conversationDates = getConversationDates();

  // 合并
  const allPossibleDates = new Set([...conversationDates, ...existingSummaries]);

  // 找出需要生成的日期
  const datesToGenerate = [];
  for (const dateStr of allPossibleDates) {
    if (dateStr === todayStr) continue;

    const date = parseDate(dateStr);
    const daysDiff = Math.floor((today - date) / (1000 * 60 * 60 * 24));
    if (daysDiff > 14) continue;

    if (conversationDates.has(dateStr) && !existingSummaries.has(dateStr)) {
      datesToGenerate.push(dateStr);
    }
  }

  datesToGenerate.sort();

  console.log(`📊 已有总结: ${existingSummaries.size} 个`);
  console.log(`📊 有对话记录: ${conversationDates.size} 个`);
  console.log(`📊 需要补全: ${datesToGenerate.length} 个`);

  if (datesToGenerate.length === 0) {
    console.log('✅ 所有日期都已生成总结，无需补全');
    return;
  }

  if (!fs.existsSync(SUMMARY_DIR)) {
    fs.mkdirSync(SUMMARY_DIR, { recursive: true });
  }

  for (const dateStr of datesToGenerate) {
    const date = parseDate(dateStr);
    const dateFileStr = formatDateStr(date);
    const todayFile = path.join(SUMMARY_DIR, `${dateStr}.md`);

    console.log(`📝 生成 ${dateFileStr} 总结...`);

    const conversations = extractConversationsForDate(dateStr);
    console.log(`📁 读取到 ${conversations.length} 条对话`);

    // 生成模板
    const content = SUMMARY_TEMPLATE
      .replace('{date}', new Date().toISOString())
      .replace('{dateStr}', dateFileStr)
      .replace('{count}', conversations.length.toString())
      .replace('{conversations}', formatConversations(conversations));

    fs.writeFileSync(todayFile, content, 'utf-8');
    console.log(`✅ 已生成: ${todayFile}`);
  }
}

main().catch(console.error);
