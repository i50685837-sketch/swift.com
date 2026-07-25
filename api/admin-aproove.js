import clientPromise from './_db.js';

export default async function handler(req, res) {
  // Add simple admin auth: if(req.headers['x-admin-key'] !== process.env.ADMIN_KEY) return 401
  const { depositId } = req.body;

  const client = await clientPromise;
  const deposit = await client.db().collection('deposits').findOne({ _id: depositId, status: 'pending' });
  
  await client.db().collection('deposits').updateOne({ _id: depositId }, { $set: { status: 'paid' } });
  await client.db().collection('users').updateOne(
    { userId: deposit.userId }, { $inc: { balance: deposit.amount } }, { upsert: true }
  );

  res.json({ success: true });
}
