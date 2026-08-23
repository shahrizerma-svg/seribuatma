const ADMIN_KEY = process.env.REVIEWS_ADMIN_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const ok = Boolean(ADMIN_KEY) && body?.adminKey === ADMIN_KEY;
  res.status(ok ? 200 : 403).json({ ok });
}
