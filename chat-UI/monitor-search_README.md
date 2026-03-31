# Search Monitor Script

## How to Run

Run the following command in your terminal:

```bash
cd "/Users/mi/Desktop/Claude Code/Chatbox/chat UI"
node monitor-search.js
```

## How It Works

1. The script monitors `/Users/mi/Desktop/Claude Code/Chatbox/chat UI/logs/search-notify.txt` every 2 seconds
2. When the file contains `{"query": "...", "status": "pending"}`:
   - Reads the `query` value
   - Performs a web search (tries MiniMax MCP first, falls back to DuckDuckGo API)
   - Writes results to `/Users/mi/Desktop/Claude Code/Chatbox/chat UI/public/search-result.json`
   - Updates `/Users/mi/Desktop/Claude Code/Chatbox/chat UI/public/search-request.json` status to "done"

## File Formats

### search-notify.txt (input)
```json
{"query": "your search query", "status": "pending"}
```

### search-result.json (output)
```json
{
  "query": "your search query",
  "status": "done",
  "results": [
    {"title": "Result Title", "body": "Result snippet...", "link": "https://..."}
  ]
}
```

### search-request.json (output)
```json
{
  "query": "your search query",
  "status": "done",
  "results": [...]
}
```

## Files Created

- `/Users/mi/Desktop/Claude Code/Chatbox/chat UI/monitor-search.js` - Main monitoring script
- `/Users/mi/Desktop/Claude Code/Chatbox/chat UI/logs/search-notify.txt` - Input file (create with pending query)
- `/Users/mi/Desktop/Claude Code/Chatbox/chat UI/public/search-result.json` - Output search results
- `/Users/mi/Desktop/Claude Code/Chatbox/chat UI/public/search-request.json` - Status update file
