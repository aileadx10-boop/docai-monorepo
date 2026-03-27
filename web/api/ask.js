export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { question, context } = req.body;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.CLAUDE_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        system: 'You are a senior NY real estate attorney. Answer concisely and practically. Max 3 sentences.',
        messages: [{ role: 'user', content: `Context: ${context}\n\nQuestion: ${question}` }],
      }),
    });
    const d = await r.json();
    if (d.error) return res.status(500).json({ error: d.error.message });
    return res.status(200).json({ answer: d.content[0].text });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
