export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { markdown, title } = req.body;

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
        max_tokens: 8000,
        messages: [{
          role: 'user',
          content: `Convert this markdown legal document to valid OOXML (Word document XML).
Return ONLY the complete word/document.xml content, starting with <?xml.
Title: ${title}

Markdown:
${markdown}

Rules:
- Use w:document, w:body, w:p, w:r, w:t elements
- ## headers → w:pStyle Heading1
- ### headers → w:pStyle Heading2  
- > blockquotes → highlighted paragraph with border
- **bold** → w:b
- Tables → w:tbl
- Return ONLY the XML, no explanation, no markdown fences`
        }],
      }),
    });
    const d = await r.json();
    if (d.error) return res.status(500).json({ error: d.error.message });
    const xml = d.content[0].text.replace(/```xml|```/g,'').trim();
    return res.status(200).json({ xml });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
