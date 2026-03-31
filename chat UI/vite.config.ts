import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

// 日志目录
const LOG_DIR = path.join(__dirname, 'logs');
const CONVERSATION_LOG = path.join(LOG_DIR, 'conversations');
const REALTIME_LOG = path.join(LOG_DIR, 'realtime.log');

// AI 生成图片保存目录
const GENERATED_IMAGES_DIR = path.join(__dirname, 'generated-images');

// 确保图片保存目录存在
if (!fs.existsSync(GENERATED_IMAGES_DIR)) {
  fs.mkdirSync(GENERATED_IMAGES_DIR, { recursive: true });
}

// MCP 搜索轮询插件
const mcpSearchPlugin = () => ({
  name: 'mcp-search',
  configureServer(server) {
    // 写入搜索请求
    server.middlewares.use('/search-request.json', async (req, res) => {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          try {
            const data = JSON.parse(body);
            const requestFile = path.join(__dirname, 'public', 'search-request.json');
            fs.writeFileSync(requestFile, JSON.stringify(data));
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ status: 'ok' }));
          } catch (e) {
            res.status(500).json({ error: 'Failed to write request' });
          }
        });
      } else {
        res.status(405).json({ error: 'Method not allowed' });
      }
    });

    // 读取搜索结果（轮询端点）
    server.middlewares.use('/search-result.json', async (req, res) => {
      const resultFile = path.join(__dirname, 'public', 'search-result.json');
      try {
        if (fs.existsSync(resultFile)) {
          const data = fs.readFileSync(resultFile, 'utf-8');
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
          res.end(data);
        } else {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.end(JSON.stringify({ status: 'idle', results: [] }));
        }
      } catch (e) {
        res.status(500).json({ error: 'Failed to read result' });
      }
    });

    // 写入对话日志
    server.middlewares.use('/api/logger', async (req, res) => {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            const { type, userQuery, assistantResponse, action, step, query } = data;

            // 确保目录存在
            if (!fs.existsSync(LOG_DIR)) {
              fs.mkdirSync(LOG_DIR, { recursive: true });
            }
            if (!fs.existsSync(CONVERSATION_LOG)) {
              fs.mkdirSync(CONVERSATION_LOG, { recursive: true });
            }

            const now = new Date();
            const timestamp = now.toISOString();
            const today = timestamp.split('T')[0];

            if (type === 'conversation') {
              // 写入对话历史
              const logFile = path.join(CONVERSATION_LOG, `${today}.json`);
              let conversations = [];

              if (fs.existsSync(logFile)) {
                try {
                  conversations = JSON.parse(fs.readFileSync(logFile, 'utf-8'));
                } catch (e) {
                  conversations = [];
                }
              }

              conversations.push({
                id: conversations.length + 1,
                timestamp,
                userQuery,
                assistantResponse,
                action,
              });

              fs.writeFileSync(logFile, JSON.stringify(conversations, null, 2), 'utf-8');

              // 写入实时日志
              const logEntry = `[${timestamp}] [对话 #${conversations.length}] 用户: ${userQuery}\n`;
              fs.appendFileSync(REALTIME_LOG, logEntry);
            } else if (type === 'step') {
              // 写入推理步骤
              const logEntry = `[${timestamp}] [推理] ${step}\n`;
              fs.appendFileSync(REALTIME_LOG, logEntry);
            } else if (type === 'search') {
              // 写入搜索过程
              const logEntry = `[${timestamp}] [搜索] ${query}\n`;
              fs.appendFileSync(REALTIME_LOG, logEntry);
            }

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ status: 'ok' }));
          } catch (e) {
            res.status(500).json({ error: 'Failed to write log' });
          }
        });
      } else {
        res.status(405).json({ error: 'Method not allowed' });
      }
    });

    // 读取实时日志
    server.middlewares.use('/api/logger/realtime', async (req, res) => {
      try {
        if (fs.existsSync(REALTIME_LOG)) {
          const data = fs.readFileSync(REALTIME_LOG, 'utf-8');
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end(data);
        } else {
          res.end('');
        }
      } catch (e) {
        res.status(500).json({ error: 'Failed to read log' });
      }
    });

    // 读取对话历史
    server.middlewares.use('/api/logger/conversations', async (req, res) => {
      const url = new URL(req.url || '', 'http://localhost');
      const date = url.searchParams.get('date');

      let logFile;
      if (date) {
        logFile = path.join(CONVERSATION_LOG, `${date}.json`);
      } else {
        const today = new Date().toISOString().split('T')[0];
        logFile = path.join(CONVERSATION_LOG, `${today}.json`);
      }

      try {
        if (fs.existsSync(logFile)) {
          const data = fs.readFileSync(logFile, 'utf-8');
          res.setHeader('Content-Type', 'application/json');
          res.end(data);
        } else {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify([]));
        }
      } catch (e) {
        res.status(500).json({ error: 'Failed to read conversations' });
      }
    });

    // MCP 搜索端点 - 直接调用 MCP MiniMax web search
    server.middlewares.use('/api/mcp-search', async (req, res) => {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          try {
            const { query } = JSON.parse(body);

            if (!query) {
              res.status(400).json({ error: 'Missing query' });
              return;
            }

            console.log(`[MCP API] Searching for: ${query}`);

            // 动态导入 MCP SDK
            const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
            const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');

            // 创建 MCP 客户端
            const transport = new StdioClientTransport({
              command: 'uvx',
              args: ['minimax-coding-plan-mcp'],
              env: {
                ...process.env,
                MINIMAX_API_KEY: 'sk-cp-BZ4zKCQCkeKCu9SdhItjlNAv6KGBAh_BpuZM9EK9H9KJJ7aekei6HVBPr5lWJwaxf2upVayoA0ELAUhFr8pfS0CttjEAmBYYb96254l-zQbaMRxuXHeAB_w',
                MINIMAX_MCP_BASE_PATH: '/Users/mi/Desktop/Claude Code/Chatbox',
                MINIMAX_API_HOST: 'https://api.minimaxi.com',
                MINIMAX_API_RESOURCE_MODE: 'local'
              }
            });

            const client = new Client({
              name: 'chatbox-search-client',
              version: '1.0.0'
            }, {
              capabilities: {}
            });

            await client.connect(transport);

            // 调用 MCP 工具
            const result = await client.callTool({
              name: 'web_search',
              arguments: { query }
            });

            // 解析结果
            let results = [];
            if (result && result.content) {
              try {
                const parsed = JSON.parse(result.content[0].text);
                if (parsed.organic) {
                  results = parsed.organic.map(item => ({
                    title: item.title || '',
                    body: item.snippet || '',
                    link: item.link || ''
                  }));
                }
              } catch (e) {
                results = [{
                  title: '搜索结果',
                  body: result.content[0].text,
                  link: ''
                }];
              }
            }

            console.log(`[MCP API] Found ${results.length} results`);

            // 保存搜索记录到按日汇总的文件
            const SEARCH_LOG_DIR = path.join(__dirname, 'logs', 'search');
            const today = new Date().toISOString().split('T')[0];
            const searchLogFile = path.join(SEARCH_LOG_DIR, `${today}.json`);

            // 确保目录存在
            if (!fs.existsSync(SEARCH_LOG_DIR)) {
              fs.mkdirSync(SEARCH_LOG_DIR, { recursive: true });
            }

            // 读取现有记录或创建新记录
            let searchHistory = [];
            if (fs.existsSync(searchLogFile)) {
              try {
                searchHistory = JSON.parse(fs.readFileSync(searchLogFile, 'utf-8'));
              } catch (e) {
                searchHistory = [];
              }
            }

            // 追加新的搜索记录
            searchHistory.push({
              id: searchHistory.length + 1,
              timestamp: new Date().toISOString(),
              query: query,
              results: results
            });

            // 写入文件
            fs.writeFileSync(searchLogFile, JSON.stringify(searchHistory, null, 2), 'utf-8');
            console.log(`[MCP API] Search history saved to ${searchLogFile}`);

            // 同时更新 search-result.json（保持兼容性）
            const resultFile = path.join(__dirname, 'public', 'search-result.json');
            fs.writeFileSync(resultFile, JSON.stringify({
              query: query,
              status: 'done',
              results: results
            }, null, 2), 'utf-8');

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              status: 'done',
              results
            }));

          } catch (error) {
            console.error('[MCP API] Error:', error);
            res.status(500).json({
              error: error.message
            });
          }
        });
      }
    });

    // 图片理解端点
    server.middlewares.use('/api/understand-image', async (req, res) => {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          try {
            const { imageData, prompt } = JSON.parse(body);

            if (!imageData) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Missing imageData' }));
              return;
            }

            console.log('[MCP API] Understanding image..., image data length:', imageData ? imageData.length : 0);

            // 动态导入 MCP SDK
            const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
            const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');

            // 创建 MCP 客户端
            const transport = new StdioClientTransport({
              command: 'uvx',
              args: ['minimax-coding-plan-mcp'],
              env: {
                ...process.env,
                MINIMAX_API_KEY: 'sk-cp-BZ4zKCQCkeKCu9SdhItjlNAv6KGBAh_BpuZM9EK9H9KJJ7aekei6HVBPr5lWJwaxf2upVayoA0ELAUhFr8pfS0CttjEAmBYYb96254l-zQbaMRxuXHeAB_w',
                MINIMAX_MCP_BASE_PATH: '/Users/mi/Desktop/Claude Code/Chatbox',
                MINIMAX_API_HOST: 'https://api.minimaxi.com',
                MINIMAX_API_RESOURCE_MODE: 'local'
              }
            });

            const client = new Client({
              name: 'chatbox-image-client',
              version: '1.0.0'
            }, {
              capabilities: {}
            });

            await client.connect(transport);

            // 调用图片理解 MCP 工具
            const result = await client.callTool({
              name: 'understand_image',
              arguments: {
                prompt: prompt || '请详细描述这张图片的内容',
                image_source: imageData
              }
            });

            console.log('[MCP API] Image understood, result:', JSON.stringify(result).substring(0, 500));

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              status: 'done',
              description: result.content?.[0]?.text || '图片理解失败'
            }));

          } catch (error) {
            console.error('[MCP API] Image understand error:', error);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              error: error.message
            }));
          }
        });
      }
    });

    // 车辆控制 API 端点 - 服务端转发避免 CORS
    server.middlewares.use('/api/car-control', async (req, res) => {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          try {
            const carData = JSON.parse(body);
            console.log('[Car API] 收到请求:', JSON.stringify(carData));

            // 直接转发到目标服务器
            const targetUrl = 'http://preview.tsp-mock.sc.iccc.mioffice.cn/test/dds-noauth';
            const response = await fetch(targetUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(carData),
            });

            const result = await response.json();
            console.log('[Car API] 目标服务器返回:', JSON.stringify(result));

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(result));
          } catch (error: any) {
            console.error('[Car API] 请求失败:', error);
            res.status(500).json({ error: error.message });
          }
        });
      } else {
        res.status(405).json({ error: 'Method not allowed' });
      }
    });

    // 图片生成 API 端点 - 文生图
    server.middlewares.use('/api/image-generation', async (req, res) => {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          try {
            const { prompt, model, aspect_ratio, response_format, n, prompt_optimizer, seed, width, height } = JSON.parse(body);

            if (!prompt) {
              res.status(400).json({ error: 'Missing prompt' });
              return;
            }

            console.log('[Image Gen API] Generating image with prompt:', prompt);

            // 调用 MiniMax 图片生成 API
            const targetUrl = 'https://api.minimaxi.com/v1/image_generation';
            const response = await fetch(targetUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer sk-cp-BZ4zKCQCkeKCu9SdhItjlNAv6KGBAh_BpuZM9EK9H9KJJ7aekei6HVBPr5lWJwaxf2upVayoA0ELAUhFr8pfS0CttjEAmBYYb96254l-zQbaMRxuXHeAB_w',
              },
              body: JSON.stringify({
                model: model || 'image-01',
                prompt,
                ...(aspect_ratio && { aspect_ratio }),
                ...(response_format && { response_format }),
                ...(n && { n }),
                ...(prompt_optimizer !== undefined && { prompt_optimizer }),
                ...(seed && { seed }),
                ...(width && { width }),
                ...(height && { height }),
              }),
            });

            const result = await response.json();
            console.log('[Image Gen API] Response:', JSON.stringify(result).substring(0, 500));

            // 自动保存生成的图片到本地
            if (result.base_resp?.status_code === 0 && result.data?.image_urls?.[0]) {
              const imageUrl = result.data.image_urls[0];
              try {
                // 生成文件名：时间戳 + prompt前20字符
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const safeName = prompt.slice(0, 20).replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
                const filename = `${timestamp}_${safeName}.png`;
                const filepath = path.join(GENERATED_IMAGES_DIR, filename);

                // 下载图片
                const imageResponse = await fetch(imageUrl);
                const imageBuffer = await imageResponse.arrayBuffer();
                fs.writeFileSync(filepath, Buffer.from(imageBuffer));

                console.log('[Image Gen API] Image saved to:', filepath);
              } catch (saveError) {
                console.error('[Image Gen API] Failed to save image:', saveError);
              }
            }

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(result));
          } catch (error: any) {
            console.error('[Image Gen API] Error:', error);
            res.status(500).json({ error: error.message });
          }
        });
      } else {
        res.status(405).json({ error: 'Method not allowed' });
      }
    });

    // 语音合成 API 端点 - TTS
    server.middlewares.use('/api/tts', async (req, res) => {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          try {
            const { text, model, voice_id, speed, vol, pitch, emotion, output_format } = JSON.parse(body);

            if (!text) {
              res.status(400).json({ error: 'Missing text' });
              return;
            }

            console.log('[TTS API] Synthesizing speech, text length:', text.length);

            // 调用 MiniMax 语音合成 API
            const targetUrl = 'https://api.minimaxi.com/v1/t2a_v2';
            const response = await fetch(targetUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer sk-cp-BZ4zKCQCkeKCu9SdhItjlNAv6KGBAh_BpuZM9EK9H9KJJ7aekei6HVBPr5lWJwaxf2upVayoA0ELAUhFr8pfS0CttjEAmBYYb96254l-zQbaMRxuXHeAB_w',
              },
              body: JSON.stringify({
                model: model || 'speech-2.8-hd',
                text,
                stream: false,
                output_format: output_format || 'url',
                voice_setting: {
                  voice_id: voice_id || 'male-qn-qingse',
                  speed: speed ?? 1,
                  vol: vol ?? 1,
                  pitch: pitch ?? 0,
                  ...(emotion && { emotion }),
                },
                audio_setting: {
                  sample_rate: 32000,
                  bitrate: 128000,
                  format: 'mp3',
                  channel: 1,
                },
              }),
            });

            const result = await response.json();
            console.log('[TTS API] Response status:', result.base_resp?.status_msg);

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(result));
          } catch (error: any) {
            console.error('[TTS API] Error:', error);
            res.status(500).json({ error: error.message });
          }
        });
      } else {
        res.status(405).json({ error: 'Method not allowed' });
      }
    });

    // 手车互联 - 发送地址到车机
    server.middlewares.use('/api/send-address-to-car', async (req, res) => {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          try {
            const { locationName, address } = JSON.parse(body);
            console.log('[CarPhone API] 发送地址到车机:', locationName);

            const targetUrl = 'https://mobile.pre-product.iccc.xiaomiev.com/mobile/clientbusiness/IcccClientBusinessService/sendAddressToCar';
            const response = await fetch(targetUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json;charset=UTF-8',
                'x_ic_device_id': 'D8E283973D464A95',
                'x_ic_user_id': '3730174808185373714',
                'cookie': 'serviceToken=Rbe8CDEfpCB1Z3Q6M4y2V+xYd5tpEL9k1sjPed31sJV63R8NXlhc2c337qWB7PFqtZPqupQ5op8Pesl9f0WFUKiHid5o6ufNpdSRXpihM5+qN9H0b1H0Hf63Lib0rGWlVecO7TLG8MAZFUdhfBHxxXpzdG3KAfmQM/R5XcTDMYsyaHteK1z6jJQ8HfThmLan6HKRFczWTvK8LROAFX1J2hNMKbIWIfT0KC1z0bHVwTr3HLSvoi1wP1zjL0CP7VVBqpJJeMoIh/tqmncQZZEBtg==; cUserId=_wiKnz-JfYuq9y117IrBLfV_O0Q; mobile_id=c8125800-3a3e-49e9-99c0-80635e4ad076;',
              },
              body: JSON.stringify({
                content: '',
                model: 'iPhone18,3',
                POI: {
                  latitude: 0,
                  requestSource: 'ShareImageSendToCar',
                  address: address || '',
                  longitude: 0,
                  poiId: '',
                  locationName: locationName,
                },
                vid: 'HXMQRBURENLJNU7E7',
                manufacture: 'Apple',
                source: '小米汽车APP',
                sid: 'iccc_app_api',
                deviceId: 'D8E283973D464A95',
              }),
            });

            const result = await response.json();
            console.log('[CarPhone API] 返回:', JSON.stringify(result));

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(result));
          } catch (error: any) {
            console.error('[CarPhone API] 请求失败:', error);
            res.status(500).json({ error: error.message });
          }
        });
      } else {
        res.status(405).json({ error: 'Method not allowed' });
      }
    });
  }
});

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    mcpSearchPlugin(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'figma:asset': path.resolve(__dirname, './src/assets'),
    },
  },
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
