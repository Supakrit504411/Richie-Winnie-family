'use client';

import { useEffect, useState } from 'react';

export default function Confetti({ show }: { show: boolean }) {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; color: string; delay: number }>>([]);

  useEffect(() => {
    if (show) {
      const newParticles = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        color: ['#FF6F59', '#FFC857', '#2F6B4F', '#6FB7DE', '#F1556C'][Math.floor(Math.random() * 5)],
        delay: Math.random() * 2,
      }));
      setParticles(newParticles);
    }
  }, [show]);

  if (!show || particles.length === 0) return null;

  return (
    <div className="confetti-container">
      {particles.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: '10px',
            height: '10px',
            backgroundColor: p.color,
            borderRadius: '50%',
            animation: `confettiFall 3s ease-in ${p.delay}s forwards`,
          }}
        />
      ))}
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
