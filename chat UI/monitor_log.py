#!/usr/bin/env python3
import json
import time
import re
import os

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

def get_last_log_line():
    """获取日志文件的最后一行"""
    try:
        with open(LOG_FILE, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            if lines:
                return lines[-1].strip()
    except:
        pass
    return ''

def extract_search_query(line):
    """从日志行中提取搜索关键词"""
    pattern = r'\[搜索\] 开始联网搜索: (.+)'
    match = re.search(pattern, line)
    if match:
        return match.group(1).strip()
    return None

def perform_search(query):
    """使用 MiniMax web search 进行搜索"""
    from mcp__MiniMax__web_search import search as mini_max_search
    result = mini_max_search(query=query)
    return result

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

    print(f"已处理搜索请求: {query}")
    print(f"找到 {len(results)} 条结果")

def main():
    print("开始监控日志文件...")
    print(f"日志文件: {LOG_FILE}")
    print(f"请求文件: {REQUEST_FILE}")
    print(f"结果文件: {RESULT_FILE}")
    print("-" * 50)

    last_processed = get_last_processed_query()
    print(f"最近处理的查询: {last_processed}")

    while True:
        try:
            last_line = get_last_log_line()
            if last_line:
                query = extract_search_query(last_line)
                if query and query != last_processed:
                    print(f"\n发现新的搜索请求: {query}")
                    print("正在搜索...")

                    search_result = perform_search(query)
                    results = format_results(search_result)

                    write_result(query, 'done', results)
                    last_processed = query

            time.sleep(3)  # 每3秒检查一次
        except KeyboardInterrupt:
            print("\n监控已停止")
            break
        except Exception as e:
            print(f"错误: {e}")
            time.sleep(3)

if __name__ == "__main__":
    main()
