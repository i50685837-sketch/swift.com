import clientPromise from '../_db.js';
import { verifyJWT } from '../_auth.js';

export default async function handler(req, res) {
  const user = await verifyJWT(req);
  const { amount, swiftReference, proofUrl } = req.body; // USD

  const client = await clientPromise;
  await client.db().collection('deposits').insertOne({
    userId: user.sub, amount, currency: 'USD', method: 'swift',
    reference: swiftReference, proofUrl, status: 'pending', createdAt: new Date()
  });

  res.json({ message: 'SWIFT deposit submitted for verification' });
}
