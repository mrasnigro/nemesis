import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChunkStream } from '../hooks/useChunkStream';
import StudioChat from '../components/studio/StudioChat';
import api from '../services/api';

const ClientLiveWebinar: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [webinar, setWebinar] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [_isPlaying, setIsPlaying] = useState(false);
  const [isParticipant, setIsParticipant] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const relayStartedRef = useRef(false);
  
  const { isConnected, error, isWaiting, startChunkStream, cleanup } = useChunkStream(id || '');

  // Fetch inicial para carregar dados do webinar
  useEffect(() => {
    const fetchWebinar = async () => {
      try {
        // M102.46: Verificar se é um lead público vindo do registro
        const storedWebinarId = localStorage.getItem('currentWebinarId');
        const isLead = !!localStorage.getItem('currentLeadId');
        
        // Tentar como lead público primeiro (sempre funciona se o webinar estiver live/completed)
        try {
          const response = await api.get(`/public/leads/webinar-details/${id}`);
          setWebinar(response.data);
          setIsParticipant(isLead);
        } catch (err) {
          // Se falhar (ex: status scheduled), tentar como cliente autenticado
          console.log('[ClientLiveWebinar] Tentando acesso como cliente...');
          const response = await api.get(`/client/webinars/live/${id}`);
          const newWebinar = response.data.webinar || response.data;
          setWebinar(newWebinar);
          setIsParticipant(false);
        }
      } catch (err) {
        console.error('[ClientLiveWebinar] Erro ao carregar webinar:', err);
        // Não redirecionar para login, pois pode ser um lead público
        setWebinar(null);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchWebinar();
    }
  }, [id, navigate]);

  // Iniciar chunk stream quando o vídeo está pronto
  useEffect(() => {
    if (videoRef.current && !relayStartedRef.current && id && !loading) {
      console.log('[ClientLiveWebinar] Iniciando chunk stream...');
      relayStartedRef.current = true;
      startChunkStream(videoRef.current);
    }
  }, [id, loading, startChunkStream]);

  // Polling para sincronizar status
  useEffect(() => {
    if (!id) return;
    
    const pollStatus = async () => {
      try {
        // Tentar como lead público primeiro
        try {
          const response = await api.get(`/public/leads/webinar-details/${id}`);
          setWebinar(response.data);
        } catch (err) {
          // Fallback para cliente
          const response = await api.get(`/client/webinars/live/${id}`);
          const newWebinar = response.data.webinar || response.data;
          setWebinar(newWebinar);
        }
      } catch (err) {
        // Silencioso
      }
    };

    const interval = setInterval(pollStatus, 5000);
    
    return () => {
      clearInterval(interval);
    };
  }, [id]);

  // Cleanup ao sair
  useEffect(() => {
    return () => {
      cleanup();
      // Limpar dados do lead ao sair
      localStorage.removeItem('currentLeadId');
      localStorage.removeItem('currentWebinarId');
      localStorage.removeItem('leadAccessTime');
    };
  }, [cleanup]);

  const [hasClickedPlay, setHasClickedPlay] = useState(false);
  const watchTimeRef = useRef<number>(0);
  const markAttendedRef = useRef<boolean>(false);
  
  // Rastrear tempo de visualizacao e marcar como attended
  useEffect(() => {
    if (!hasClickedPlay) return;
    
    const interval = setInterval(() => {
      watchTimeRef.current += 1;
      
      // Marcar como attended depois de 2 minutos (120 segundos)
      if (watchTimeRef.current >= 120 && !markAttendedRef.current) {
        markAttendedRef.current = true;
        markLeadAsAttended();
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [hasClickedPlay]);
  
  const markLeadAsAttended = async () => {
    try {
      const leadId = localStorage.getItem('currentLeadId');
      const webinarId = localStorage.getItem('currentWebinarId');
      
      if (!leadId || !webinarId) {
        console.log('[ClientLiveWebinar] Lead ID ou Webinar ID nao encontrado');
        return;
      }
      
      console.log('[ClientLiveWebinar] Marcando lead como attended...');
      
      // Chamar endpoint para marcar como attended
      await api.post(`/public/leads/mark-attended`, {
        leadId: leadId,
        webinarId: webinarId,
        watchTime: watchTimeRef.current
      });
      
      console.log('[ClientLiveWebinar] Lead marcado como attended');
    } catch (err) {
      console.error('[ClientLiveWebinar] Erro ao marcar lead como attended:', err);
    }
  };
  
  const handlePlayClick = useCallback(() => {
    if (videoRef.current) {
      console.log('[ClientLiveWebinar] Clicou para assistir');
      setHasClickedPlay(true);
      // M7.11: Desmutar ao clicar (essencial para mobile)
      videoRef.current.muted = false;
      videoRef.current.play().catch((err: Error) => console.error('[ClientLiveWebinar] Erro ao reproduzir:', err));
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-950 border-b border-gray-800 h-14 flex items-center px-6 flex-shrink-0">
        <button 
          onClick={() => navigate('/dashboard/webinars')}
          className="text-gray-400 hover:text-white mr-4"
        >
          ← Sair
        </button>
        <h1 className="font-bold text-lg">{webinar?.title}</h1>
        {webinar?.status === 'live' && (
          <span className="ml-4 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded animate-pulse">
            AO VIVO
          </span>
        )}
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Video Area - Flex column com video no topo e info embaixo */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-4 gap-4">
          {/* Video Container - Deve ocupar todo espaço disponível */}
          <div className="flex-1 bg-black rounded-xl overflow-hidden relative border border-gray-800 flex items-center justify-center min-h-0">
            {error ? (
              <div className="text-center text-red-400 p-6 flex flex-col items-center justify-center">
                <p className="text-4xl mb-2">⚠️</p>
                <p className="text-sm">{error}</p>
                <p className="text-xs text-gray-500 mt-2">Verifique se o apresentador iniciou a transmissão</p>
              </div>
            ) : (
              <div className="relative w-full h-full flex items-center justify-center">
                <video 
                  ref={videoRef}
                  playsInline
                  muted={true}
                  controls={false}
                  className="w-full h-full object-contain bg-black"
                  style={{ display: 'block', minHeight: '100%', minWidth: '100%', transform: 'scaleX(-1)' }}
                  onPlay={() => {
                    console.log('[ClientLiveWebinar] ✓ Vídeo reproduzindo');
                    setIsPlaying(true);
                  }}
                  onPause={() => {
                    setIsPlaying(false);
                  }}
                  onError={(e: React.SyntheticEvent<HTMLVideoElement, Event>) => console.error('[ClientLiveWebinar] ✗ Erro:', e)}
                />
                {webinar?.status === 'finished' ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-90 rounded-xl z-50">
                    <div className="flex flex-col items-center gap-4 text-center p-6">
                      <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-2">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-white">Esta transmissão foi encerrada.</h3>
                      <p className="text-gray-400">Obrigado por participar!</p>
                      <button 
                        onClick={() => navigate('/dashboard/webinars')}
                        className="mt-4 px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                      >
                        Voltar para Webinars
                      </button>
                    </div>
                  </div>
                ) : webinar?.status !== 'live' ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80 rounded-xl z-40">
                    <div className="flex flex-col items-center gap-4 text-center p-6">
                      <div className="w-16 h-16 bg-blue-900/30 rounded-full flex items-center justify-center mb-2 animate-pulse">
                        <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-white">Aguardando o início da transmissão...</h3>
                      <p className="text-gray-400">O apresentador iniciará o webinar em breve.</p>
                    </div>
                  </div>
                ) : !isConnected ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 rounded-xl z-30">
                    <div className="flex flex-col items-center gap-4">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                      <p className="text-gray-400">Conectando à transmissão...</p>
                    </div>
                  </div>
                ) : isWaiting ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 rounded-xl z-20">
                    <div className="flex flex-col items-center gap-4">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
                      <p className="text-yellow-400 text-center">Sinal fraco ou aguardando chunks...</p>
                    </div>
                  </div>
                ) : null}
                {isConnected && !hasClickedPlay && !isWaiting && (
                  <button
                    onClick={handlePlayClick}
                    className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 hover:bg-opacity-40 transition-all rounded-xl cursor-pointer"
                  >
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-500 transition-colors">
                        <svg className="w-10 h-10 text-white fill-current ml-1" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                      <p className="text-white text-lg font-semibold">Clique para assistir</p>
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>
          
          {/* Info Card - Altura fixa, não encolhe */}
          <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex-shrink-0 max-h-32 overflow-hidden">
            <h2 className="font-bold text-xl">{webinar?.title}</h2>
            <p className="text-gray-400 mt-2 text-sm">{webinar?.description}</p>
            <div className="mt-4 flex items-center gap-3 pt-3 border-t border-gray-700">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center font-bold text-white">
                {webinar?.instructor?.charAt(0) || 'I'}
              </div>
              <div>
                <p className="text-sm text-gray-300 font-medium">{webinar?.instructor}</p>
                <p className="text-xs text-gray-500">Instrutor</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Chat */}
        <div className="w-80 border-l border-gray-800 flex flex-col flex-shrink-0 overflow-hidden">
          <StudioChat webinarId={id || ''} isParticipant={isParticipant} />
        </div>
      </div>
    </div>
  );
};

export default ClientLiveWebinar;
