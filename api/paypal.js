async function getAccessToken() {
  const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`).toString('base64');
  const r = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const d = await r.json();
  return d.access_token;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { action, orderID, amount, docLabel, docKey } = req.body;

  try {
    const token = await getAccessToken();

    // Create order
    if (action === 'create') {
      const r = await fetch('https://api-m.paypal.com/v2/checkout/orders', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [{
            amount: {
              currency_code: 'USD',
              value: amount,
            },
            description: `BizLegal AI — ${docLabel}`,
            custom_id: docKey,
          }],
          application_context: {
            brand_name: 'BizLegal AI',
            landing_page: 'BILLING',
            user_action: 'PAY_NOW',
          },
        }),
      });
      const d = await r.json();
      if (d.id) return res.status(200).json({ orderID: d.id });
      return res.status(500).json({ error: d.message || 'Failed to create order' });
    }

    // Capture order
    if (action === 'capture') {
      const r = await fetch(`https://api-m.paypal.com/v2/checkout/orders/${orderID}/capture`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const d = await r.json();
      if (d.status === 'COMPLETED') return res.status(200).json({ ok: true, status: 'COMPLETED' });
      return res.status(500).json({ error: 'Payment not completed', status: d.status });
    }

    return res.status(400).json({ error: 'Invalid action' });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
