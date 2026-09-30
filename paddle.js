import { initializePaddle } from '@paddle/paddle-js';

let paddleInstance = null;

export async function initPaddle() {
  if (paddleInstance) return paddleInstance;
  
  try {
    paddleInstance = await initializePaddle({
      environment: 'live', // أو 'sandbox' حسب التجربة
      token: 'live_0194a860368b6b107080000000' // استبدليها بـ Token الفعلي إذا لزم الأمر
    });
    return paddleInstance;
  } catch (error) {
    console.error('Failed to initialize Paddle:', error);
    return null;
  }
}

export async function openCheckout(priceId, userId, planName) {
  const paddle = await initPaddle();
  if (!paddle) {
    alert('Payment system is currently unavailable.');
    return;
  }

  paddle.Checkout.open({
    items: [
      {
        priceId: priceId,
        quantity: 1
      }
    ],
    customData: {
      userId: userId,
      plan: planName
    }
  });
}
