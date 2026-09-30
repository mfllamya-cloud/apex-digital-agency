import React from 'react';
import { openCheckout } from './paddle';

export default function PaymentModal({ userId, planType, priceId, onClose }) {
  const handleCheckout = () => {
    openCheckout(priceId, userId, planType);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-md w-full text-center">
        <h3 className="text-xl font-bold mb-4">Complete Your Subscription</h3>
        <p className="mb-6 text-gray-600">You are subscribing to the {planType} plan.</p>
        <div className="flex justify-center gap-4">
          <button
            onClick={handleCheckout}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Pay with Paddle
          </button>
          <button
            onClick={onClose}
            className="bg-gray-300 px-6 py-2 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
