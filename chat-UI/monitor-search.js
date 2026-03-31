#!/usr/bin/env node
/**
 * 搜索请求监控脚本 - Node.js 版本
 * 持续监控日志文件，检测新的搜索请求
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = '/Users/mi/Desktop/Claude Code/Chatbox/chat UI/logs/realtime.log';
const SEARCH_REQUEST_FILE = '/Users/mi/Desktop/Claude Code/Chatbox/chat UI/public/search-request.json';
const SEARCH_RESULT_FILE = '/Users/mi/Desktop/Claude Code/Chatbox/chat UI/public/search-result.json';
const PENDING_FILE = '/Users/mi/Desktop/Claude Code/Chatbox/chat UI/logs/.pending_search.txt';
const PROCESSED_FILE = '/Users/mi/Desktop/Claude Code/Chatbox/chat UI/logs/.processed_queries.txt';

let lastPosition = 0;
const processedQueries = new Set();

// 加载已处理的查询
function loadProcessedQueries() {
    try {
        if (fs.existsSync(PROCESSED_FILE)) {
            const data = fs.readFileSync(PROCESSED_FILE, 'utf-8');
            data.split('\n').forEach(q => {
                if (q.trim()) processedQueries.add(q.trim());
            });
        }
    } catch (e) {
        console.error('加载已处理查询失败:', e);
    }
}

// 保存已处理的查询
function saveProcessedQuery(query) {
    try {
        fs.appendFileSync(PROCESSED_FILE, query + '\n');
        processedQueries.add(query);
    } catch (e) {
        console.error('保存查询失败:', e);
    }
}

// 检查日志中的新搜索请求
function checkLogForNewSearch() {
    try {
        const stats = fs.statSync(LOG_FILE);
        const fileSize = stats.size;

        // 文件被轮转从头开始
        if (fileSize < lastPosition) {
            lastPosition = 0;
        }

        if (fileSize === lastPosition) {
            return null;
        }

        const fd = fs.openSync(LOG_FILE, 'r');
        const buffer = Buffer.alloc(fileSize - lastPosition);
        fs.readSync(fd, buffer, 0, buffer.length, lastPosition);
        fs.closeSync(fd);

        const newContent = buffer.toString('utf-8');
        lastPosition = fileSize;

        // 查找搜索请求
        const pattern = /\[搜索\]\s*开始联网搜索:\s*(.+)/g;
        let match;
        let latestQuery = null;

        while ((match = pattern.exec(newContent)) !== null) {
            const query = match[1].trim();
            if (query && !processedQueries.has(query)) {
                latestQuery = query;
            }
        }

        return latestQuery;

    } catch (e) {
        console.error('读取日志错误:', e.message);
    }

    return null;
}

// 更新 search-request.json 状态
function updateSearchRequestStatus(query, status) {
    try {
        const data = {
            query: query,
            status: status,
            timestamp: Date.now()
        };
        fs.writeFileSync(SEARCH_REQUEST_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
        console.error('更新状态失败:', e);
    }
}

// 主函数
async function main() {
    console.log('==============================================');
    console.log('搜索请求监控服务已启动');
    console.log('监控文件:', LOG_FILE);
    console.log('结果文件:', SEARCH_RESULT_FILE);
    console.log('==============================================');
    console.log('等待新的搜索请求...');
    console.log('');

    // 加载已处理的查询
    loadProcessedQueries();
    console.log(`已加载 ${processedQueries.size} 个已处理的搜索请求`);

    // 初始化位置
    if (fs.existsSync(LOG_FILE)) {
        const stats = fs.statSync(LOG_FILE);
        lastPosition = stats.size;
    }

    // 清除待处理文件
    if (fs.existsSync(PENDING_FILE)) {
        fs.unlinkSync(PENDING_FILE);
    }

    // 检查是否有待处理的搜索（从 search-request.json）
    try {
        if (fs.existsSync(SEARCH_REQUEST_FILE)) {
            const data = JSON.parse(fs.readFileSync(SEARCH_REQUEST_FILE, 'utf-8'));
            if (data.status !== 'done' && data.query) {
                console.log('发现待处理的搜索请求:', data.query);
                fs.writeFileSync(PENDING_FILE, data.query, 'utf-8');
            }
        }
    } catch (e) {
        console.error('检查待处理请求失败:', e);
    }

    while (true) {
        try {
            // 检查日志中的新搜索
            const query = checkLogForNewSearch();

            if (query && !processedQueries.has(query)) {
                console.log('==============================================');
                console.log('检测到新的搜索请求:', query);
                console.log('==============================================');

                // 将查询写入待处理文件
                fs.writeFileSync(PENDING_FILE, query, 'utf-8');

                // 更新状态为 pending
                updateSearchRequestStatus(query, 'pending');

                console.log('已将搜索请求写入待处理文件');
                console.log('状态已更新为: pending');
                console.log('');
                console.log('请在 Claude Code 中执行以下操作:');
                console.log('1. 读取待处理文件内容');
                console.log('2. 使用 mcp__MiniMax__web_search 工具执行搜索');
                console.log('3. 将结果写入 search-result.json');
                console.log('');
            }

            // 检查 search-result.json 是否有完成的结果
            try {
                if (fs.existsSync(SEARCH_RESULT_FILE)) {
                    const resultData = JSON.parse(fs.readFileSync(SEARCH_RESULT_FILE, 'utf-8'));
                    if (resultData.status === 'done' && resultData.query) {
                        // 检查这个查询是否已经被处理
                        if (!processedQueries.has(resultData.query)) {
                            // 检查 search-request.json 是否也是 done
                            const reqData = JSON.parse(fs.readFileSync(SEARCH_REQUEST_FILE, 'utf-8'));
                            if (reqData.status === 'done') {
                                saveProcessedQuery(resultData.query);
                                console.log('搜索已完成并保存:', resultData.query);
                            }
                        }
                    }
                }
            } catch (e) {
                // 忽略检查错误
            }

        } catch (e) {
            console.error('处理异常:', e);
        }

        // 等待3秒
        await new Promise(resolve => setTimeout(resolve, 3000));
    }
}

main().catch(console.error);
