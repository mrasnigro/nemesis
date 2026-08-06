import React from 'react';

interface StreamControlsProps {
  status: string;
  onStatusChange: (newStatus: string) => void;
  duration?: number; // in seconds
  localStream?: MediaStream | null;
  isScreenSharing?: boolean;
  onScreenShareToggle?: () => void;
}

const StreamControls: React.FC<StreamControlsProps> = ({ status, onStatusChange, duration = 0, localStream, isScreenSharing = false, onScreenShareToggle }) => {
  const [isMicMuted, setIsMicMuted] = React.useState(false);
  const [isCameraMuted, setIsCameraMuted] = React.useState(false);

  const toggleMicrophone = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMicMuted(!isMicMuted);
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsCameraMuted(!isCameraMuted);
    }
  };
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <div className="flex flex-col">
          <span className="text-gray-400 text-xs uppercase tracking-wider mb-1">STATUS DA TRANSMISSÃO</span>
          {status === 'live' ? (
            <span className="text-red-500 font-bold flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
              AO VIVO
            </span>
          ) : (status === 'finished' || status === 'completed') ? (
            <span className="text-gray-500 font-bold">ENCERRADO</span>
          ) : (
            <span className="text-yellow-500 font-bold">AGENDADO / PRONTO</span>
          )}
        </div>

        {status === 'live' && (
          <div className="flex flex-col border-l border-gray-700 pl-6">
            <span className="text-gray-400 text-xs uppercase tracking-wider mb-1">TEMPO NO AR</span>
            <span className="text-white font-mono text-lg">{formatTime(duration)}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {status !== 'finished' && status !== 'completed' && (
          <>
            <button 
              onClick={toggleMicrophone}
              className={`p-3 rounded-full transition-colors text-white ${
                isMicMuted 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-gray-700 hover:bg-gray-600'
              }`} 
              title={isMicMuted ? 'Ativar Microfone' : 'Mutar Microfone'}
            >
              {isMicMuted ? '🔇' : '🎤'}
            </button>
            <button 
              onClick={toggleCamera}
              className={`p-3 rounded-full transition-colors text-white ${
                isCameraMuted 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-gray-700 hover:bg-gray-600'
              }`} 
              title={isCameraMuted ? 'Ativar Câmera' : 'Desativar Câmera'}
            >
              {isCameraMuted ? '📵' : '📷'}
            </button>
            {status !== 'finished' && status !== 'completed' && (
              <>
                <button 
                  onClick={onScreenShareToggle}
                  className={`p-3 rounded-full transition-colors text-white ${
                    isScreenSharing
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                  title={isScreenSharing ? 'Parar Compartilhamento' : 'Compartilhar Tela'}
                >
                  {isScreenSharing ? '🛑' : '🖥️'}
                </button>
              </>
            )}
          </>
        )}

        {(!status || status === "scheduled" || status === "draft" || status === "pending" || status === "") && status !== 'live' && status !== 'finished' && status !== 'completed' ? (
          <button 
            onClick={() => onStatusChange('live')}
            className="ml-4 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg transition-colors flex items-center gap-2"
          >
            ▶ INICIAR TRANSMISSÃO
          </button>
        ) : status === 'live' ? (
          <button 
            onClick={() => onStatusChange("finished")}
            className="ml-4 bg-gray-700 hover:bg-gray-600 text-red-500 font-bold py-2 px-6 rounded-lg transition-colors border border-red-500 flex items-center gap-2"
          >
            ⏹ ENCERRAR
          </button>
        ) : (
          <button 
            disabled
            className="ml-4 bg-gray-800 text-gray-500 font-bold py-2 px-6 rounded-lg cursor-not-allowed border border-gray-700"
          >
            TRANSMISSÃO ENCERRADA
          </button>
        )}
      </div>
    </div>
  );
};

export default StreamControls;
