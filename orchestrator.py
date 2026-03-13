"""
BizLegal AI — Lead Generation Orchestrator
==========================================
Runs daily via Vercel Cron (or manually).
All secrets from environment variables — never hardcoded.

Agents:
  1. RedditScraper    — finds posts on legal subreddits
  2. QuoraScraper     — finds legal questions via Serper
  3. LinkedInScraper  — finds business posts via Serper
  4. GoogleScraper    — finds new businesses via Serper
  5. Qualifier        — Claude scores each lead 1-10
  6. OutreachWriter   — Claude writes personalised email per lead
  7. Sender           — SendGrid delivers emails
  8. Reporter         — daily summary email to you
"""

import os, json, time, hashlib, datetime, requests
from typing import Optional

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CONFIG — all from environment variables
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLAUDE_KEY      = os.environ['CLAUDE_KEY']
SENDGRID_KEY    = os.environ['SENDGRID_KEY']
SERPER_KEY      = os.environ['SERPER_KEY']
REDDIT_ID       = os.environ['REDDIT_CLIENT_ID']
REDDIT_SECRET   = os.environ['REDDIT_CLIENT_SECRET']
SUPABASE_URL    = os.environ['SUPABASE_URL']
SUPABASE_KEY    = os.environ['SUPABASE_KEY']
OWNER_EMAIL     = os.environ['OWNER_EMAIL']        # your email for daily report
SITE_URL        = 'https://bizlegal-ai.com'
FROM_EMAIL      = f'outreach@bizlegal-ai.com'
FROM_NAME       = 'BizLegal AI'

# Supabase headers
SB_HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal',
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CLAUDE HELPER
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def claude(system: str, user: str, max_tokens: int = 1000, json_mode: bool = False) -> str:
    """Single Claude API call."""
    resp = requests.post(
        'https://api.anthropic.com/v1/messages',
        headers={
            'x-api-key': CLAUDE_KEY,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
        },
        json={
            'model': 'claude-sonnet-4-6',
            'max_tokens': max_tokens,
            'system': system,
            'messages': [{'role': 'user', 'content': user}],
        },
        timeout=60,
    )
    resp.raise_for_status()
    text = resp.json()['content'][0]['text'].strip()
    if json_mode:
        # Strip markdown fences if present
        text = text.replace('```json', '').replace('```', '').strip()
    return text


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SUPABASE HELPERS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def db_seen(lead_id: str) -> bool:
    """Check if we already processed this lead."""
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/leads_raw?lead_id=eq.{lead_id}&select=lead_id',
        headers=SB_HEADERS
    )
    return len(r.json()) > 0

def db_insert_raw(lead: dict):
    requests.post(
        f'{SUPABASE_URL}/rest/v1/leads_raw',
        headers=SB_HEADERS,
        json=lead
    )

def db_insert_clean(lead: dict):
    requests.post(
        f'{SUPABASE_URL}/rest/v1/leads_clean',
        headers=SB_HEADERS,
        json=lead
    )

def db_get_todays_clean() -> list:
    today = datetime.date.today().isoformat()
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/leads_clean?created_at=gte.{today}&select=*',
        headers=SB_HEADERS
    )
    return r.json() if r.ok else []


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# AGENT 1 — REDDIT SCRAPER
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REDDIT_SUBS = [
    'legaladvice', 'realestateinvesting', 'realestate',
    'smallbusiness', 'entrepreneur', 'startups',
    'personalfinance', 'investing', 'landlord',
]

REDDIT_KEYWORDS = [
    'contract', 'agreement', 'NDA', 'joint venture', 'JV deal',
    'need a lawyer', 'legal help', 'protect myself', 'letter of intent',
    'LOI', 'partnership agreement', 'investor', 'syndication',
    'real estate deal', 'LLC', 'operating agreement',
]

def reddit_token() -> str:
    r = requests.post(
        'https://www.reddit.com/api/v1/access_token',
        auth=(REDDIT_ID, REDDIT_SECRET),
        data={'grant_type': 'client_credentials'},
        headers={'User-Agent': 'BizLegalBot/1.0'},
    )
    return r.json()['access_token']

def scrape_reddit() -> list:
    print('  [Reddit] Scraping...')
    leads = []
    try:
        token = reddit_token()
        headers = {
            'Authorization': f'Bearer {token}',
            'User-Agent': 'BizLegalBot/1.0',
        }
        for sub in REDDIT_SUBS:
            r = requests.get(
                f'https://oauth.reddit.com/r/{sub}/new.json?limit=25',
                headers=headers,
                timeout=15,
            )
            if not r.ok:
                continue
            posts = r.json().get('data', {}).get('children', [])
            for post in posts:
                d = post['data']
                text = f"{d.get('title','')} {d.get('selftext','')[:500]}"
                # Check if any keyword matches
                if any(kw.lower() in text.lower() for kw in REDDIT_KEYWORDS):
                    lead_id = hashlib.md5(d['id'].encode()).hexdigest()
                    if db_seen(lead_id):
                        continue
                    lead = {
                        'lead_id': lead_id,
                        'source': 'reddit',
                        'subreddit': sub,
                        'title': d.get('title', '')[:200],
                        'body': d.get('selftext', '')[:1000],
                        'url': f"https://reddit.com{d.get('permalink','')}",
                        'author': d.get('author', ''),
                        'created_at': datetime.datetime.utcnow().isoformat(),
                    }
                    db_insert_raw(lead)
                    leads.append(lead)
            time.sleep(1)  # rate limit
    except Exception as e:
        print(f'  [Reddit] Error: {e}')
    print(f'  [Reddit] Found {len(leads)} new leads')
    return leads


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# AGENT 2 — QUORA SCRAPER (via Serper)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QUORA_QUERIES = [
    'site:quora.com "real estate contract" "need help"',
    'site:quora.com "joint venture agreement" "how to"',
    'site:quora.com "NDA" "real estate" "do I need"',
    'site:quora.com "letter of intent" "real estate"',
    'site:quora.com "partnership agreement" "real estate investor"',
]

def scrape_quora() -> list:
    print('  [Quora] Scraping...')
    leads = []
    try:
        for query in QUORA_QUERIES:
            r = requests.post(
                'https://google.serper.dev/search',
                headers={'X-API-KEY': SERPER_KEY, 'Content-Type': 'application/json'},
                json={'q': query, 'num': 5},
                timeout=15,
            )
            if not r.ok:
                continue
            results = r.json().get('organic', [])
            for res in results:
                lead_id = hashlib.md5(res.get('link','').encode()).hexdigest()
                if db_seen(lead_id):
                    continue
                lead = {
                    'lead_id': lead_id,
                    'source': 'quora',
                    'title': res.get('title', '')[:200],
                    'body': res.get('snippet', '')[:1000],
                    'url': res.get('link', ''),
                    'author': '',
                    'created_at': datetime.datetime.utcnow().isoformat(),
                }
                db_insert_raw(lead)
                leads.append(lead)
            time.sleep(1)
    except Exception as e:
        print(f'  [Quora] Error: {e}')
    print(f'  [Quora] Found {len(leads)} new leads')
    return leads


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# AGENT 3 — LINKEDIN SCRAPER (via Serper)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LINKEDIN_QUERIES = [
    'site:linkedin.com "closing a real estate deal" "need contract"',
    'site:linkedin.com "joint venture" "real estate" "looking for"',
    'site:linkedin.com "raising capital" "real estate" "syndication"',
    'site:linkedin.com "new business" "partnership" "agreement"',
    'site:linkedin.com "investor" "term sheet" "due diligence"',
]

def scrape_linkedin() -> list:
    print('  [LinkedIn] Scraping...')
    leads = []
    try:
        for query in LINKEDIN_QUERIES:
            r = requests.post(
                'https://google.serper.dev/search',
                headers={'X-API-KEY': SERPER_KEY, 'Content-Type': 'application/json'},
                json={'q': query, 'num': 5},
                timeout=15,
            )
            if not r.ok:
                continue
            results = r.json().get('organic', [])
            for res in results:
                lead_id = hashlib.md5(res.get('link','').encode()).hexdigest()
                if db_seen(lead_id):
                    continue
                lead = {
                    'lead_id': lead_id,
                    'source': 'linkedin',
                    'title': res.get('title', '')[:200],
                    'body': res.get('snippet', '')[:1000],
                    'url': res.get('link', ''),
                    'author': '',
                    'created_at': datetime.datetime.utcnow().isoformat(),
                }
                db_insert_raw(lead)
                leads.append(lead)
            time.sleep(1)
    except Exception as e:
        print(f'  [LinkedIn] Error: {e}')
    print(f'  [LinkedIn] Found {len(leads)} new leads')
    return leads


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# AGENT 4 — GOOGLE MAPS SCRAPER (new businesses via Serper)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GOOGLE_QUERIES = [
    '"real estate investor" "new" -site:linkedin.com -site:reddit.com',
    '"property management company" "new" "LLC" -site:linkedin.com',
    '"real estate fund" "raising" "investors" 2024 OR 2025',
    '"commercial real estate" "joint venture" "seeking partners"',
    '"startup" "term sheet" "investors" "legal"',
]

def scrape_google() -> list:
    print('  [Google] Scraping...')
    leads = []
    try:
        for query in GOOGLE_QUERIES:
            r = requests.post(
                'https://google.serper.dev/search',
                headers={'X-API-KEY': SERPER_KEY, 'Content-Type': 'application/json'},
                json={'q': query, 'num': 5, 'tbs': 'qdr:w'},  # past week
                timeout=15,
            )
            if not r.ok:
                continue
            results = r.json().get('organic', [])
            for res in results:
                lead_id = hashlib.md5(res.get('link','').encode()).hexdigest()
                if db_seen(lead_id):
                    continue
                lead = {
                    'lead_id': lead_id,
                    'source': 'google',
                    'title': res.get('title', '')[:200],
                    'body': res.get('snippet', '')[:1000],
                    'url': res.get('link', ''),
                    'author': '',
                    'created_at': datetime.datetime.utcnow().isoformat(),
                }
                db_insert_raw(lead)
                leads.append(lead)
            time.sleep(1)
    except Exception as e:
        print(f'  [Google] Error: {e}')
    print(f'  [Google] Found {len(leads)} new leads')
    return leads


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# AGENT 5 — CLAUDE QUALIFIER
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def qualify_lead(lead: dict) -> Optional[dict]:
    """
    Claude scores the lead and extracts structured data.
    Returns None if score < 6 (not actionable).
    """
    text = f"Title: {lead['title']}\n\nContent: {lead['body']}\n\nURL: {lead['url']}"

    result = claude(
        system="""You are a legal business development analyst.
Analyse this post/result and return JSON only:
{
  "score": 1-10,
  "topic": "JV Agreement|NDA|LOI|Commission|Capital Call|Property Mgmt|Subscription|Guarantee|General",
  "urgency": "high|medium|low",
  "summary": "1 sentence describing the need",
  "has_email": true/false,
  "email": "extracted email or null",
  "actionable": true/false
}
Score 8-10: clear legal document need, real estate/business deal
Score 5-7: general interest, could use a document
Score 1-4: not relevant
Return ONLY valid JSON, no explanation.""",
        user=text,
        max_tokens=300,
        json_mode=True,
    )

    try:
        data = json.loads(result)
        if not data.get('actionable') or data.get('score', 0) < 6:
            return None

        # Map topic to DocStack document key + URL
        topic_map = {
            'JV Agreement':   ('jv',           f'{SITE_URL}/#docs'),
            'NDA':            ('nda',           f'{SITE_URL}/#docs'),
            'LOI':            ('loi',           f'{SITE_URL}/#docs'),
            'Commission':     ('commission',    f'{SITE_URL}/#docs'),
            'Capital Call':   ('capital_call',  f'{SITE_URL}/#docs'),
            'Property Mgmt':  ('property_mgmt', f'{SITE_URL}/#docs'),
            'Subscription':   ('subscription',  f'{SITE_URL}/#docs'),
            'Guarantee':      ('guarantee',     f'{SITE_URL}/#docs'),
            'General':        ('bundle',        f'{SITE_URL}/#docs'),
        }
        doc_key, doc_url = topic_map.get(data['topic'], ('bundle', f'{SITE_URL}/#docs'))

        return {
            'lead_id':   lead['lead_id'],
            'source':    lead['source'],
            'url':       lead['url'],
            'author':    lead.get('author', ''),
            'email':     data.get('email'),
            'score':     data['score'],
            'topic':     data['topic'],
            'urgency':   data['urgency'],
            'summary':   data['summary'],
            'doc_key':   doc_key,
            'doc_url':   doc_url,
            'emailed':   False,
            'created_at': datetime.datetime.utcnow().isoformat(),
        }
    except Exception as e:
        print(f'    [Qualifier] Parse error: {e}')
        return None


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# AGENT 6 — OUTREACH WRITER
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DOC_LABELS = {
    'jv':           'Joint Venture Agreement',
    'nda':          'Non-Circumvention NDA',
    'loi':          'Letter of Intent',
    'commission':   'Commission Protection Agreement',
    'capital_call': 'Capital Call Agreement',
    'property_mgmt':'Property Management Agreement',
    'subscription': 'Investor Subscription Agreement',
    'guarantee':    'Personal Guarantee',
    'bundle':       'Full Legal Document Library',
}

def write_outreach(lead: dict) -> dict:
    """Claude writes a personalised outreach email."""
    doc_label = DOC_LABELS.get(lead['doc_key'], 'Legal Document')

    email_text = claude(
        system=f"""You are a helpful legal document assistant at BizLegal AI.
Write a SHORT, non-spammy outreach email (max 120 words).
Tone: professional, helpful, no pressure.
Always mention their specific need. Never say "I saw your post."
End with a single call to action linking to: {lead['doc_url']}
No subject line — just the body. No placeholders.""",
        user=f"""Lead summary: {lead['summary']}
Topic: {lead['topic']}
Document they likely need: {doc_label}
Source: {lead['source']}
Write the outreach email body now.""",
        max_tokens=300,
    )

    subject = claude(
        system='Write a concise email subject line (max 8 words). No quotes. Just the subject.',
        user=f"Email about: {doc_label} for someone who needs: {lead['summary']}",
        max_tokens=30,
    )

    return {'subject': subject.strip(), 'body': email_text.strip()}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# AGENT 7 — SENDGRID SENDER
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def send_email(to: str, subject: str, body: str) -> bool:
    """Send via SendGrid."""
    html_body = body.replace('\n', '<br>')
    r = requests.post(
        'https://api.sendgrid.com/v3/mail/send',
        headers={
            'Authorization': f'Bearer {SENDGRID_KEY}',
            'Content-Type': 'application/json',
        },
        json={
            'personalizations': [{'to': [{'email': to}]}],
            'from': {'email': FROM_EMAIL, 'name': FROM_NAME},
            'subject': subject,
            'content': [
                {'type': 'text/plain', 'value': body},
                {'type': 'text/html',  'value': f"""
                <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1a1208">
                  <div style="border-bottom:2px solid #C9A84C;padding-bottom:12px;margin-bottom:20px">
                    <strong style="color:#8B6914">BizLegal AI</strong>
                  </div>
                  <div style="line-height:1.7">{html_body}</div>
                  <div style="border-top:1px solid #eee;margin-top:24px;padding-top:12px;
                       font-size:11px;color:#999">
                    Templates only — not legal advice. 
                    <a href="{SITE_URL}/unsubscribe">Unsubscribe</a>
                  </div>
                </div>"""},
            ],
        },
        timeout=15,
    )
    return r.status_code in (200, 202)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# AGENT 8 — DAILY REPORTER
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def send_daily_report(stats: dict):
    """Send you a daily summary of what the system did."""
    today = datetime.date.today().strftime('%B %d, %Y')

    rows = '\n'.join([
        f"  • {l['source'].upper()} | Score {l['score']}/10 | {l['topic']} | {l['summary'][:80]}"
        for l in stats.get('clean_leads', [])
    ])

    body = f"""BizLegal AI — Daily Lead Report
{today}
{'='*50}

SCRAPED TODAY
  Reddit:   {stats['reddit_count']} new leads
  Quora:    {stats['quora_count']} new leads
  LinkedIn: {stats['linkedin_count']} new leads
  Google:   {stats['google_count']} new leads
  Total:    {stats['total_raw']} raw → {stats['total_clean']} actionable

ACTIONABLE LEADS
{rows if rows else '  None today'}

EMAILS SENT:  {stats['emails_sent']}
EMAILS FAILED: {stats['emails_failed']}

{'='*50}
View all leads: {SUPABASE_URL} (leads_clean table)
"""

    send_email(
        to=OWNER_EMAIL,
        subject=f'BizLegal AI — {stats["total_clean"]} leads today ({today})',
        body=body,
    )
    print(f'  [Reporter] Daily report sent to {OWNER_EMAIL}')


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ORCHESTRATOR — main loop
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def run():
    print(f'\n{"="*60}')
    print(f'BizLegal AI — Lead Engine starting {datetime.datetime.utcnow()}')
    print(f'{"="*60}\n')

    stats = {
        'reddit_count': 0, 'quora_count': 0,
        'linkedin_count': 0, 'google_count': 0,
        'total_raw': 0, 'total_clean': 0,
        'emails_sent': 0, 'emails_failed': 0,
        'clean_leads': [],
    }

    # ── Phase 1: Scrape ────────────────────────────────────────────────────
    print('PHASE 1 — SCRAPING')
    reddit_leads   = scrape_reddit()
    quora_leads    = scrape_quora()
    linkedin_leads = scrape_linkedin()
    google_leads   = scrape_google()

    stats['reddit_count']   = len(reddit_leads)
    stats['quora_count']    = len(quora_leads)
    stats['linkedin_count'] = len(linkedin_leads)
    stats['google_count']   = len(google_leads)

    all_leads = reddit_leads + quora_leads + linkedin_leads + google_leads
    stats['total_raw'] = len(all_leads)
    print(f'\n  Total raw leads: {len(all_leads)}\n')

    # ── Phase 2: Qualify ───────────────────────────────────────────────────
    print('PHASE 2 — QUALIFYING')
    clean_leads = []
    for i, lead in enumerate(all_leads):
        print(f'  Qualifying {i+1}/{len(all_leads)}: {lead["title"][:60]}...')
        qualified = qualify_lead(lead)
        if qualified:
            db_insert_clean(qualified)
            clean_leads.append(qualified)
            print(f'    ✓ Score {qualified["score"]}/10 — {qualified["topic"]}')
        else:
            print(f'    ✗ Not actionable')
        time.sleep(0.5)  # rate limit

    stats['total_clean'] = len(clean_leads)
    stats['clean_leads'] = clean_leads
    print(f'\n  Actionable leads: {len(clean_leads)}\n')

    # ── Phase 3: Outreach ──────────────────────────────────────────────────
    print('PHASE 3 — OUTREACH')
    # Only send to leads that have an email address
    emailable = [l for l in clean_leads if l.get('email')]
    print(f'  Leads with email: {len(emailable)}')

    for lead in emailable:
        print(f'  Writing email for: {lead["summary"][:50]}...')
        email_content = write_outreach(lead)
        sent = send_email(
            to=lead['email'],
            subject=email_content['subject'],
            body=email_content['body'],
        )
        if sent:
            stats['emails_sent'] += 1
            print(f'    ✓ Sent to {lead["email"]}')
        else:
            stats['emails_failed'] += 1
            print(f'    ✗ Failed: {lead["email"]}')
        time.sleep(1)

    # ── Phase 4: Report ────────────────────────────────────────────────────
    print('\nPHASE 4 — DAILY REPORT')
    send_daily_report(stats)

    print(f'\n{"="*60}')
    print(f'Done. {stats["total_clean"]} leads, {stats["emails_sent"]} emails sent.')
    print(f'{"="*60}\n')

    return stats


# ── Entry point ─────────────────────────────────────────────────────────────
if __name__ == '__main__':
    run()
