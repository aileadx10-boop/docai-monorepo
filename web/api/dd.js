export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { base64, filename, docType } = req.body;

  if (!base64) return res.status(400).json({ error: 'No file provided' });

  try {
    // Send contract to Claude for Due Diligence analysis
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
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: filename?.endsWith('.docx')
                  ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                  : 'application/pdf',
                data: base64,
              }
            },
            {
              type: 'text',
              text: `You are a senior NY-licensed real estate attorney with 20+ years experience conducting due diligence on commercial contracts.

Conduct a thorough due diligence review of this contract. Return a structured JSON report with this exact format:

{
  "contract_type": "string — detected contract type",
  "parties": ["Party A", "Party B"],
  "overall_risk": "HIGH|MEDIUM|LOW",
  "risk_score": 1-10,
  "summary": "2-3 sentence executive summary",
  "red_flags": [
    {
      "severity": "HIGH|MEDIUM|LOW",
      "clause": "clause name or section",
      "issue": "what is wrong",
      "recommendation": "how to fix it",
      "docstack_template": "jv|nda|loi|commission|capital_call|property_mgmt|subscription|guarantee|none"
    }
  ],
  "missing_clauses": ["list of important clauses that are absent"],
  "strengths": ["list of well-drafted provisions"],
  "recommended_action": "REVISE|NEGOTIATE|REJECT|APPROVE_WITH_CONDITIONS",
  "action_detail": "specific next step recommendation",
  "docstack_recommendation": {
    "template_key": "jv|nda|loi|commission|capital_call|property_mgmt|subscription|guarantee|bundle|none",
    "template_name": "full template name",
    "reason": "why this template would help"
  }
}

Return ONLY valid JSON. No markdown fences, no preamble.`
            }
          ]
        }],
      }),
    });

    const d = await r.json();
    if (d.error) return res.status(500).json({ error: d.error.message });

    const raw = d.content[0].text.replace(/```json|```/g, '').trim();
    const report = JSON.parse(raw);

    return res.status(200).json({ ok: true, report });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
