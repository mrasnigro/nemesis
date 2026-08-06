import React, { useEffect, useState } from 'react';

interface AudiencePanelProps {
  webinarId: string;
  status: string;
}

const AudiencePanel: React.FC<AudiencePanelProps> = ({ status }) => {
  const [participants, setParticipants] = useState(0);
  const [peak, setPeak] = useState(0);

  // Simular flutuação de audiência
  useEffect(() => {
    if (status !== 'live') return;

    // Começa com alguns participantes
    setParticipants(Math.floor(Math.random() * 20) + 10);

    const interval = setInterval(() => {
      setParticipants(prev => {
        // Variação de -2 a +5 pessoas
        const change = Math.floor(Math.random() * 8) - 2;
        const newValue = Math.max(0, prev + change);
        
        if (newValue > peak) setPeak(newValue);
        return newValue;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [status, peak]);

  return (
    <div className="bg-gray-900 border-b border-gray-800 p-4 shrink-0">
      <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-3 font-semibold">Audiência</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <div className="text-3xl font-bold text-white mb-1">
            {status === 'live' ? participants : 0}
          </div>
          <div className="text-xs text-gray-400">Ao Vivo Agora</div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <div className="text-3xl font-bold text-blue-400 mb-1">
            {peak}
          </div>
          <div className="text-xs text-gray-400">Pico Simultâneo</div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-800">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-400">Engajamento (Chat)</span>
          <span className="text-green-400">Alto</span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-1.5">
          <div className="bg-green-400 h-1.5 rounded-full" style={{ width: '75%' }}></div>
        </div>
      </div>
    </div>
  );
};

export default AudiencePanel;
