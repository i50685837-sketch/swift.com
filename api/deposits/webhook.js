import Stripe from 'stripe';
import clientPromise from '../_db.js';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const config = { api: { bodyParser: false } };

async function creditUser(userId, amount) {
  const client = await clientPromise;
  await client.db().collection('users').updateOne(
    { userId }, { $inc: { balance: amount } }, { upsert: true }
  );
}

export default async function handler(req, res) {
  const { method } = req.query;

  // PESAPAL CALLBACK
  if(method === 'pesapal') {
    const { OrderTrackingId, Status } = req.query;
    if(Status === 'COMPLETED') {
      const client = await clientPromise;
      const deposit = await client.db().collection('deposits').findOne({ reference: OrderTrackingId });
      await client.db().collection('deposits').updateOne({ reference: OrderTrackingId }, { $set: { status: 'paid' } });
      await creditUser(deposit.userId, deposit.amount);
    }
  }

  // STRIPE WEBHOOK
  if(method === 'stripe') {
    const sig = req.headers['stripe-signature'];
    const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    if(event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const client = await clientPromise;
      await client.db().collection('deposits').updateOne({ reference: session.id }, { $set: { status: 'paid' } });
      await creditUser(session.client_reference_id, session.amount_total / 100);
    }
  }

  res.json({ received: true });
}
