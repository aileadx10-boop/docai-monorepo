// /api/leadmagnet.js
// Captures email, stores lead in Supabase, sends free NDA + checklist via SendGrid

const FREE_NDA_MARKDOWN = `# NON-CIRCUMVENTION & NON-DISCLOSURE AGREEMENT

**TEMPLATE ONLY — NOT LEGAL ADVICE. Have qualified counsel review before execution.**

This Non-Circumvention and Non-Disclosure Agreement ("Agreement") is entered into as of the date of electronic acceptance between the parties identified below.

## ARTICLE I — DEFINITIONS

**"Confidential Information"** means any and all non-public information disclosed by one party ("Disclosing Party") to the other party ("Receiving Party"), whether orally, in writing, electronically, or by any other means, including but not limited to business plans, deal sources, investor contacts, counterparty identities, financial projections, transaction structures, and proprietary methodologies.

**"Deal"** means any transaction, investment, business opportunity, or commercial arrangement introduced or facilitated by the Disclosing Party.

**"Circumvention"** means any direct or indirect attempt to bypass, avoid, or exclude the Disclosing Party from a Deal or business relationship introduced by the Disclosing Party.

**"Receiving Party"** means the party receiving Confidential Information and/or introductions.

**"Term"** means the period of three (3) years from the date of this Agreement.

## ARTICLE II — NON-DISCLOSURE OBLIGATIONS

### Section 2.1 — Confidentiality
The Receiving Party agrees to: (a) hold all Confidential Information in strict confidence; (b) not disclose Confidential Information to any third party without prior written consent; (c) use Confidential Information solely for the purpose of evaluating and pursuing the Deal; (d) limit access to Confidential Information to employees or advisors with a need-to-know.

### Section 2.2 — Exceptions
Confidentiality obligations do not apply to information that: (a) was publicly known at the time of disclosure; (b) became publicly known through no breach of this Agreement; (c) was independently developed without use of Confidential Information; (d) is required to be disclosed by law or court order, provided prompt written notice is given.

## ARTICLE III — NON-CIRCUMVENTION

### Section 3.1 — Non-Circumvention Covenant
The Receiving Party agrees not to, directly or indirectly: (a) initiate contact with, solicit, or enter into any agreement with any person, entity, investor, buyer, seller, or counterparty introduced by the Disclosing Party; (b) attempt to circumvent, avoid, or bypass the Disclosing Party in any transaction arising from or related to Confidential Information; (c) take any action designed to exclude the Disclosing Party from a Deal or the economic benefits thereof.

### Section 3.2 — Duration
The non-circumvention obligations survive for the Term and shall apply to any transaction, whether direct or indirect, that arises from an introduction made during the Term.

### Section 3.3 — Compensation for Breach
In the event of circumvention, the breaching party shall pay the aggrieved party a sum equal to the fair market value of the benefit received through circumvention, plus consequential damages, plus reasonable attorney's fees.

## ARTICLE IV — WIRE FRAUD WARNING

> **⚠ WIRE FRAUD NOTICE:** Before executing any wire transfer in connection with a Deal, independently verify wiring instructions by telephone using a known, verified number — never rely solely on email instructions. Wire fraud is prevalent in real estate and commercial transactions.

## ARTICLE V — GENERAL PROVISIONS

### Section 5.1 — Governing Law
This Agreement shall be governed by the laws of the State of New York, without regard to conflict of law principles.

### Section 5.2 — Arbitration
Any dispute arising under this Agreement shall be resolved by binding arbitration administered by the American Arbitration Association ("AAA") under its Commercial Arbitration Rules, in New York County, New York. Judgment on the award may be entered in any court of competent jurisdiction.

### Section 5.3 — E-SIGN Compliance
The parties agree that electronic signatures are legally binding and constitute valid execution of this Agreement pursuant to the Electronic Signatures in Global and National Commerce Act (E-SIGN Act, 15 U.S.C. § 7001 et seq.).

### Section 5.4 — Attorneys' Fees
In any proceeding to enforce this Agreement, the prevailing party shall be entitled to recover reasonable attorneys' fees and costs.

### Section 5.5 — Severability
If any provision is held unenforceable, the remaining provisions remain in full force.

### Section 5.6 — Integration
This Agreement constitutes the entire agreement regarding its subject matter and supersedes all prior understandings.

### Section 5.7 — Counterparts
This Agreement may be executed in counterparts, each of which shall be deemed an original.

## SIGNATURE BLOCK

**DISCLOSING PARTY:**

Name: ___________________________

Title: ___________________________

Date:  ___________________________

Signature: _______________________


**RECEIVING PARTY:**

Name: ___________________________

Title: ___________________________

Date:  ___________________________

Signature: _______________________

---

## EXHIBIT A — DEAL PROTECTION CHECKLIST

*10 Things to Verify Before Signing Any Agreement*

1. **Parties identified** — Full legal names, entity types, and state of formation for all signatories
2. **Authority to sign** — Confirm the signatory has corporate authority (officer, managing member, or authorized agent)
3. **Non-circumvention language** — Explicit clause preventing the counterparty from going around you
4. **Duration is specified** — Clear start and end date for all obligations
5. **Governing law clause** — Which state's law applies and in which venue disputes are resolved
6. **Arbitration vs. litigation** — Know whether you're going to AAA arbitration or a state/federal court
7. **Wire fraud warning** — Written acknowledgment that wiring instructions must be verbally verified
8. **Confidentiality scope** — What information is covered, for how long, and with what carve-outs
9. **Remedy for breach** — What happens if someone violates the agreement (damages, injunctive relief, fees)
10. **Counterpart execution** — Can it be signed electronically? Are PDF/DocuSign signatures valid?

*— BizLegal AI · 20 years of deal protection, condensed into 10 questions.*
`;

const CHECKLIST_HTML = `
<div style="font-family:Georgia,serif;max-width:640px;color:#1a1208;padding:24px;line-height:1.7">
  <div style="border-bottom:3px solid #0066FF;padding-bottom:12px;margin-bottom:20px">
    <h1 style="font-size:22px;margin:0 0 4px 0;color:#0F1A2E">BizLegal AI</h1>
    <p style="font-size:12px;color:#888;margin:0">20+ Years of International Commercial Law · New York Licensed</p>
  </div>
  <h2 style="color:#0F1A2E;font-size:18px">Your Free Resources Are Attached</h2>
  <p>Thank you for downloading our free resources. Attached to this email you'll find:</p>
  <ol>
    <li><strong>Non-Circumvention NDA Template</strong> — attorney-drafted, ready for your next deal</li>
    <li><strong>Deal Protection Checklist</strong> — 10 questions to verify before signing anything</li>
  </ol>
  <p>These documents are templates only — not legal advice. We always recommend having qualified counsel review before execution.</p>
  <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
  <p><strong>Need a fully customised version</strong> with your parties, deal terms, and specific details filled in?</p>
  <p>Visit <a href="https://docstack.bizlegal-ai.com/#docs" style="color:#0066FF">docstack.bizlegal-ai.com</a> — generate your custom agreement in under 90 seconds, from $49.</p>
  <p>Or upload any contract you've received to our <a href="https://docstack.bizlegal-ai.com/#dd" style="color:#0066FF">Due Diligence tool</a> for a risk score and red flag analysis — $250 one-time.</p>
  <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
  <p style="font-size:11px;color:#999">Templates only — not legal advice. No attorney-client relationship. Have qualified counsel review before execution.<br>© 2025 BizLegal AI · Unsubscribe: reply with "unsubscribe"</p>
</div>
`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { name = '', email = '', use = '', source = 'lead-magnet' } = req.body || {};

  if (!email || !email.includes('@')) {
    return res.status(400).json({ ok: false, error: 'Invalid email' });
  }

  const SUPABASE_URL  = process.env.SUPABASE_URL;
  const SUPABASE_KEY  = process.env.SUPABASE_KEY;
  const SENDGRID_KEY  = process.env.SENDGRID_KEY;
  const FROM_EMAIL    = 'outreach@bizlegal-ai.com';

  // 1. Store lead in Supabase
  try {
    if (SUPABASE_URL && SUPABASE_KEY) {
      await fetch(`${SUPABASE_URL}/rest/v1/lead_magnets`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          name: name.trim(),
          use_case: use.trim(),
          source,
          created_at: new Date().toISOString(),
        }),
      });
    }
  } catch (e) {
    console.error('Supabase insert error:', e.message);
    // Non-fatal — continue to send email
  }

  // 2. Send free NDA + checklist via SendGrid
  try {
    if (!SENDGRID_KEY) throw new Error('SENDGRID_KEY not configured');

    const firstName = name ? name.split(' ')[0] : 'there';
    const subject   = 'Your Free NDA + Deal Protection Checklist — BizLegal AI';

    const emailBody = `
      <div style="font-family:Georgia,serif;max-width:600px;color:#1a1208">
        <p>Hi${firstName !== 'there' ? ` ${firstName}` : ''},</p>
        ${CHECKLIST_HTML}
      </div>
    `;

    const r = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SENDGRID_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: email.toLowerCase().trim() }] }],
        from: { email: FROM_EMAIL, name: 'BizLegal AI' },
        subject,
        content: [{ type: 'text/html', value: emailBody }],
        attachments: [
          {
            content: Buffer.from(FREE_NDA_MARKDOWN).toString('base64'),
            filename: 'BizLegal-AI-Non-Circumvention-NDA-Template.txt',
            type: 'text/plain',
            disposition: 'attachment',
          },
        ],
      }),
    });

    if (r.status !== 202 && r.status !== 200) {
      const errBody = await r.text();
      console.error('SendGrid error:', r.status, errBody);
      throw new Error(`SendGrid ${r.status}`);
    }
  } catch (e) {
    console.error('Email send error:', e.message);
    // Still return ok — lead is captured
  }

  return res.status(200).json({ ok: true });
}
