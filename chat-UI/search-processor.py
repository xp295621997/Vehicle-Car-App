#!/usr/bin/env python3
import json
import time
import os
from datetime import datetime

# 文件路径配置
NOTIFY_FILE = '/Users/mi/Desktop/Claude Code/Chatbox/chat UI/logs/search-notify.txt'
RESULT_FILE = '/Users/mi/Desktop/Claude Code/Chatbox/chat UI/public/search-result.json'
REQUEST_FILE = '/Users/mi/Desktop/Claude Code/Chatbox/chat UI/public/search-request.json'

def read_json_file(file_path):
    """读取并解析 JSON 文件"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"文件不存在: {file_path}")
        return None
    except json.JSONDecodeError as e:
        print(f"JSON 解析错误: {file_path}, {e}")
        return None
    except Exception as e:
        print(f"读取文件失败: {file_path}, {e}")
        return None

def write_json_file(file_path, data):
    """写入 JSON 文件"""
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"写入文件失败: {file_path}, {e}")
        return False

def perform_search(query):
    """执行搜索并返回结果"""
    try:
        # 使用 mcp__MiniMax__web_search 工具
        result = mcp__MiniMax__web_search(query=query)

        results = []
        if result and 'organic' in result:
            for item in result['organic']:
                results.append({
                    'title': item.get('title', ''),
                    'body': item.get('snippet', ''),
                    'link': item.get('link', '')
                })

        return results
    except Exception as e:
        print(f"搜索失败: {e}")
        return []

def process_search():
    """处理搜索请求"""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f"[{timestamp}] 检查搜索请求...")

    # 读取 notify 文件
    notify_data = read_json_file(NOTIFY_FILE)
    if not notify_data:
        return

    # 检查状态是否为 pending
    status = notify_data.get('status', '')
    if status != 'pending':
        print(f"状态: {status}, 跳过处理")
        return

    query = notify_data.get('query', '')
    if not query:
        print("警告: query 为空")
        return

    print(f"收到搜索请求: {query}")

    # 执行搜索
    results = perform_search(query)

    # 写入搜索结果
    result_data = {
        'query': query,
        'status': 'done',
        'results': results
    }

    if write_json_file(RESULT_FILE, result_data):
        print(f"搜索结果已写入: {RESULT_FILE}")
        print(f"找到 {len(results)} 条结果")

    # 更新 request 文件状态
    request_data = read_json_file(REQUEST_FILE)
    if request_data:
        request_data['status'] = 'done'
        write_json_file(REQUEST_FILE, request_data)
        print(f"请求状态已更新为: done")

    # 更新 notify 文件状态为 done
    notify_data['status'] = 'done'
    write_json_file(NOTIFY_FILE, notify_data)
    print(f"Notify 文件状态已更新为: done")

def main():
    """主循环"""
    print("=" * 50)
    print("后台搜索处理器已启动...")
    print(f"检查间隔: 3秒")
    print("按 Ctrl+C 停止")
    print("=" * 50)

    # 立即执行一次检查
    process_search()

    # 每 3 秒执行一次检查
    while True:
        time.sleep(3)
        process_search()

if __name__ == '__main__':
    main()
