export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET || '';

  // Accept via Authorization header OR query param
  const authHeader = req.headers['authorization'] || '';
  const querySecret = req.query?.secret || '';

  const validHeader = authHeader === `Bearer ${secret}`;
  const validQuery  = querySecret === secret;

  if (!validHeader && !validQuery) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { run } = await import('../orchestrator.js');
    const stats = await run();
    return res.status(200).json({ ok: true, ...stats });
  } catch (e) {
    return res.status(500).json({ error: e.message, stack: e.stack });
  }
}
