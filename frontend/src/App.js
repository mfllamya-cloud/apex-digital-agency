import React, { useState, useEffect } from 'react';
import Pricing from './Pricing';

function App() {
  const [user, setUser] = useState({ uid: 'test-user-id', plan: 'free' });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-800">Apex Studio Pro</h1>
        <p className="text-gray-600">Current Plan: <span className="font-semibold text-blue-600">{user.plan}</span></p>
      </header>
      <main className="w-full max-w-4xl">
        <Pricing userId={user.uid} />
      </main>
    </div>
  );
}

export default App;
