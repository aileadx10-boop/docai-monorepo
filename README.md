# DocStack — Attorney-Drafted Legal Templates

Single-file deployment. No backend. No server. Claude API runs in the browser.

## Stack
- Frontend: `index.html` (single file → Vercel)
- Payments: Lemon Squeezy (embedded checkout)
- Generation: Claude API (direct from browser)
- Email: Resend API (direct from browser)
- DOCX: JSZip (in-browser zip builder)
- PDF: HTML → browser print

## Files
```
docstack/
├── index.html          ← entire app (1,373 lines)
├── vercel.json         ← routing + security headers
├── legal/
│   ├── disclaimer.html
│   ├── terms.html
│   └── privacy.html
└── templates/          ← 8 pre-built .docx templates
    ├── jv.docx
    ├── nda.docx
    ├── loi.docx
    ├── commission.docx
    ├── capital_call.docx
    ├── property_mgmt.docx
    ├── subscription.docx
    └── guarantee.docx
```

## Setup (3 steps)
1. Fill 3 API keys in index.html (lines ~565-567)
2. Add Lemon Squeezy product URLs (lines ~570-580)
3. Drag folder to vercel.com → live

## Keys needed
- CLAUDE_KEY   → console.anthropic.com
- RESEND_KEY   → resend.com
- EMAIL_DOMAIN → your domain
- LSQ_LINKS    → lemonsqueezy.com (one per document)
