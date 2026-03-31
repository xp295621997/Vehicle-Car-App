#!/bin/bash

# 监控日志文件并处理搜索请求的脚本
# 此脚本会将检测到的新搜索请求写入临时文件，供外部 MCP 工具处理

LOG_FILE="/Users/mi/Desktop/Claude Code/Chatbox/chat UI/logs/realtime.log"
SEARCH_REQUEST_FILE="/Users/mi/Desktop/Claude Code/Chatbox/chat UI/public/search-request.json"
SEARCH_RESULT_FILE="/Users/mi/Desktop/Claude Code/Chatbox/chat UI/public/search-result.json"
PENDING_FILE="/Users/mi/Desktop/Claude Code/Chatbox/chat UI/logs/.pending_search.txt"
PROCESSED_FILE="/Users/mi/Desktop/Claude Code/Chatbox/chat UI/logs/.processed_queries.txt"

# 记录上一次处理的搜索请求位置
LAST_LINE=0

# 加载已处理的查询
if [ -f "$PROCESSED_FILE" ]; then
    echo "已加载已处理的查询"
fi

echo "=============================================="
echo "搜索请求监控服务已启动"
echo "监控文件: $LOG_FILE"
echo "结果文件: $SEARCH_RESULT_FILE"
echo "=============================================="
echo "等待新的搜索请求..."
echo ""

while true; do
    # 获取当前日志文件总行数
    TOTAL_LINES=$(wc -l < "$LOG_FILE")

    # 如果有新的行
    if [ "$TOTAL_LINES" -gt "$LAST_LINE" ] || [ "$LAST_LINE" -eq 0 ]; then
        # 读取新增的内容
        NEW_LINES=$(sed -n "$((LAST_LINE + 1)),${TOTAL_LINES}p" "$LOG_FILE")

        # 查找搜索请求
        QUERY=$(echo "$NEW_LINES" | grep -oP '\[搜索\] 开始联网搜索: \K(.+)' | tail -1)

        if [ -n "$QUERY" ]; then
            # 检查是否已处理
            if [ ! -f "$PROCESSED_FILE" ] || ! grep -q "^$QUERY$" "$PROCESSED_FILE" 2>/dev/null; then
                echo "=============================================="
                echo "检测到新的搜索请求: $QUERY"
                echo "=============================================="

                # 将查询写入待处理文件
                echo "$QUERY" > "$PENDING_FILE"

                # 更新 search-request.json 为 pending 状态
                python3 << PYEOF
import json
data = {
    "query": "$QUERY",
    "status": "pending"
}
with open("$SEARCH_REQUEST_FILE", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
PYEOF

                echo "已将搜索请求写入待处理文件: $PENDING_FILE"
                echo "状态已更新为: pending"
                echo ""
            fi
        fi

        LAST_LINE=$TOTAL_LINES
    fi

    # 检查 search-request.json 是否有待处理的请求
    if [ -f "$SEARCH_REQUEST_FILE" ]; then
        STATUS=$(python3 -c "import json; data=json.load(open('$SEARCH_REQUEST_FILE')); print(data.get('status',''))" 2>/dev/null)
        if [ "$STATUS" = "pending" ]; then
            # 检查是否有结果文件
            if [ -f "$SEARCH_RESULT_FILE" ]; then
                RESULT_STATUS=$(python3 -c "import json; data=json.load(open('$SEARCH_RESULT_FILE')); print(data.get('status',''))" 2>/dev/null)
                if [ "$RESULT_STATUS" = "done" ]; then
                    # 结果已生成，标记为已处理
                    QUERY=$(python3 -c "import json; data=json.load(open('$SEARCH_REQUEST_FILE')); print(data.get('query',''))" 2>/dev/null)
                    if [ -n "$QUERY" ]; then
                        echo "$QUERY" >> "$PROCESSED_FILE"
                        echo "搜索已完成: $QUERY"
                    fi
                fi
            fi
        fi
    fi

    # 等待3秒
    sleep 3
done
