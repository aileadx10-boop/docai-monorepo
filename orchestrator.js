import fetch from 'node-fetch';
import crypto from 'crypto';

const cfg = () => ({
  CLAUDE_KEY:     process.env.CLAUDE_KEY     || '',
  SENDGRID_KEY:   process.env.SENDGRID_KEY   || '',
  SERPER_KEY:     process.env.SERPER_KEY     || '',
  REDDIT_ID:      process.env.REDDIT_CLIENT_ID     || '',
  REDDIT_SECRET:  process.env.REDDIT_CLIENT_SECRET || '',
  SUPABASE_URL:   process.env.SUPABASE_URL   || '',
  SUPABASE_KEY:   process.env.SUPABASE_KEY   || '',
  OWNER_EMAIL:    process.env.OWNER_EMAIL    || '',
  SITE_URL:       'https://bizlegal-ai.com',
  FROM_EMAIL:     'outreach@bizlegal-ai.com',
});

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Claude ──────────────────────────────────────────────────────────
async function claude(system, user, maxTokens = 1000) {
  const { CLAUDE_KEY } = cfg();
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': CLAUDE_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  const d = await r.json();
  return d.content[0].text.trim();
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
  const r = await fetch(`${SUPABASE_URL}/rest/v1/leads_raw?lead_id=eq.${leadId}&select=lead_id`, { headers: sbHeaders() });
  const d = await r.json();
  return Array.isArray(d) && d.length > 0;
}

async function dbInsertRaw(lead) {
  const { SUPABASE_URL } = cfg();
  await fetch(`${SUPABASE_URL}/rest/v1/leads_raw`, { method: 'POST', headers: sbHeaders(), body: JSON.stringify(lead) });
}

async function dbInsertClean(lead) {
  const { SUPABASE_URL } = cfg();
  await fetch(`${SUPABASE_URL}/rest/v1/leads_clean`, { method: 'POST', headers: sbHeaders(), body: JSON.stringify(lead) });
}

// ── Agent 1: Reddit ──────────────────────────────────────────────────
const REDDIT_SUBS = ['legaladvice','realestateinvesting','realestate','smallbusiness','entrepreneur','startups','landlord'];
const REDDIT_KEYWORDS = ['contract','agreement','NDA','joint venture','letter of intent','LOI','partnership','investor','syndication','real estate deal'];

async function scrapeReddit() {
  const { REDDIT_ID, REDDIT_SECRET } = cfg();
  const leads = [];
  try {
    const tokenR = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${REDDIT_ID}:${REDDIT_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'BizLegalBot/1.0',
      },
      body: 'grant_type=client_credentials',
    });
    const { access_token } = await tokenR.json();
    const headers = { Authorization: `Bearer ${access_token}`, 'User-Agent': 'BizLegalBot/1.0' };

    for (const sub of REDDIT_SUBS) {
      const r = await fetch(`https://oauth.reddit.com/r/${sub}/new.json?limit=25`, { headers });
      if (!r.ok) continue;
      const { data } = await r.json();
      for (const post of data.children) {
        const d = post.data;
        const text = `${d.title} ${d.selftext || ''}`.toLowerCase();
        if (!REDDIT_KEYWORDS.some(k => text.includes(k.toLowerCase()))) continue;
        const leadId = crypto.createHash('md5').update(d.id).digest('hex');
        if (await dbSeen(leadId)) continue;
        const lead = { lead_id: leadId, source: 'reddit', subreddit: sub, title: d.title.slice(0,200), body: (d.selftext||'').slice(0,1000), url: `https://reddit.com${d.permalink}`, author: d.author, created_at: new Date().toISOString() };
        await dbInsertRaw(lead);
        leads.push(lead);
      }
      await sleep(1000);
    }
  } catch(e) { console.error('Reddit error:', e.message); }
  console.log(`[Reddit] ${leads.length} leads`);
  return leads;
}

// ── Agent 2-4: Serper (Quora + LinkedIn + Google) ────────────────────
const QUERIES = {
  quora: [
    'site:quora.com "real estate contract" "need help"',
    'site:quora.com "joint venture agreement" "how to"',
    'site:quora.com "NDA" "real estate" "do I need"',
  ],
  linkedin: [
    'site:linkedin.com "joint venture" "real estate" "looking for"',
    'site:linkedin.com "raising capital" "real estate" "syndication"',
  ],
  google: [
    '"real estate investor" "new LLC" "partnership agreement"',
    '"commercial real estate" "joint venture" "seeking partners"',
    '"startup" "term sheet" "investors" "legal" 2025',
  ],
};

async function scrapeSerper(source) {
  const { SERPER_KEY } = cfg();
  const leads = [];
  for (const q of QUERIES[source]) {
    try {
      const r = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: { 'X-API-KEY': SERPER_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q, num: 5, ...(source === 'google' ? { tbs: 'qdr:w' } : {}) }),
      });
      const d = await r.json();
      for (const res of (d.organic || [])) {
        const leadId = crypto.createHash('md5').update(res.link||'').digest('hex');
        if (await dbSeen(leadId)) continue;
        const lead = { lead_id: leadId, source, title: (res.title||'').slice(0,200), body: (res.snippet||'').slice(0,1000), url: res.link||'', author: '', created_at: new Date().toISOString() };
        await dbInsertRaw(lead);
        leads.push(lead);
      }
      await sleep(1000);
    } catch(e) { console.error(`${source} error:`, e.message); }
  }
  console.log(`[${source}] ${leads.length} leads`);
  return leads;
}

// ── Agent 5: Qualifier ───────────────────────────────────────────────
const TOPIC_MAP = {
  'JV Agreement':   ['jv',           'https://bizlegal-ai.com/#docs'],
  'NDA':            ['nda',          'https://bizlegal-ai.com/#docs'],
  'LOI':            ['loi',          'https://bizlegal-ai.com/#docs'],
  'Commission':     ['commission',   'https://bizlegal-ai.com/#docs'],
  'Capital Call':   ['capital_call', 'https://bizlegal-ai.com/#docs'],
  'Property Mgmt':  ['property_mgmt','https://bizlegal-ai.com/#docs'],
  'Subscription':   ['subscription', 'https://bizlegal-ai.com/#docs'],
  'Guarantee':      ['guarantee',    'https://bizlegal-ai.com/#docs'],
  'General':        ['bundle',       'https://bizlegal-ai.com/#docs'],
};

async function qualifyLead(lead) {
  const text = `Title: ${lead.title}\nContent: ${lead.body}\nURL: ${lead.url}`;
  const raw = await claude(
    `Analyse this post and return JSON only:
{"score":1-10,"topic":"JV Agreement|NDA|LOI|Commission|Capital Call|Property Mgmt|Subscription|Guarantee|General","urgency":"high|medium|low","summary":"1 sentence","has_email":true/false,"email":"extracted or null","actionable":true/false}
Score 8-10: clear legal doc need. Score 5-7: general interest. Score 1-4: not relevant.
Return ONLY valid JSON.`,
    text, 300
  );
  try {
    const data = JSON.parse(raw.replace(/```json|```/g,'').trim());
    if (!data.actionable || data.score < 6) return null;
    const [docKey, docUrl] = TOPIC_MAP[data.topic] || TOPIC_MAP['General'];
    return { lead_id: lead.lead_id, source: lead.source, url: lead.url, author: lead.author||'', email: data.email||null, score: data.score, topic: data.topic, urgency: data.urgency, summary: data.summary, doc_key: docKey, doc_url: docUrl, emailed: false, created_at: new Date().toISOString() };
  } catch { return null; }
}

// ── Agent 6: Outreach Writer ─────────────────────────────────────────
const DOC_LABELS = { jv:'Joint Venture Agreement', nda:'Non-Circumvention NDA', loi:'Letter of Intent', commission:'Commission Protection Agreement', capital_call:'Capital Call Agreement', property_mgmt:'Property Management Agreement', subscription:'Investor Subscription Agreement', guarantee:'Personal Guarantee', bundle:'Full Legal Document Library' };

async function writeOutreach(lead) {
  const docLabel = DOC_LABELS[lead.doc_key] || 'Legal Document';
  const body = await claude(
    `You are a helpful legal document assistant at BizLegal AI. Write a SHORT non-spammy outreach email (max 120 words). Professional, helpful, no pressure. Mention their specific need. Never say "I saw your post." End with a single CTA linking to: ${lead.doc_url}. No subject line, no placeholders.`,
    `Lead summary: ${lead.summary}\nDocument they need: ${docLabel}`, 300
  );
  const subject = await claude(
    'Write a concise email subject line (max 8 words). No quotes. Just the subject.',
    `Email about: ${docLabel} for: ${lead.summary}`, 30
  );
  return { subject: subject.trim(), body: body.trim() };
}

// ── Agent 7: SendGrid ────────────────────────────────────────────────
async function sendEmail(to, subject, body) {
  const { SENDGRID_KEY, FROM_EMAIL } = cfg();
  const r = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${SENDGRID_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: FROM_EMAIL, name: 'BizLegal AI' },
      subject,
      content: [{ type: 'text/html', value: `<div style="font-family:Georgia,serif;max-width:560px;color:#1a1208"><p style="border-bottom:2px solid #C9A84C;padding-bottom:8px"><strong style="color:#8B6914">BizLegal AI</strong></p><div style="line-height:1.7">${body.replace(/\n/g,'<br>')}</div><p style="font-size:11px;color:#999;border-top:1px solid #eee;margin-top:20px">Templates only — not legal advice.</p></div>` }],
    }),
  });
  return r.status === 202 || r.status === 200;
}

// ── Agent 8: Daily Reporter ──────────────────────────────────────────
async function sendReport(stats) {
  const { OWNER_EMAIL } = cfg();
  const today = new Date().toDateString();
  const rows = (stats.clean_leads||[]).map(l => `• ${l.source.toUpperCase()} | Score ${l.score}/10 | ${l.topic} | ${l.summary?.slice(0,80)}`).join('\n');
  const body = `BizLegal AI — Daily Report\n${today}\n${'='.repeat(40)}\n\nScraped: Reddit ${stats.reddit} · Quora ${stats.quora} · LinkedIn ${stats.linkedin} · Google ${stats.google}\nTotal: ${stats.total_raw} raw → ${stats.total_clean} actionable\nEmails sent: ${stats.emails_sent}\n\n${rows||'No actionable leads today'}`;
  await sendEmail(OWNER_EMAIL, `BizLegal AI — ${stats.total_clean} leads today (${today})`, body);
}

// ── Orchestrator ─────────────────────────────────────────────────────
export async function run() {
  console.log('=== BizLegal AI Lead Engine ===');
  const stats = { reddit:0, quora:0, linkedin:0, google:0, total_raw:0, total_clean:0, emails_sent:0, emails_failed:0, clean_leads:[] };

  // Phase 1: Scrape
  const [r, q, l, g] = await Promise.allSettled([
    scrapeReddit(),
    scrapeSerper('quora'),
    scrapeSerper('linkedin'),
    scrapeSerper('google'),
  ]);
  const reddit   = r.status==='fulfilled' ? r.value : [];
  const quora    = q.status==='fulfilled' ? q.value : [];
  const linkedin = l.status==='fulfilled' ? l.value : [];
  const google   = g.status==='fulfilled' ? g.value : [];

  stats.reddit=reddit.length; stats.quora=quora.length; stats.linkedin=linkedin.length; stats.google=google.length;
  const all = [...reddit,...quora,...linkedin,...google];
  stats.total_raw = all.length;

  // Phase 2: Qualify
  for (const lead of all) {
    const clean = await qualifyLead(lead);
    if (clean) { await dbInsertClean(clean); stats.clean_leads.push(clean); }
    await sleep(500);
  }
  stats.total_clean = stats.clean_leads.length;

  // Phase 3: Outreach (only leads with email)
  for (const lead of stats.clean_leads.filter(l => l.email)) {
    const email = await writeOutreach(lead);
    const sent = await sendEmail(lead.email, email.subject, email.body);
    if (sent) stats.emails_sent++; else stats.emails_failed++;
    await sleep(1000);
  }

  // Phase 4: Report
  await sendReport(stats);

  console.log(`Done: ${stats.total_clean} leads, ${stats.emails_sent} emails`);
  return stats;
}
