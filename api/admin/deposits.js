import clientPromise from '../_db.js';

export default async function handler(req, res) {
  if(req.headers['x-admin-key'] !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const client = await clientPromise;
  const deposits = await client.db().collection('deposits')
    .find({}).sort({ createdAt: -1 }).limit(100).toArray();

  res.json(deposits);
}
