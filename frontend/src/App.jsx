import React, { useState } from 'react';

export default function App() {
  const [days, setDays] = useState('5');
  const [tier, setTier] = useState('free');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: parseInt(days), userTier: tier })
      });
      const data = await res.json();
      if (data.success) setResults(data.content);
    } catch (e) {
      alert('Backend not running');
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea, #764ba2)', padding: '2rem', fontFamily: 'system-ui' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2.5rem', color: 'white', textAlign: 'center' }}>Content Calendar AI</h1>
        <p style={{ color: 'rgba(255,255,255,0.9)', textAlign: 'center', marginBottom: '2rem' }}>Generate content in 60 seconds</p>

        <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', marginBottom: '2rem' }}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem' }}>Days: {days}</label>
          <input type="range" min="5" max="30" value={days} onChange={(e) => setDays(e.target.value)} style={{ width: '100%', marginBottom: '1.5rem' }} />

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            {['free', 'pro', 'premium'].map(t => (
              <button key={t} onClick={() => setTier(t)} style={{ padding: '0.5rem 1.5rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600', background: tier === t ? '#3b82f6' : '#e5e7eb', color: tier === t ? 'white' : '#374151' }}>
                {t.toUpperCase()}
              </button>
            ))}
          </div>

          <button onClick={handleGenerate} disabled={loading} style={{ width: '100%', padding: '1rem', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}>
            {loading ? 'Generating...' : 'Generate Content'}
          </button>
        </div>

        {results.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {results.map((item, i) => (
              <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem' }}>
                <div style={{ background: '#3b82f6', color: 'white', padding: '0.4rem 1rem', borderRadius: '8px', display: 'inline-block', fontWeight: 'bold', marginBottom: '1rem' }}>Day {item.day}</div>
                <h3 style={{ marginBottom: '0.5rem' }}>{item.idea}</h3>
                <p style={{ background: '#f3f4f6', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem' }}>{item.caption}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                  {item.hashtags.map((tag, j) => <span key={j} style={{ background: '#ddd6fe', color: '#6d28d9', padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.85rem' }}>{tag}</span>)}
                </div>
                <div style={{ position: 'relative', marginBottom: '1rem' }}>
                  <div style={{ background: '#f3f4f6', padding: '0.75rem', borderRadius: '8px', filter: tier === 'free' ? 'blur(5px)' : 'none' }}>
                    Best Time: {item.bestTime}
                  </div>
                  {tier === 'free' && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ background: '#3b82f6', color: 'white', padding: '0.3rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem' }}>Upgrade</span></div>}
                </div>
                <div style={{ background: '#fef3c7', padding: '0.75rem', borderRadius: '8px', fontSize: '0.9rem' }}>
                  Video: {item.videoIdea}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}