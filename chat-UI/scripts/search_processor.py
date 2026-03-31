#!/usr/bin/env python3
"""
搜索任务处理器 - 检查任务文件并执行搜索
"""
import json
import time
import os

TASK_FILE = "/Users/mi/Desktop/Claude Code/Chatbox/chat UI/logs/.search_task.json"
REQUEST_FILE = "/Users/mi/Desktop/Claude Code/Chatbox/chat UI/public/search-request.json"
RESULT_FILE = "/Users/mi/Desktop/Claude Code/Chatbox/chat UI/public/search-result.json"

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

def get_task():
    """获取搜索任务"""
    try:
        if os.path.exists(TASK_FILE):
            with open(TASK_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
    except:
        pass
    return None

def main():
    print("=" * 60)
    print("搜索任务处理器已启动")
    print("检查间隔: 2秒")
    print("按 Ctrl+C 停止")
    print("=" * 60)

    last_processed = ""

    while True:
        try:
            task = get_task()

            if task:
                query = task.get("query", "")
                task_str = f"{query}:{task.get('timestamp', 0)}"

                if query and task_str != last_processed:
                    print(f"\n[任务] 收到搜索请求: {query}")
                    print("[处理] 请在 Claude Code 中执行搜索...")

                    # 更新状态为 processing
                    update_request_status("processing")

                    # 这里需要外部调用 mcp__MiniMax__web_search
                    # 然后调用 write_search_result 和 update_request_status("done")

                    last_processed = task_str
                    print("[提示] 等待搜索结果...")

            time.sleep(2)

        except KeyboardInterrupt:
            print("\n\n处理器已停止")
            break
        except Exception as e:
            print(f"[Error] {e}")
            time.sleep(2)

if __name__ == "__main__":
    main()
