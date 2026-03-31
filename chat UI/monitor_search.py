#!/usr/bin/env python3
"""
搜索请求监控脚本 - 直接通过 MCP 工具执行搜索
持续监控日志文件，检测新的搜索请求，执行搜索并写入结果
"""

import os
import re
import time
import json
import subprocess
import sys

# 配置路径
LOG_FILE = "/Users/mi/Desktop/Claude Code/Chatbox/chat UI/logs/realtime.log"
SEARCH_REQUEST_FILE = "/Users/mi/Desktop/Claude Code/Chatbox/chat UI/public/search-request.json"
SEARCH_RESULT_FILE = "/Users/mi/Desktop/Claude Code/Chatbox/chat UI/public/search-result.json"
PENDING_SEARCH_FILE = "/Users/mi/Desktop/Claude Code/Chatbox/chat UI/logs/.pending_search.txt"

# 用于匹配搜索请求的正则表达式
SEARCH_PATTERN = re.compile(r'\[搜索\] 开始联网搜索: (.+)')

# 记录已处理的搜索请求
processed_queries = set()

# 记录日志文件位置
last_position = 0


def load_processed_queries():
    """加载已处理的搜索请求"""
    if os.path.exists(SEARCH_RESULT_FILE):
        try:
            with open(SEARCH_RESULT_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if 'query' in data:
                    processed_queries.add(data['query'])
        except:
            pass


def check_pending_search():
    """检查是否有待处理的搜索（通过临时文件）"""
    try:
        if os.path.exists(PENDING_SEARCH_FILE):
            with open(PENDING_SEARCH_FILE, 'r', encoding='utf-8') as f:
                query = f.read().strip()
            if query and query not in processed_queries:
                return query
    except:
        pass
    return None


def check_log_for_new_search():
    """检查日志文件中的新搜索请求"""
    global last_position

    try:
        file_size = os.path.getsize(LOG_FILE)

        # 文件被轮转从头开始
        if file_size < last_position:
            last_position = 0

        with open(LOG_FILE, 'r', encoding='utf-8') as f:
            f.seek(last_position)
            new_content = f.read()
            last_position = f.tell()

        if not new_content:
            return None

        # 查找搜索请求
        matches = SEARCH_PATTERN.findall(new_content)
        if matches:
            # 返回最新的搜索请求
            query = matches[-1].strip()
            if query and query not in processed_queries:
                return query

    except Exception as e:
        print(f"读取日志错误: {e}")

    return None


def save_search_results(query, search_data):
    """保存搜索结果"""
    formatted_results = []

    if search_data and 'organic' in search_data:
        for item in search_data.get('organic', [])[:10]:
            formatted_results.append({
                'title': item.get('title', ''),
                'body': item.get('snippet', ''),
                'link': item.get('link', '')
            })

    output = {
        'query': query,
        'status': 'done',
        'results': formatted_results
    }

    # 写入 search-result.json
    with open(SEARCH_RESULT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    # 写入 search-request.json
    with open(SEARCH_REQUEST_FILE, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"结果已保存到 {SEARCH_RESULT_FILE} 和 {SEARCH_REQUEST_FILE}")


def main():
    """主函数"""
    global last_position

    print("=" * 60)
    print("搜索请求监控服务已启动")
    print(f"监控文件: {LOG_FILE}")
    print(f"结果文件: {SEARCH_RESULT_FILE}")
    print("=" * 60)

    # 加载已处理的搜索请求
    load_processed_queries()
    print(f"已加载 {len(processed_queries)} 个已处理的搜索请求")

    # 初始化位置
    if os.path.exists(LOG_FILE):
        last_position = os.path.getsize(LOG_FILE)

    # 清除之前的待处理搜索文件
    if os.path.exists(PENDING_SEARCH_FILE):
        os.remove(PENDING_SEARCH_FILE)

    try:
        while True:
            # 方法1: 检查临时文件（通过外部 MCP 调用）
            query = check_pending_search()

            if not query:
                # 方法2: 直接检查日志
                query = check_log_for_new_search()

            if query and query not in processed_queries:
                print(f"\n{'='*60}")
                print(f"检测到新的搜索请求: {query}")
                print(f"{'='*60}")

                # 写入待处理搜索标记文件
                with open(PENDING_SEARCH_FILE, 'w', encoding='utf-8') as f:
                    f.write(query)

                # 先写入 pending 状态
                pending_data = {
                    'query': query,
                    'status': 'pending'
                }
                with open(SEARCH_REQUEST_FILE, 'w', encoding='utf-8') as f:
                    json.dump(pending_data, f, ensure_ascii=False, indent=2)

                print(f"已将搜索请求写入待处理文件: {PENDING_SEARCH_FILE}")
                print(f"状态已更新为: pending")

            # 等待几秒再检查
            time.sleep(3)

    except KeyboardInterrupt:
        print("\n监控服务已停止")


if __name__ == '__main__':
    main()
