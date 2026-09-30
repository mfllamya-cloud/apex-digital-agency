const express = require('express');
const crypto = require('crypto');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (e) {
    console.error('Firebase Admin initialization error:', e);
  }
}

const db = admin.firestore();
const app = express();

app.post('/api/webhook/paddle', express.raw({ type: '*/*' }), async (req, res) => {
  const signature = req.headers['paddle-signature'];
  const rawBody = req.body;

  if (!signature) {
    return res.status(400).send('Missing Paddle signature');
  }

  try {
    const secret = process.env.PADDLE_WEBHOOK_SECRET;
    if (!secret) {
      console.error('[paddle] PADDLE_WEBHOOK_SECRET is not configured');
      return res.status(500).send('Webhook secret not configured');
    }

    const parts = signature.split(';');
    let ts = '';
    let h1 = '';
    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key === 'ts') ts = value;
      if (key === 'h1') h1 = value;
    }

    if (!ts || !h1) {
      return res.status(400).send('Invalid signature format');
    }

    const signedPayload = `${ts}:${rawBody.toString('utf8')}`;
    const computedHmac = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    const signatureBuffer = Buffer.from(h1, 'hex');
    const computedBuffer = Buffer.from(computedHmac, 'hex');

    if (
      signatureBuffer.length !== computedBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, computedBuffer)
    ) {
      console.warn('[paddle] Signature mismatch!');
      return res.status(403).send('Invalid signature');
    }

    const eventData = JSON.parse(rawBody.toString('utf8'));
    const eventType = eventData.event_type;
    console.log(`[paddle] 📨 Received event: ${eventType}`);

    const data = eventData.data;

    if (eventType.startsWith('subscription.')) {
      const subscriptionId = data.id;
      const status = data.status;
      const customerId = data.customer_id;
      const customData = data.custom_data || {};
      const userId = customData.userId;

      if (userId) {
        const userRef = db.collection('users').doc(userId);
        let newPlan = 'free';

        if (status === 'active' || status === 'trialing') {
          newPlan = customData.plan || 'pro';
        } else if (status === 'canceled' || status === 'paused') {
          newPlan = 'free';
        }

        const updatePayload = {
          paddleSubscriptionId: subscriptionId,
          paddleCustomerId: customerId,
          plan: newPlan,
          subscriptionStatus: status,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        if (status === 'active' && eventType === 'subscription.activated') {
          updatePayload.generationsUsed = 0;
        }

        await userRef.set(updatePayload, { merge: true });
        console.log(`[paddle] ✅ Updated user ${userId} to plan: ${newPlan} (status: ${status})`);
      }
    } else if (eventType === 'transaction.completed') {
      const transactionId = data.id;
      const customData = data.custom_data || {};
      const userId = customData.userId;

      if (userId) {
        await db.collection('agency_orders').add({
          transactionId,
          userId,
          amount: data.details?.totals?.total || 0,
          currency: data.currency_code || 'USD',
          status: 'completed',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`[paddle] ✅ Recorded agency order for user ${userId}`);
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('[paddle] ❌ Webhook error:', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
