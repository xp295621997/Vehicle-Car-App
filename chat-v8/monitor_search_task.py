#!/usr/bin/env python3
import json
import time
import os
import urllib.request
import urllib.error

NOTIFY_FILE = '/Users/mi/Desktop/Claude Code/Chatbox/chat UI/logs/search-notify.txt'
SEARCH_RESULT_FILE = '/Users/mi/Desktop/Claude Code/Chatbox/chat UI/public/search-result.json'
SEARCH_REQUEST_FILE = '/Users/mi/Desktop/Claude Code/Chatbox/chat UI/public/search-request.json'

def ensure_dir_exists(file_path):
    directory = os.path.dirname(file_path)
    if directory and not os.path.exists(directory):
        os.makedirs(directory, exist_ok=True)

def perform_search(query):
    print(f'[Search] Performing search for: {query}')
    results = []

    try:
        # Call MiniMax MCP proxy server
        req = urllib.request.Request(
            'http://localhost:3100/mcp/tools/mcp__MiniMax__web_search',
            data=json.dumps({'query': query}).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )

        with urllib.request.urlopen(req, timeout=30) as response:
            data = json.loads(response.read().decode('utf-8'))

            if 'organic' in data:
                results = [
                    {
                        'title': item.get('title', ''),
                        'body': item.get('snippet', ''),
                        'link': item.get('link', '')
                    }
                    for item in data['organic'][:10]
                ]

        # Write search results
        result_data = {
            'query': query,
            'status': 'done',
            'results': results
        }

        ensure_dir_exists(SEARCH_RESULT_FILE)
        with open(SEARCH_RESULT_FILE, 'w', encoding='utf-8') as f:
            json.dump(result_data, f, ensure_ascii=False, indent=2)
        print(f'[Search] Results written to {SEARCH_RESULT_FILE}')

        # Update search-request.json
        if os.path.exists(SEARCH_REQUEST_FILE):
            with open(SEARCH_REQUEST_FILE, 'r', encoding='utf-8') as f:
                request_data = json.load(f)

            request_data['status'] = 'done'
            request_data['results'] = results

            with open(SEARCH_REQUEST_FILE, 'w', encoding='utf-8') as f:
                json.dump(request_data, f, ensure_ascii=False, indent=2)
            print(f'[Search] Updated {SEARCH_REQUEST_FILE} status to done')

    except Exception as e:
        print(f'[Search] Error: {e}')

        # Write error result
        result_data = {
            'query': query,
            'status': 'done',
            'results': [],
            'error': str(e)
        }

        ensure_dir_exists(SEARCH_RESULT_FILE)
        with open(SEARCH_RESULT_FILE, 'w', encoding='utf-8') as f:
            json.dump(result_data, f, ensure_ascii=False, indent=2)

    return True

def check_file(last_content, last_modified):
    if not os.path.exists(NOTIFY_FILE):
        return last_content, last_modified, False

    stats = os.stat(NOTIFY_FILE)
    modified = stats.st_mtime

    if modified != last_modified:
        last_modified = modified
        content = open(NOTIFY_FILE, 'r', encoding='utf-8').read().strip()

        if content != last_content:
            last_content = content
            print('[Monitor] File changed')

            try:
                notify_data = json.loads(content)
                if notify_data.get('status') == 'pending' and notify_data.get('query'):
                    print(f'[Monitor] Detected pending, query: {notify_data["query"]}')
                    return last_content, last_modified, True
            except json.JSONDecodeError as e:
                print(f'[Monitor] Parse error: {e}')

    return last_content, last_modified, False

if __name__ == '__main__':
    print('[Monitor] Starting file monitor...')
    print(f'[Monitor] Watching: {NOTIFY_FILE}')
    print('[Monitor] Checking every 2 seconds')

    last_content = ''
    last_modified = 0
    is_processing = False

    while True:
        try:
            last_content, last_modified, should_search = check_file(last_content, last_modified)

            if should_search and not is_processing:
                # Read query from file
                with open(NOTIFY_FILE, 'r', encoding='utf-8') as f:
                    notify_data = json.load(f)
                    query = notify_data.get('query', '')

                if query:
                    is_processing = True
                    perform_search(query)
                    is_processing = False

            time.sleep(2)
        except KeyboardInterrupt:
            print('\n[Monitor] Stopped')
            break
        except Exception as e:
            print(f'[Monitor] Error: {e}')
            time.sleep(2)
