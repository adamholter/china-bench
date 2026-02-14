const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 9147;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  // API: Proxy to OpenRouter
  if (url.pathname === '/api/chat' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', async () => {
      try {
        const { apiKey, model, messages, temperature, max_tokens } = JSON.parse(body);
        const startTime = Date.now();

        const payload = { model, messages, temperature: temperature ?? 0.0 };
        if (max_tokens) payload.max_tokens = max_tokens;

        const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://china-bench.localhost',
            'X-Title': 'China Censorship Benchmark',
          },
          body: JSON.stringify(payload),
        });

        const data = await orRes.json();
        const elapsed = Date.now() - startTime;

        res.writeHead(orRes.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ...data, _elapsed_ms: elapsed }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // API: Get available models from OpenRouter
  if (url.pathname === '/api/models' && req.method === 'GET') {
    const apiKey = url.searchParams.get('key');
    try {
      const orRes = await fetch('https://openrouter.ai/api/v1/models', {
        headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {},
      });
      const data = await orRes.json();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // Static files
  let filePath = url.pathname === '/' ? '/index.html' : url.pathname;
  filePath = path.join(__dirname, 'public', filePath);

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch {
    // SPA fallback
    try {
      const index = fs.readFileSync(path.join(__dirname, 'public', 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(index);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  }
});

server.listen(PORT, () => {
  console.log(`China Censorship Benchmark running at http://localhost:${PORT}`);
});
