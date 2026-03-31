#!/usr/bin/env python3
"""
文件监听器 - 监听 search-notify.txt 文件
当文件内容发生变化且包含 "pending" 状态时，执行搜索操作
"""
import json
import time
import os
import hashlib
import subprocess
import sys

# 文件路径配置
NOTIFY_FILE = "/Users/mi/Desktop/Claude Code/Chatbox/chat UI/logs/search-notify.txt"
REQUEST_FILE = "/Users/mi/Desktop/Claude Code/Chatbox/chat UI/public/search-request.json"
RESULT_FILE = "/Users/mi/Desktop/Claude Code/Chatbox/chat UI/public/search-result.json"
TASK_FILE = "/Users/mi/Desktop/Claude Code/Chatbox/chat UI/logs/.search_task.json"

def get_file_content(filepath):
    """获取文件内容"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return f.read().strip()
    except:
        return None

def read_notify_file():
    """读取通知文件"""
    try:
        content = get_file_content(NOTIFY_FILE)
        if content:
            return json.loads(content)
    except Exception as e:
        print(f"[Error] 读取文件失败: {e}")
    return None

def update_request_status(status):
    """更新 search-request.json 状态"""
    try:
        if os.path.exists(REQUEST_FILE):
            with open(REQUEST_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
        else:
            data = {"query": "", "status": "idle"}

        data["status"] = status

        with open(REQUEST_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        print(f"[OK] 更新请求状态: {status}")
        return True
    except Exception as e:
        print(f"[Error] 更新状态失败: {e}")
        return False

def write_search_result(query, results):
    """写入搜索结果"""
    try:
        result_data = {
            "query": query,
            "status": "done",
            "results": results
        }

        with open(RESULT_FILE, 'w', encoding='utf-8') as f:
            json.dump(result_data, f, ensure_ascii=False, indent=4)

        print(f"[OK] 已写入 {len(results)} 条结果")
        return True
    except Exception as e:
        print(f"[Error] 写入结果失败: {e}")
        return False

def save_task(query):
    """保存搜索任务"""
    try:
        task = {"query": query, "timestamp": time.time()}
        with open(TASK_FILE, 'w', encoding='utf-8') as f:
            json.dump(task, f, ensure_ascii=False)
        return True
    except:
        return False

def get_last_task():
    """获取最后保存的任务"""
    try:
        if os.path.exists(TASK_FILE):
            with open(TASK_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
    except:
        pass
    return None

def main():
    print("=" * 60)
    print("文件监听器已启动")
    print(f"监听文件: {NOTIFY_FILE}")
    print("检查间隔: 2秒")
    print("按 Ctrl+C 停止")
    print("=" * 60)

    last_processed_query = ""
    last_task = get_last_task()
    if last_task:
        last_processed_query = last_task.get("query", "")

    while True:
        try:
            data = read_notify_file()

            if data:
                status = data.get("status", "")
                query = data.get("query", "").strip()

                # 检查是否是 pending 状态且有新的 query
                if status == "pending" and query and query != last_processed_query:
                    print(f"\n{'='*60}")
                    print(f"[检测] 发现 pending 状态!")
                    print(f"[查询] {query}")
                    print(f"{'='*60}")

                    # 保存任务
                    save_task(query)
                    last_processed_query = query

                    # 通知外部进行处理
                    print("\n[提示] 已创建搜索任务")
                    print("[提示] 等待外部搜索进程处理...")

            time.sleep(2)

        except KeyboardInterrupt:
            print("\n\n监听器已停止")
            break
        except Exception as e:
            print(f"[Error] {e}")
            time.sleep(2)

if __name__ == "__main__":
    main()
