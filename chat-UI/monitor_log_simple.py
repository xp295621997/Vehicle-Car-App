#!/usr/bin/env python3
import json
import time
import re
import os
import sys

LOG_FILE = "/Users/mi/Desktop/Claude Code/Chatbox/chat UI/logs/realtime.log"
REQUEST_FILE = "/Users/mi/Desktop/Claude Code/Chatbox/chat UI/public/search-request.json"
RESULT_FILE = "/Users/mi/Desktop/Claude Code/Chatbox/chat UI/public/search-result.json"

def get_last_processed_query():
    """获取最近处理的搜索关键词"""
    try:
        with open(REQUEST_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data.get('query', '')
    except:
        return ''

def get_all_search_lines():
    """获取日志文件中所有搜索请求行"""
    try:
        with open(LOG_FILE, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            search_lines = []
            for line in lines:
                if '[搜索] 开始联网搜索:' in line:
                    search_lines.append(line.strip())
            return search_lines
    except:
        return []

def extract_search_query(line):
    """从日志行中提取搜索关键词"""
    pattern = r'\[搜索\] 开始联网搜索: (.+)'
    match = re.search(pattern, line)
    if match:
        return match.group(1).strip()
    return None

def format_results(search_result):
    """格式化搜索结果"""
    results = []
    if search_result and 'organic' in search_result:
        for item in search_result['organic']:
            results.append({
                'title': item.get('title', ''),
                'body': item.get('snippet', ''),
                'link': item.get('link', '')
            })
    return results

def write_result(query, status, results):
    """写入结果文件"""
    result_data = {
        'query': query,
        'status': status,
        'results': results
    }
    with open(RESULT_FILE, 'w', encoding='utf-8') as f:
        json.dump(result_data, f, ensure_ascii=False, indent=2)

    request_data = {
        'query': query,
        'status': status,
        'timestamp': int(time.time() * 1000),
        'results': results
    }
    with open(REQUEST_FILE, 'w', encoding='utf-8') as f:
        json.dump(request_data, f, ensure_ascii=False, indent=2)

def main():
    print("=" * 60)
    print("日志监控程序启动")
    print(f"日志文件: {LOG_FILE}")
    print(f"请求文件: {REQUEST_FILE}")
    print(f"结果文件: {RESULT_FILE}")
    print("=" * 60)

    # 记录所有已处理的搜索关键词
    processed_queries = set()

    # 初始加载已处理的查询
    last_processed = get_last_processed_query()
    if last_processed:
        processed_queries.add(last_processed)
        print(f"已加载最近处理的查询: {last_processed}")

    while True:
        try:
            search_lines = get_all_search_lines()

            for line in search_lines:
                query = extract_search_query(line)
                if query and query not in processed_queries:
                    print(f"\n{'='*60}")
                    print(f"新搜索请求发现: {query}")
                    print(f"{'='*60}")
                    # 输出特殊标记以便程序识别
                    print(f"NEW_SEARCH_REQUEST:{query}")
                    print(f"{'='*60}")

            time.sleep(2)

        except KeyboardInterrupt:
            print("\n\n监控已停止")
            break
        except Exception as e:
            print(f"错误: {e}")
            time.sleep(2)

if __name__ == "__main__":
    main()
