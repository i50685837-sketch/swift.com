import Stripe from 'stripe';
import clientPromise from '../_db.js';
import { verifyJWT } from '../_auth.js';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  const user = await verifyJWT(req);
  const { amount } = req.body; // USD

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: { currency: 'usd', product_data: { name: 'Pesaearn Deposit' }, unit_amount: amount * 100 },
      quantity: 1
    }],
    mode: 'payment',
    success_url: `${process.env.BASE_URL}/index.html?success=true`,
    cancel_url: `${process.env.BASE_URL}/index.html?canceled=true`,
    client_reference_id: user.sub,
    metadata: { userId: user.sub, amount }
  });

  // Save pending
  const client = await clientPromise;
  await client.db().collection('deposits').insertOne({
    userId: user.sub, amount, currency: 'USD', method: 'stripe',
    reference: session.id, status: 'pending', createdAt: new Date()
  });

  res.json({ url: session.url });
}
