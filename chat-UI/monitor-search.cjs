const fs = require('fs');
const path = require('path');

const NOTIFY_FILE = '/Users/mi/Desktop/Claude Code/Chatbox/chat UI/logs/search-notify.txt';
const SEARCH_RESULT_FILE = '/Users/mi/Desktop/Claude Code/Chatbox/chat UI/public/search-result.json';
const SEARCH_REQUEST_FILE = '/Users/mi/Desktop/Claude Code/Chatbox/chat UI/public/search-request.json';

// Store last known file content to detect changes
let lastContent = '';
let lastModified = 0;
let isProcessing = false;

function ensureDirExists(filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

async function performSearch(query) {
    console.log(`[Search] Performing search for: ${query}`);

    try {
        // Use fetch to call a search API (MiniMax web search via local MCP proxy or fallback to duckduckgo)
        let results = [];

        try {
            // Try MiniMax MCP web search first
            const response = await fetch('http://localhost:3100/mcp/tools/mcp__MiniMax__web_search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: query
                })
            });

            const data = await response.json();
            if (data.organic) {
                results = data.organic.map(item => ({
                    title: item.title || '',
                    body: item.snippet || '',
                    link: item.link || ''
                }));
            }
        } catch (mcpError) {
            console.log('[Search] MCP not available, trying DuckDuckGo...');

            // Fallback to DuckDuckGo Instant Answer API
            try {
                const ddgResponse = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`);
                const ddgData = await ddgResponse.json();

                if (ddgData.RelatedTopics) {
                    results = ddgData.RelatedTopics.slice(0, 10).map(item => ({
                        title: item.Text || '',
                        body: item.Text || '',
                        link: item.FirstURL || ''
                    }));
                }

                if (ddgData.AbstractText) {
                    results.unshift({
                        title: ddgData.Heading || query,
                        body: ddgData.AbstractText || '',
                        link: ddgData.AbstractURL || ''
                    });
                }
            } catch (ddgError) {
                console.error('[Search] DuckDuckGo API error:', ddgError);
            }
        }

        // Write search results to search-result.json
        const resultData = {
            query: query,
            status: 'done',
            results: results
        };

        ensureDirExists(SEARCH_RESULT_FILE);
        fs.writeFileSync(SEARCH_RESULT_FILE, JSON.stringify(resultData, null, 2), 'utf-8');
        console.log(`[Search] Results written to ${SEARCH_RESULT_FILE}`);

        // Update search-request.json status to done
        if (fs.existsSync(SEARCH_REQUEST_FILE)) {
            const requestData = JSON.parse(fs.readFileSync(SEARCH_REQUEST_FILE, 'utf-8'));
            requestData.status = 'done';
            requestData.results = results;
            fs.writeFileSync(SEARCH_REQUEST_FILE, JSON.stringify(requestData, null, 2), 'utf-8');
            console.log(`[Search] Updated ${SEARCH_REQUEST_FILE} status to done`);
        }

    } catch (error) {
        console.error('[Search] Error performing search:', error);

        // Write error result
        const resultData = {
            query: query,
            status: 'done',
            results: [],
            error: error.message
        };
        fs.writeFileSync(SEARCH_RESULT_FILE, JSON.stringify(resultData, null, 2), 'utf-8');
    }

    isProcessing = false;
}

function checkFile() {
    try {
        // Check if notify file exists
        if (!fs.existsSync(NOTIFY_FILE)) {
            return;
        }

        const stats = fs.statSync(NOTIFY_FILE);
        const modified = stats.mtimeMs;

        // Check if file was modified
        if (modified !== lastModified) {
            lastModified = modified;
            const content = fs.readFileSync(NOTIFY_FILE, 'utf-8').trim();

            // Only process if content changed and not already processing
            if (content !== lastContent && !isProcessing) {
                lastContent = content;
                console.log(`[Monitor] File changed: ${content}`);

                // Parse the notify file - expected format: {"query": "...", "status": "pending"}
                try {
                    const notifyData = JSON.parse(content);

                    if (notifyData.status === 'pending' && notifyData.query) {
                        isProcessing = true;
                        console.log(`[Monitor] Detected pending status with query: ${notifyData.query}`);
                        performSearch(notifyData.query);
                    }
                } catch (e) {
                    console.log('[Monitor] Failed to parse notify file:', e.message);
                }
            }
        }
    } catch (error) {
        console.error('[Monitor] Error checking file:', error);
    }
}

// Main loop - check every 2 seconds
console.log('[Monitor] Starting file monitor...');
console.log(`[Monitor] Watching: ${NOTIFY_FILE}`);
console.log('[Monitor] Checking every 2 seconds');

setInterval(checkFile, 2000);

// Initial check
checkFile();
