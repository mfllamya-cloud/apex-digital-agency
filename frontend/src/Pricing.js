import React, { useState } from 'react';
import PaymentModal from './PaymentModal';

export default function Pricing({ userId }) {
  const [selectedPlan, setSelectedPlan] = useState(null);

  const plans = [
    { name: 'pro', title: 'Pro Plan', priceId: 'pri_0194a860000000000000000001', price: '$29/mo' },
    { name: 'agency', title: 'Agency Plan', priceId: 'pri_0194a860000000000000000002', price: '$99/mo' }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {plans.map((plan) => (
        <div key={plan.name} className="border p-6 rounded-lg shadow-sm bg-white text-center">
          <h3 className="text-xl font-bold mb-2">{plan.title}</h3>
          <p className="text-2xl font-semibold mb-4">{plan.price}</p>
          <button
            onClick={() => setSelectedPlan(plan)}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 w-full"
          >
            Subscribe Now
          </button>
        </div>
      ))}

      {selectedPlan && (
        <PaymentModal
          userId={userId}
          planType={selectedPlan.name}
          priceId={selectedPlan.priceId}
          onClose={() => setSelectedPlan(null)}
        />
      )}
    </div>
  );
}
