// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BizLegal AI — Cloudflare Worker
// All secrets stored in CF environment variables — never in frontend code
//
// Secrets set via: wrangler secret put SECRET_NAME
//   CLAUDE_KEY    → Anthropic API key
//   SENDGRID_KEY  → SendGrid API key
//   LSQ_SECRET    → Lemon Squeezy webhook secret
//
// CORS: only allows requests from your own domain
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const ALLOWED_ORIGIN = 'https://bizlegal-ai.com';

export default {
  async fetch(request, env) {
    // ── CORS preflight ──────────────────────────────────────────────────────
    if (request.method === 'OPTIONS') {
      return cors(new Response(null, { status: 204 }));
    }

    const origin = request.headers.get('Origin') || '';
    if (!origin.includes('bizlegal-ai.com') && !origin.includes('localhost')) {
      return new Response('Forbidden', { status: 403 });
    }

    const url = new URL(request.url);

    // ── Route: POST /api/draft ──────────────────────────────────────────────
    if (url.pathname === '/api/draft' && request.method === 'POST') {
      return cors(await handleDraft(request, env));
    }

    // ── Route: POST /api/docx ───────────────────────────────────────────────
    if (url.pathname === '/api/docx' && request.method === 'POST') {
      return cors(await handleDocx(request, env));
    }

    // ── Route: POST /api/alternatives ──────────────────────────────────────
    if (url.pathname === '/api/alternatives' && request.method === 'POST') {
      return cors(await handleAlternatives(request, env));
    }

    // ── Route: POST /api/ask ────────────────────────────────────────────────
    if (url.pathname === '/api/ask' && request.method === 'POST') {
      return cors(await handleAsk(request, env));
    }

    // ── Route: POST /api/email ──────────────────────────────────────────────
    if (url.pathname === '/api/email' && request.method === 'POST') {
      return cors(await handleEmail(request, env));
    }

    // ── Route: POST /api/webhook/lsq ───────────────────────────────────────
    if (url.pathname === '/api/webhook/lsq' && request.method === 'POST') {
      return cors(await handleWebhook(request, env));
    }

    return cors(new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HANDLERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function handleDraft(request, env) {
  try {
    const { docLabel, fields, systemPrompt } = await request.json();

    const fieldText = Object.entries(fields)
      .map(([k, v]) => `- ${k}: ${v}`).join('\n');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.CLAUDE_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 8000,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: `Draft a complete ${docLabel}.\n\nDeal details:\n${fieldText}\n\nWrite the full agreement now.`
        }]
      })
    });

    if (!response.ok) {
      const err = await response.json();
      return jsonResponse({ error: err.error?.message || 'Claude API error' }, 500);
    }

    const data = await response.json();
    return jsonResponse({ markdown: data.content[0].text });

  } catch (e) {
    return jsonResponse({ error: e.message }, 500);
  }
}

async function handleDocx(request, env) {
  try {
    const { markdown, title } = await request.json();

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.CLAUDE_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 8000,
        system: `You convert Markdown legal agreements to Office Open XML (word/document.xml).
OUTPUT: raw XML only. First character must be <?xml. No fences, no explanation.
Format: US Letter w:w="12240" w:h="15840", margins w:val="1440"
Font: Times New Roman. Body 11pt justified, line spacing 276.
## headings: bold 12pt ALLCAPS, spaceBefore=240
### headings: bold 11pt, spaceBefore=160
> blockquote: left border color="C9A84C" size="12"
Root: <w:document xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" mc:Ignorable="w14 w15">`,
        messages: [{
          role: 'user',
          content: `Title: ${title}\n\nConvert to word/document.xml:\n\n${markdown}`
        }]
      })
    });

    const data = await response.json();
    let xml = data.content[0].text.trim()
      .replace(/^```[a-z]*\n?/, '').replace(/```$/, '').trim();

    return jsonResponse({ xml });

  } catch (e) {
    return jsonResponse({ error: e.message }, 500);
  }
}

async function handleAlternatives(request, env) {
  try {
    const { clauseTitle, clauseRaw, docLabel } = await request.json();

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.CLAUDE_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        system: `You are a senior NY-licensed commercial attorney.
Return exactly 3 alternatives as JSON array.
Format: [{"tag":"Balanced","text":"..."},{"tag":"Pro-Buyer","text":"..."},{"tag":"Pro-Seller","text":"..."}]
Return ONLY the JSON array, no other text.`,
        messages: [{
          role: 'user',
          content: `Provide 3 alternative versions of this clause from a ${docLabel}:\n\nCLAUSE: ${clauseTitle}\n\n${clauseRaw}`
        }]
      })
    });

    const data = await response.json();
    const text = data.content[0].text.trim()
      .replace(/^```[a-z]*\n?/, '').replace(/```$/, '').trim();
    const alternatives = JSON.parse(text);
    return jsonResponse({ alternatives });

  } catch (e) {
    return jsonResponse({ error: e.message }, 500);
  }
}

async function handleAsk(request, env) {
  try {
    const { question, context } = await request.json();

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.CLAUDE_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 600,
        system: `You are a senior NY-licensed commercial attorney. Answer concisely. 2–4 sentences max.`,
        messages: [{
          role: 'user',
          content: `${context}\n\nQuestion: ${question}`
        }]
      })
    });

    const data = await response.json();
    return jsonResponse({ answer: data.content[0].text });

  } catch (e) {
    return jsonResponse({ error: e.message }, 500);
  }
}

async function handleEmail(request, env) {
  try {
    const { to, subject, docName, docKey, base64 } = await request.json();

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.SENDGRID_KEY}`,
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: 'noreply@bizlegal-ai.com', name: 'BizLegal AI' },
        subject,
        content: [{
          type: 'text/html',
          value: `<p>Your edited <strong>${docName}</strong> is attached.</p>
                  <p style="color:#666;font-size:12px">Templates only — not legal advice. Have qualified counsel review before execution.</p>`
        }],
        attachments: [{
          content: base64,
          filename: `${docKey}_edited.docx`,
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          disposition: 'attachment',
        }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return jsonResponse({ error: err }, 500);
    }

    return jsonResponse({ ok: true });

  } catch (e) {
    return jsonResponse({ error: e.message }, 500);
  }
}

async function handleWebhook(request, env) {
  // Verify Lemon Squeezy webhook signature
  try {
    const body = await request.text();
    const sig  = request.headers.get('X-Signature');
    const key  = env.LSQ_SECRET;

    const encoder = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey(
      'raw', encoder.encode(key),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    );
    const bodyBytes = encoder.encode(body);
    const sigBytes  = hexToBytes(sig);
    const valid     = await crypto.subtle.verify('HMAC', cryptoKey, sigBytes, bodyBytes);

    if (!valid) return new Response('Invalid signature', { status: 401 });

    const event = JSON.parse(body);
    if (event.meta?.event_name === 'order_created') {
      // Log or trigger fulfillment logic here
      console.log('Order confirmed:', event.data?.id);
    }

    return jsonResponse({ received: true });
  } catch (e) {
    return jsonResponse({ error: e.message }, 500);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function cors(response) {
  const r = new Response(response.body, response);
  r.headers.set('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  r.headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  r.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return r;
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}
