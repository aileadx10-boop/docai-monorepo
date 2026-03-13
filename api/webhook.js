export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  // Lemon Squeezy webhook — just acknowledge
  // Payment verification happens client-side via LSQ embed
  return res.status(200).json({ ok: true });
}
