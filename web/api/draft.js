export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { docLabel, fields, systemPrompt } = req.body;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.CLAUDE_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: 'user', content: `Generate the complete agreement with these details: ${JSON.stringify(fields)}` }],
      }),
    });
    const d = await r.json();
    if (d.error) return res.status(500).json({ error: d.error.message });
    return res.status(200).json({ markdown: d.content[0].text });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
