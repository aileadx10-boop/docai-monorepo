export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { to, subject, docName, base64, isHtmlBody, body: htmlBody } = req.body;

  try {
    let content, attachments = [];

    if (isHtmlBody && htmlBody) {
      // HTML email body (for DD reports)
      content = [{ type: 'text/html', value: htmlBody }];
    } else {
      // Standard email with text + docx attachment
      content = [{
        type: 'text/html',
        value: `<div style="font-family:Georgia,serif;max-width:560px">
          <h2 style="color:#00C8FF;border-bottom:2px solid #00C8FF;padding-bottom:8px">BizLegal AI</h2>
          <p>Your <strong>${docName}</strong> is attached.</p>
          <p style="font-size:12px;color:#999">Template only — not legal advice. Have qualified counsel review before execution.</p>
        </div>`
      }];
      if (base64) {
        attachments = [{
          content: base64,
          filename: `${(docName||'document').replace(/\s+/g,'_')}.docx`,
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          disposition: 'attachment',
        }];
      }
    }

    const body = {
      personalizations: [{ to: [{ email: to }] }],
      from: { email: 'noreply@bizlegal-ai.com', name: 'BizLegal AI' },
      subject,
      content,
    };
    if (attachments.length) body.attachments = attachments;

    const r = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.SENDGRID_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (r.status === 202 || r.status === 200) return res.status(200).json({ ok: true });
    const err = await r.text();
    return res.status(500).json({ error: err });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
