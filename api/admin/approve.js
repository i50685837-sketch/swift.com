import clientPromise from './_db.js';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  if(req.headers['x-admin-key'] !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { depositId } = req.body;
  const client = await clientPromise;
  const db = client.db();

  const deposit = await db.collection('deposits').findOne({ _id: new ObjectId(depositId), status: 'pending' });
  if(!deposit) return res.status(404).json({ error: 'Deposit not found' });
  
  // 1. Mark as paid
  await db.collection('deposits').updateOne({ _id: new ObjectId(depositId) }, { $set: { status: 'paid', approvedAt: new Date() } });
  
  // 2. Credit user balance
  await db.collection('users').updateOne(
    { userId: deposit.userId }, 
    { $inc: { balance: deposit.amount } }, 
    { upsert: true }
  );

  res.json({ success: true });
}
