import fetch from 'node-fetch';
import clientPromise from '../_db.js';
import { verifyJWT } from '../_auth.js';

async function getPesapalToken() {
  const res = await fetch(`https://cyb.pesapal.com/pesapalv3/api/Auth/RequestToken`, {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      consumer_key: process.env.PESAPAL_CONSUMER_KEY,
      consumer_secret: process.env.PESAPAL_CONSUMER_SECRET
    })
  });
  return (await res.json()).token;
}

export default async function handler(req, res) {
  const user = await verifyJWT(req);
  const { amount, phone } = req.body; // KES
  const token = await getPesapalToken();
  const reference = `${user.sub}-${Date.now()}`;

  const orderRes = await fetch(`https://cyb.pesapal.com/pesapalv3/api/Transactions/SubmitOrderRequest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      id: reference, currency: 'KES', amount,
      description: 'Pesaearn Deposit',
      callback_url: `${process.env.BASE_URL}/api/deposits/webhook?method=pesapal`,
      notification_id: 'pesaearn-1',
      billing_address: { email_address: user.email, phone_number: phone, first_name: user.name }
    })
  });
  const order = await orderRes.json();

  const client = await clientPromise;
  await client.db().collection('deposits').insertOne({
    userId: user.sub, amount, currency: 'KES', method: 'pesapal',
    reference: order.order_tracking_id, status: 'pending', createdAt: new Date()
  });

  res.json({ redirect_url: order.redirect_url });
}
