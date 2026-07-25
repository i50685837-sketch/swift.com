import clientPromise from '../lib/mongodb.js';
import { verifyJWT } from './_auth.js';
import fetch from 'node-fetch';

async function getPesapalToken() {
  const res = await fetch(`https://cyb.pesapal.com/pesapalv3/api/Auth/RequestToken`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      consumer_key: process.env.PESAPAL_CONSUMER_KEY,
      consumer_secret: process.env.PESAPAL_CONSUMER_SECRET
    })
  });
  const data = await res.json();
  return data.token;
}

export default async function handler(req, res) {
  const user = await verifyJWT(req);
  const { amount, phone } = req.body; // amount in KES

  const token = await getPesapalToken();

  const orderRes = await fetch(`https://cyb.pesapal.com/pesapalv3/api/Transactions/SubmitOrderRequest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      id: `${user.sub}-${Date.now()}`, // unique
      currency: 'KES',
      amount: amount,
      description: 'Pesaearn Deposit',
      callback_url: process.env.PESAPAL_CALLBACK_URL,
      notification_id: 'pesaearn-1',
      billing_address: {
        email_address: user.email,
        phone_number: phone,
        first_name: user.name.split(' ')[0],
        last_name: user.name.split(' ')[1] || ''
      }
    })
  });

  const order = await orderRes.json();
  
  // Save pending deposit to Mongo
  const client = await clientPromise;
  await client.db().collection('deposits').insertOne({
    userId: user.sub,
    amount, currency: 'KES', method: 'pesapal',
    reference: order.order_tracking_id, status: 'pending', createdAt: new Date()
  });

  res.json({ redirect_url: order.redirect_url }); // send user to Pesapal
}
