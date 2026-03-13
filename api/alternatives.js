export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { clauseTitle, clauseRaw, docLabel } = req.body;

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
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: `You are a senior NY attorney. For this clause from a ${docLabel}, provide exactly 3 alternative versions.
Return ONLY valid JSON array:
[{"tag":"Stronger","text":"..."},{"tag":"Balanced","text":"..."},{"tag":"Simpler","text":"..."}]

Clause title: ${clauseTitle}
Current text:
${clauseRaw}

Return ONLY the JSON array, no explanation.`
        }],
      }),
    });
    const d = await r.json();
    if (d.error) return res.status(500).json({ error: d.error.message });
    const raw = d.content[0].text.replace(/```json|```/g,'').trim();
    const alternatives = JSON.parse(raw);
    return res.status(200).json({ alternatives });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
