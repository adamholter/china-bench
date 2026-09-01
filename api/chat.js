export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { apiKey, model, messages, temperature, max_tokens, provider } = req.body;
  const startTime = Date.now();

  try {
    const payload = { model, messages, temperature: temperature ?? 0.0 };
    if (max_tokens) payload.max_tokens = max_tokens;

    // Vercel cannot reach a model server on your laptop. Local mode is handled
    // by server.cjs, which can safely proxy to the loopback vLLM endpoint.
    if (provider === 'local') {
      return res.status(400).json({ error: 'Local models require the local server: node server.cjs (not a Vercel deployment).' });
    }

    const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://chinabench.vercel.app',
        'X-Title': 'ChinaBench - LLM Censorship Benchmark',
      },
      body: JSON.stringify(payload),
    });

    const data = await orRes.json();
    const elapsed = Date.now() - startTime;
    res.status(orRes.status).json({ ...data, _elapsed_ms: elapsed });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
