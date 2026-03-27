import fetch from 'node-fetch';
import crypto from 'crypto';

const cfg = () => ({
  CLAUDE_KEY:     process.env.CLAUDE_KEY     || '',
  SENDGRID_KEY:   process.env.SENDGRID_KEY   || '',
  SERPER_KEY:     process.env.SERPER_KEY     || '',
  SUPABASE_URL:   process.env.SUPABASE_URL   || '',
  SUPABASE_KEY:   process.env.SUPABASE_KEY   || '',
  OWNER_EMAIL:    process.env.OWNER_EMAIL    || '',
  APIFY_TOKEN:    process.env.APIFY_TOKEN    || '',
  SITE_URL:       'https://docstack.bizlegal-ai.com',
  FROM_EMAIL:     'outreach@bizlegal-ai.com',
});

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Claude ──────────────────────────────────────────────────────────
async function claude(system, user, maxTokens = 500) {
  const { CLAUDE_KEY } = cfg();
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': CLAUDE_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  const d = await r.json();
  return d?.content?.[0]?.text?.trim() || '';
}

// ── Supabase ─────────────────────────────────────────────────────────
function sbHeaders() {
  const { SUPABASE_KEY } = cfg();
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  };
}

async function dbSeen(leadId) {
  const { SUPABASE_URL } = cfg();
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/leads_raw?lead_id=eq.${leadId}&select=lead_id`, { headers: sbHeaders() });
    const d = await r.json();
    return Array.isArray(d) && d.length > 0;
  } catch { return false; }
}

async function dbInsertRaw(lead) {
  const { SUPABASE_URL } = cfg();
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/leads_raw`, { method: 'POST', headers: sbHeaders(), body: JSON.stringify(lead) });
  } catch(e) { console.error('DB insert raw error:', e.message); }
}

async function dbInsertClean(lead) {
  const { SUPABASE_URL } = cfg();
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/leads_clean`, { method: 'POST', headers: sbHeaders(), body: JSON.stringify(lead) });
  } catch(e) { console.error('DB insert clean error:', e.message); }
}

// ── Serper Search ────────────────────────────────────────────────────
async function serperSearch(query, source) {
  const { SERPER_KEY } = cfg();
  try {
    const r = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': SERPER_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, num: 8 }),
    });
    const d = await r.json();
    return (d.organic || []).map(res => ({
      lead_id: crypto.createHash('md5').update(res.link || query + res.title).digest('hex'),
      source,
      title: (res.title || '').slice(0, 200),
      body: (res.snippet || '').slice(0, 1000),
      url: res.link || '',
      author: '',
      created_at: new Date().toISOString(),
    }));
  } catch(e) {
    console.error(`Serper error [${source}]:`, e.message);
    return [];
  }
}

// ── Agent 1: Quora ───────────────────────────────────────────────────
const QUORA_QUERIES = [
  'site:quora.com "real estate" "joint venture" "agreement"',
  'site:quora.com "NDA" "real estate" "do I need"',
  'site:quora.com "real estate investor" "legal documents"',
  'site:quora.com "LLC" "real estate" "partnership agreement"',
  'site:quora.com "syndication" "real estate" "legal"',
];

async function scrapeQuora() {
  const leads = [];
  for (const q of QUORA_QUERIES) {
    const results = await serperSearch(q, 'quora');
    for (const lead of results) {
      if (await dbSeen(lead.lead_id)) continue;
      await dbInsertRaw(lead);
      leads.push(lead);
    }
    await sleep(800);
  }
  console.log(`[Quora] ${leads.length} leads`);
  return leads;
}

// ── Agent 2: BiggerPockets ───────────────────────────────────────────
const BP_QUERIES = [
  'site:biggerpockets.com "joint venture" "agreement" "need"',
  'site:biggerpockets.com "partnership" "legal" "contract"',
  'site:biggerpockets.com "syndication" "documents" "investors"',
  'site:biggerpockets.com "capital raise" "legal" "agreement"',
];

async function scrapeBiggerPockets() {
  const leads = [];
  for (const q of BP_QUERIES) {
    const results = await serperSearch(q, 'biggerpockets');
    for (const lead of results) {
      if (await dbSeen(lead.lead_id)) continue;
      await dbInsertRaw(lead);
      leads.push(lead);
    }
    await sleep(800);
  }
  console.log(`[BiggerPockets] ${leads.length} leads`);
  return leads;
}

// ── Agent 3: LinkedIn ────────────────────────────────────────────────
const LI_QUERIES = [
  'site:linkedin.com/pulse "joint venture" "real estate" "agreement"',
  'site:linkedin.com/pulse "real estate syndication" "investors" "legal"',
  'site:linkedin.com "raising capital" "real estate" "partnership"',
];

async function scrapeLinkedIn() {
  const leads = [];
  for (const q of LI_QUERIES) {
    const results = await serperSearch(q, 'linkedin');
    for (const lead of results) {
      if (await dbSeen(lead.lead_id)) continue;
      await dbInsertRaw(lead);
      leads.push(lead);
    }
    await sleep(800);
  }
  console.log(`[LinkedIn] ${leads.length} leads`);
  return leads;
}

// ── Agent 4: Google Fresh ────────────────────────────────────────────
const GOOGLE_QUERIES = [
  '"real estate investor" "joint venture" "looking for partner" 2025',
  '"commercial real estate" "need NDA" OR "need agreement" 2025',
  '"real estate syndication" "legal documents" "how to" 2025',
  '"property management" "agreement template" "need" 2025',
  '"capital call" "real estate fund" "legal" 2025',
];

async function scrapeGoogle() {
  const leads = [];
  for (const q of GOOGLE_QUERIES) {
    const results = await serperSearch(q, 'google');
    for (const lead of results) {
      if (await dbSeen(lead.lead_id)) continue;
      await dbInsertRaw(lead);
      leads.push(lead);
    }
    await sleep(800);
  }
  console.log(`[Google] ${leads.length} leads`);
  return leads;
}

// ── Agent 5a: Apify LinkedIn Scraper ─────────────────────────────────────────
const APIFY_LINKEDIN_QUERIES = [
  'real estate joint venture agreement need attorney',
  'commercial real estate syndication legal documents investors',
  'NDA non-disclosure real estate deal protection',
  'real estate capital raise LLC partnership agreement',
  'FinTech startup legal contracts agreement template',
];

async function apifyLinkedIn() {
  const { APIFY_TOKEN } = cfg();
  const leads = [];

  for (const query of APIFY_LINKEDIN_QUERIES) {
    try {
      // Use Apify Google Search Scraper (actor: apify/google-search-scraper)
      // to find LinkedIn posts about legal document needs
      const runRes = await fetch(
        `https://api.apify.com/v2/acts/apify~google-search-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}&maxItems=8`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            queries: `site:linkedin.com/pulse ${query}`,
            maxPagesPerQuery: 1,
            resultsPerPage: 8,
            mobileResults: false,
          }),
          signal: AbortSignal.timeout(60000),
        }
      );

      if (!runRes.ok) {
        console.error(`Apify LinkedIn run failed [${query}]:`, runRes.status);
        continue;
      }

      const items = await runRes.json();
      for (const item of (items || [])) {
        const organic = item.organicResults || [];
        for (const r of organic) {
          if (!r.url?.includes('linkedin.com')) continue;
          const lead = {
            lead_id: crypto.createHash('md5').update(r.url || query + r.title).digest('hex'),
            source: 'apify-linkedin',
            title: (r.title || '').slice(0, 200),
            body: (r.description || r.snippet || '').slice(0, 1000),
            url: r.url || '',
            author: '',
            created_at: new Date().toISOString(),
          };
          if (await dbSeen(lead.lead_id)) continue;
          await dbInsertRaw(lead);
          leads.push(lead);
        }
      }
    } catch(e) {
      console.error(`Apify LinkedIn error [${query}]:`, e.message);
    }
    await sleep(1200);
  }

  console.log(`[Apify-LinkedIn] ${leads.length} leads`);
  return leads;
}

// ── Agent 5b: Apify Reddit Scraper ───────────────────────────────────────────
const REDDIT_SUBREDDITS = [
  { sub: 'realestateinvesting', query: 'joint venture agreement legal documents' },
  { sub: 'realestateinvesting', query: 'NDA non-disclosure real estate deal' },
  { sub: 'realestate', query: 'need legal agreement template contract' },
  { sub: 'smallbusiness', query: 'partnership agreement legal contract needed' },
  { sub: 'Entrepreneur', query: 'NDA contract legal agreement startup' },
  { sub: 'legaladvice', query: 'real estate joint venture agreement' },
];

async function apifyReddit() {
  const { APIFY_TOKEN } = cfg();
  const leads = [];

  for (const { sub, query } of REDDIT_SUBREDDITS) {
    try {
      const runRes = await fetch(
        `https://api.apify.com/v2/acts/trudax~reddit-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}&maxItems=10`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startUrls: [{ url: `https://www.reddit.com/r/${sub}/search/?q=${encodeURIComponent(query)}&sort=new` }],
            maxPostCount: 10,
            maxComments: 0,
            proxy: { useApifyProxy: true },
          }),
          signal: AbortSignal.timeout(90000),
        }
      );

      if (!runRes.ok) {
        console.error(`Apify Reddit run failed [r/${sub}]:`, runRes.status);
        continue;
      }

      const items = await runRes.json();
      for (const post of (items || [])) {
        if (!post.title) continue;
        const lead = {
          lead_id: crypto.createHash('md5').update(post.url || post.id || post.title).digest('hex'),
          source: 'apify-reddit',
          title: (post.title || '').slice(0, 200),
          body: (post.body || post.selftext || post.text || '').slice(0, 1000),
          url: post.url || `https://reddit.com/r/${sub}`,
          author: post.author || '',
          created_at: new Date().toISOString(),
        };
        if (await dbSeen(lead.lead_id)) continue;
        await dbInsertRaw(lead);
        leads.push(lead);
      }
    } catch(e) {
      console.error(`Apify Reddit error [r/${sub}]:`, e.message);
    }
    await sleep(1500);
  }

  console.log(`[Apify-Reddit] ${leads.length} leads`);
  return leads;
}

// ── Agent 5c: Apify Quora Full-Text Scraper ───────────────────────────────────
const QUORA_TOPICS = [
  'What legal documents do I need for a real estate joint venture',
  'Do I need an NDA before sharing a real estate deal',
  'How do I protect myself from being cut out of a real estate deal',
  'What contracts do I need for real estate syndication',
  'What is a non-circumvention agreement and do I need one',
];

async function apifyQuoraDeep() {
  const { APIFY_TOKEN } = cfg();
  const leads = [];

  for (const q of QUORA_TOPICS) {
    try {
      const searchUrl = `https://www.quora.com/search?q=${encodeURIComponent(q)}`;
      const runRes = await fetch(
        `https://api.apify.com/v2/acts/apify~web-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}&maxItems=5`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startUrls: [{ url: searchUrl }],
            pageFunction: `async function pageFunction(context) {
              const { page, request } = context;
              const results = [];
              const links = await page.$$eval('a[href*="/q/"]', els => els.map(el => ({ href: el.href, text: el.innerText })).slice(0, 8));
              return links.map(l => ({ url: l.href, title: l.text, body: '', source: 'quora' }));
            }`,
            proxyConfiguration: { useApifyProxy: true },
          }),
          signal: AbortSignal.timeout(90000),
        }
      );

      if (!runRes.ok) continue;

      const items = await runRes.json();
      for (const item of (items || [])) {
        if (!item.title || !item.url?.includes('quora.com')) continue;
        const lead = {
          lead_id: crypto.createHash('md5').update(item.url || q).digest('hex'),
          source: 'apify-quora',
          title: (item.title || '').slice(0, 200),
          body: (item.body || q).slice(0, 500),
          url: item.url || '',
          author: '',
          created_at: new Date().toISOString(),
        };
        if (await dbSeen(lead.lead_id)) continue;
        await dbInsertRaw(lead);
        leads.push(lead);
      }
    } catch(e) {
      console.error(`Apify Quora error [${q}]:`, e.message);
    }
    await sleep(1000);
  }

  console.log(`[Apify-Quora] ${leads.length} leads`);
  return leads;
}

// ── Agent 5: Qualifier ───────────────────────────────────────────────
const TOPIC_MAP = {
  'JV Agreement':   ['jv',            'https://docstack.bizlegal-ai.com/#docs'],
  'NDA':            ['nda',           'https://docstack.bizlegal-ai.com/#docs'],
  'LOI':            ['loi',           'https://docstack.bizlegal-ai.com/#docs'],
  'Commission':     ['commission',    'https://docstack.bizlegal-ai.com/#docs'],
  'Capital Call':   ['capital_call',  'https://docstack.bizlegal-ai.com/#docs'],
  'Property Mgmt':  ['property_mgmt', 'https://docstack.bizlegal-ai.com/#docs'],
  'Subscription':   ['subscription',  'https://docstack.bizlegal-ai.com/#docs'],
  'Guarantee':      ['guarantee',     'https://docstack.bizlegal-ai.com/#docs'],
  'General':        ['bundle',        'https://docstack.bizlegal-ai.com/#docs'],
};

async function qualifyLead(lead) {
  const text = `Title: ${lead.title}\nContent: ${lead.body}\nURL: ${lead.url}`;
  try {
    const raw = await claude(
      `Analyse this content and return ONLY valid JSON, no markdown:
{"score":1-10,"topic":"JV Agreement|NDA|LOI|Commission|Capital Call|Property Mgmt|Subscription|Guarantee|General","urgency":"high|medium|low","summary":"1 sentence max 20 words","has_email":false,"email":null,"actionable":true}
Score 8-10: clear legal doc need. Score 5-7: general interest. Score 1-4: not relevant.`,
      text, 200
    );
    const data = JSON.parse(raw.replace(/```json|```/g,'').trim());
    if (!data.actionable || data.score < 6) return null;
    const [docKey, docUrl] = TOPIC_MAP[data.topic] || TOPIC_MAP['General'];
    return {
      lead_id: lead.lead_id,
      source: lead.source,
      url: lead.url,
      author: lead.author || '',
      email: data.email || null,
      score: data.score,
      topic: data.topic,
      urgency: data.urgency,
      summary: data.summary,
      doc_key: docKey,
      doc_url: docUrl,
      emailed: false,
      created_at: new Date().toISOString(),
    };
  } catch(e) {
    console.error('Qualify error:', e.message);
    return null;
  }
}

// ── Agent 6: Outreach Writer ─────────────────────────────────────────
const DOC_LABELS = {
  jv:'Joint Venture Agreement', nda:'Non-Circumvention NDA', loi:'Letter of Intent',
  commission:'Commission Protection Agreement', capital_call:'Capital Call Agreement',
  property_mgmt:'Property Management Agreement', subscription:'Investor Subscription Agreement',
  guarantee:'Personal Guarantee', bundle:'Full Legal Document Library',
};

async function writeOutreach(lead) {
  const docLabel = DOC_LABELS[lead.doc_key] || 'Legal Document';
  const [body, subject] = await Promise.all([
    claude(
      `You are a legal risk advisor at BizLegal AI — built by Advocate Dor, a commercial lawyer and arbitrator with 20+ years experience.

Write a short, direct, non-spammy outreach email (max 120 words). Tone: helpful professional peer, not a salesperson.

STRUCTURE — follow this exactly:
1. One sentence acknowledging their specific legal/contract situation (don't say "I saw your post")
2. Lead with the Due Diligence offer: "Before signing anything, get a contract risk analysis — red flags, missing clauses, risk score — in seconds: https://docstack.bizlegal-ai.com/#dd ($250 one-time)"
3. One sentence mentioning the relevant template as the solution: ${lead.doc_url}
4. Close with one line: "No subscription. Attorney-drafted, AI-refined."

No subject line. No placeholders. No "Dear [Name]". No exclamation marks. Direct and human.`,
      `Their situation: ${lead.summary}\nRelevant document: ${docLabel}`, 300
    ),
    claude(
      'Write a concise email subject line (max 7 words). Return ONLY the subject, no quotes.',
      `About: ${docLabel} for real estate professional`, 30
    ),
  ]);
  return { subject: subject.trim(), body: body.trim() };
}

// ── Agent 7: SendGrid Sender ─────────────────────────────────────────
async function sendEmail(to, subject, body) {
  const { SENDGRID_KEY, FROM_EMAIL } = cfg();
  try {
    const r = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${SENDGRID_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: FROM_EMAIL, name: 'BizLegal AI' },
        subject,
        content: [{
          type: 'text/html',
          value: `<div style="font-family:Georgia,serif;max-width:560px;color:#1a1208;padding:20px">
            <p style="border-bottom:2px solid #C9A84C;padding-bottom:8px;margin-bottom:16px">
              <strong style="color:#8B6914;font-size:15px">BizLegal AI</strong>
            </p>
            <div style="line-height:1.8;font-size:14px">${body.replace(/\n/g,'<br>')}</div>
            <p style="font-size:11px;color:#999;border-top:1px solid #eee;margin-top:24px;padding-top:8px">
              Templates only — not legal advice. Have qualified counsel review before execution.
            </p>
          </div>`,
        }],
      }),
    });
    return r.status === 202 || r.status === 200;
  } catch(e) {
    console.error('SendGrid error:', e.message);
    return false;
  }
}

// ── Agent 8: Daily Reporter ──────────────────────────────────────────
async function sendReport(stats) {
  const { OWNER_EMAIL } = cfg();
  if (!OWNER_EMAIL) return;
  const today = new Date().toDateString();
  const rows = (stats.clean_leads || [])
    .map(l => `• [${l.source.toUpperCase()}] Score ${l.score}/10 | ${l.topic} | ${l.summary}`)
    .join('\n');
  const emailBody = `
    <h2 style="color:#8B6914">BizLegal AI — Daily Lead Report</h2>
    <p>${today}</p>
    <table style="border-collapse:collapse;width:100%;font-size:13px">
      <tr style="background:#0F1A2E;color:white">
        <td style="padding:8px 12px">Source</td><td style="padding:8px 12px">Raw</td>
        <td style="padding:8px 12px">Qualified</td><td style="padding:8px 12px">Emails Sent</td>
      </tr>
      <tr><td style="padding:8px 12px">Quora (Serper)</td><td>${stats.quora}</td><td>—</td><td>—</td></tr>
      <tr style="background:#f9f9f9"><td style="padding:8px 12px">BiggerPockets</td><td>${stats.bp}</td><td>—</td><td>—</td></tr>
      <tr><td style="padding:8px 12px">LinkedIn (Serper+Apify)</td><td>${stats.linkedin}</td><td>—</td><td>—</td></tr>
      <tr style="background:#f9f9f9"><td style="padding:8px 12px">Google</td><td>${stats.google}</td><td>—</td><td>—</td></tr>
      <tr><td style="padding:8px 12px">Reddit (Apify)</td><td>${stats.reddit||0}</td><td>—</td><td>—</td></tr>
      <tr style="background:#f9f9f9"><td style="padding:8px 12px">Quora Deep (Apify)</td><td>${stats.apify_quora||0}</td><td>—</td><td>—</td></tr>
      <tr style="background:#0F1A2E;color:white;font-weight:bold">
        <td style="padding:8px 12px">TOTAL</td><td>${stats.total_raw}</td>
        <td>${stats.total_clean}</td><td>${stats.emails_sent}</td>
      </tr>
    </table>
    ${stats.clean_leads?.length ? `<h3 style="margin-top:20px">Qualified Leads</h3><pre style="background:#f5f5f5;padding:12px;font-size:12px">${rows}</pre>` : '<p style="color:#666">No actionable leads today.</p>'}
    <p style="font-size:11px;color:#999">BizLegal AI — docstack.bizlegal-ai.com</p>
  `;
  await sendEmail(
    OWNER_EMAIL,
    `BizLegal AI — ${stats.total_clean} leads today (${today})`,
    emailBody
  );
}

// ── Main Orchestrator ────────────────────────────────────────────────
export async function run() {
  console.log('=== BizLegal AI Lead Engine START ===');
  const stats = { quora:0, bp:0, linkedin:0, google:0, total_raw:0, total_clean:0, emails_sent:0, clean_leads:[] };

  // Phase 1: Scrape all sources in parallel (Serper + Apify)
  const [q, b, l, g, ali, ar, aq] = await Promise.allSettled([
    scrapeQuora(),
    scrapeBiggerPockets(),
    scrapeLinkedIn(),
    scrapeGoogle(),
    apifyLinkedIn(),
    apifyReddit(),
    apifyQuoraDeep(),
  ]);

  const quora       = q.status==='fulfilled'   ? q.value   : [];
  const bp          = b.status==='fulfilled'   ? b.value   : [];
  const linkedin    = l.status==='fulfilled'   ? l.value   : [];
  const google      = g.status==='fulfilled'   ? g.value   : [];
  const apifyLI     = ali.status==='fulfilled' ? ali.value : [];
  const apifyRD     = ar.status==='fulfilled'  ? ar.value  : [];
  const apifyQR     = aq.status==='fulfilled'  ? aq.value  : [];

  stats.quora=quora.length; stats.bp=bp.length;
  stats.linkedin=linkedin.length + apifyLI.length; stats.google=google.length;
  const all = [...quora, ...bp, ...linkedin, ...google, ...apifyLI, ...apifyRD, ...apifyQR];
  stats.total_raw = all.length;
  console.log(`Apify sources: LinkedIn=${apifyLI.length}, Reddit=${apifyRD.length}, Quora=${apifyQR.length}`);
  console.log(`Phase 1 done: ${stats.total_raw} raw leads`);

  // Phase 2: Qualify with Claude
  for (const lead of all) {
    const clean = await qualifyLead(lead);
    if (clean) {
      await dbInsertClean(clean);
      stats.clean_leads.push(clean);
    }
    await sleep(300);
  }
  stats.total_clean = stats.clean_leads.length;
  console.log(`Phase 2 done: ${stats.total_clean} qualified`);

  // Phase 3: Outreach (only leads with email address found)
  for (const lead of stats.clean_leads.filter(l => l.email)) {
    const email = await writeOutreach(lead);
    const sent = await sendEmail(lead.email, email.subject, email.body);
    if (sent) stats.emails_sent++;
    await sleep(500);
  }
  console.log(`Phase 3 done: ${stats.emails_sent} emails sent`);

  // Phase 4: Daily report to owner
  await sendReport(stats);

  console.log('=== BizLegal AI Lead Engine DONE ===');
  return stats;
}
