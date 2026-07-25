import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
  const { OrderTrackingId, OrderMerchantReference, Status } = req.query;
  
  if(Status === 'COMPLETED') {
    const client = await clientPromise;
    const db = client.db();
    
    // 1. Update deposit to paid
    await db.collection('deposits').updateOne(
      { reference: OrderTrackingId },
      { $set: { status: 'paid' } }
    );
    
    // 2. Credit user balance
    const deposit = await db.collection('deposits').findOne({ reference: OrderTrackingId });
    await db.collection('users').updateOne(
      { userId: deposit.userId },
      { $inc: { balance: deposit.amount } },
      { upsert: true }
    );
  }
  res.redirect(`${process.env.BASE_URL}/index.html?deposit=success`);
}
