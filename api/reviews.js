import { kv } from '@vercel/kv';
import { randomUUID } from 'crypto';

const KEY = 'novel:reviews';
const MAX_NAME_LEN = 50;
const MAX_REVIEW_LEN = 1000;
const MAX_STORED = 200;

function clean(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function parseBody(req) {
  return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
}

export default async function handler(req, res) {
  try {
    const reviews = (await kv.get(KEY)) || [];

    if (req.method === 'GET') {
      // Never leak editToken to the public list
      const publicReviews = reviews.map(({ editToken, ...rest }) => rest);
      res.status(200).json(publicReviews);
      return;
    }

    if (req.method === 'POST') {
      const body = parseBody(req);
      const name = clean(body?.name, MAX_NAME_LEN);
      const review = clean(body?.review, MAX_REVIEW_LEN);

      if (!name || !review) {
        res.status(400).json({ error: 'Nama dan ulasan diperlukan.' });
        return;
      }

      const id = randomUUID();
      const editToken = randomUUID();
      const entry = { id, name, review, createdAt: new Date().toISOString(), editToken };
      reviews.unshift(entry);
      const trimmed = reviews.slice(0, MAX_STORED);
      await kv.set(KEY, trimmed);

      // Only the creator's response includes the editToken — this is their
      // one chance to receive it; it is never returned by GET.
      res.status(201).json({ id, editToken });
      return;
    }

    if (req.method === 'PUT') {
      const body = parseBody(req);
      const id = body?.id;
      const editToken = body?.editToken;
      const name = clean(body?.name, MAX_NAME_LEN);
      const review = clean(body?.review, MAX_REVIEW_LEN);

      if (!id || !editToken || !name || !review) {
        res.status(400).json({ error: 'Data tidak lengkap.' });
        return;
      }

      const idx = reviews.findIndex(r => r.id === id);
      if (idx === -1 || reviews[idx].editToken !== editToken) {
        res.status(403).json({ error: 'Tidak dibenarkan mengedit ulasan ini.' });
        return;
      }

      reviews[idx] = { ...reviews[idx], name, review, updatedAt: new Date().toISOString() };
      await kv.set(KEY, reviews);
      res.status(200).json({ ok: true });
      return;
    }

    if (req.method === 'DELETE') {
      const body = parseBody(req);
      const id = body?.id;
      const editToken = body?.editToken;

      if (!id || !editToken) {
        res.status(400).json({ error: 'Data tidak lengkap.' });
        return;
      }

      const idx = reviews.findIndex(r => r.id === id);
      if (idx === -1 || reviews[idx].editToken !== editToken) {
        res.status(403).json({ error: 'Tidak dibenarkan memadam ulasan ini.' });
        return;
      }

      reviews.splice(idx, 1);
      await kv.set(KEY, reviews);
      res.status(200).json({ ok: true });
      return;
    }

    res.setHeader('Allow', 'GET, POST, PUT, DELETE');
    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('reviews api error', error);
    res.status(500).json({ error: 'Server error' });
  }
}
