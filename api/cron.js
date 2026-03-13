export default async function handler(req, res) {
  const auth = req.headers['authorization'] || '';
  const expected = `Bearer ${process.env.CRON_SECRET || ''}`;

  if (auth !== expected) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { run } = await import('../orchestrator.js');
    const stats = await run();
    return res.status(200).json({ ok: true, ...stats });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
