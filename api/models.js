export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const apiKey = req.query.key;
  try {
    const orRes = await fetch('https://openrouter.ai/api/v1/models', {
      headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {},
    });
    const data = await orRes.json();
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
