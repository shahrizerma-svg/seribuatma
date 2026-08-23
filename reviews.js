import { kv } from '@vercel/kv';

const KEY = 'novel:reviews';
const MAX_NAME_LEN = 50;
const MAX_REVIEW_LEN = 1000;
const MAX_STORED = 200;

function escapePlainText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const reviews = (await kv.get(KEY)) || [];
      res.status(200).json(reviews);
      return;
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const name = escapePlainText(body?.name).slice(0, MAX_NAME_LEN);
      const review = escapePlainText(body?.review).slice(0, MAX_REVIEW_LEN);

      if (!name || !review) {
        res.status(400).json({ error: 'Nama dan ulasan diperlukan.' });
        return;
      }

      const reviews = (await kv.get(KEY)) || [];
      reviews.unshift({ name, review, createdAt: new Date().toISOString() });
      const trimmed = reviews.slice(0, MAX_STORED);
      await kv.set(KEY, trimmed);

      res.status(201).json({ ok: true });
      return;
    }

    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('reviews api error', error);
    res.status(500).json({ error: 'Server error' });
  }
}
