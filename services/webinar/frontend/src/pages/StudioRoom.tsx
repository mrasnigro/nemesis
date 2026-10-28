import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import StreamControls from '../components/studio/StreamControls';
import AudiencePanel from '../components/studio/AudiencePanel';
import StudioChat from '../components/studio/StudioChat';
import { useSimpleWebRTC } from '../hooks/useSimpleWebRTC';
import { appPath } from '../lib/appBase';

const StudioRoom: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const navigate = useNavigate();
  const [webinar, setWebinar] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [streamDuration, setStreamDuration] = useState(0);
  
  // WebRTC & Recording
  const videoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const isHandlingStatusChangeRef = useRef<boolean>(false);
  const { isRecording, error, startCamera, startRecording, stopRecording, isScreenSharing, startScreenShare, stopScreenShare, initWebRTCBroadcasting, stopWebRTCBroadcasting } = useSimpleWebRTC();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    const fetchStudioData = async () => {
      try {
        try {
          const response = await api.get(`/client/webinars/studio/${id}`);
          setWebinar(response.data);
        } catch (clientError) {
          const response = await api.get(`/admin/studio/${id}`);
          setWebinar(response.data.webinar);
        }
      } catch (error) {
        console.error('Erro ao carregar estúdio:', error);
        navigate(appPath('/dashboard/webinars'));
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchStudioData();
    }
  }, [id, navigate]);


  // Iniciar câmera quando componente monta
  useEffect(() => {
    const initCamera = async () => {
      try {
        console.log('Inicializando câmera ao montar componente...');
        const stream = await startCamera(videoRef);
        if (stream) {
          setLocalStream(stream);
          console.log('✓ Câmera inicializada');
        }
      } catch (err) {
        console.error('Erro ao inicializar câmera:', err);
      }
    };
    
    initCamera();
    
    return () => {
      // Não desligar câmera aqui - deixar para o cleanup final
    };
  }, []);

  // Timer para duração da transmissão
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (webinar?.status === 'live') {
      interval = setInterval(() => {
        setStreamDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [webinar?.status]);

  // Limpeza ao sair - SEM dependências para não re-executar durante re-renders
  useEffect(() => {
    return () => {
      console.log('Limpando StudioRoom (desmontagem final)...');
      // Este cleanup só executa quando o componente é REALMENTE desmontado
      // Não colocar isRecording/isScreenSharing como dependências!
    };
  }, []);

  const handleScreenShareToggle = async () => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      const screen = await startScreenShare();
      console.log('Screen stream retornado:', screen);
      if (screen && screenVideoRef.current) {
        console.log('Atribuindo stream ao screenVideoRef');
        screenVideoRef.current.srcObject = screen;
        console.log('screenVideoRef.current.srcObject:', screenVideoRef.current.srcObject);
      } else {
        console.error('Screen é null ou screenVideoRef.current é null:', { screen, ref: screenVideoRef.current });
      }
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    console.log('handleStatusChange chamado com:', newStatus);
    console.log('Status atual:', webinar?.status);
    
    // Evitar chamadas recursivas
    if (isHandlingStatusChangeRef.current) {
      console.log('⚠️  handleStatusChange já está em andamento, ignorando chamada recursiva');
      return;
    }
    
    // PROTEÇÃO: Se já está ao vivo e pediu 'live' novamente, ignorar
    if (newStatus === 'live' && webinar?.status === 'live') {
      console.log('⚠️  Já está ao vivo, ignorando chamada duplicada');
      return;
    }
    
    isHandlingStatusChangeRef.current = true;
    
    try {
      if (newStatus === 'live') {
        console.log('=== INICIANDO TRANSMISSÃO ===');
        console.log('videoRef.current:', videoRef.current);
        console.log('videoRef.current.srcObject ANTES:', videoRef.current?.srcObject);
        
        // Câmera já está ligada (inicializada no useEffect)
        const stream = localStream;
        
        if (!stream) {
          console.error('Falha ao obter stream - câmera não inicializada');
          alert('Câmera não está disponível. Verifique as permissões.');
          return;
        }

        console.log('Stream obtido, iniciando transmissão...');
        console.log('isRecording ANTES:', isRecording);
        
        // IMPORTANTE: Inicializar WebRTC PRIMEIRO para setar webinarIdRef
        console.log('Iniciando transmissão WebRTC P2P...');
        try {
          await initWebRTCBroadcasting(localStream || stream, id || '');
          console.log('✓ Transmissão WebRTC P2P iniciada');
        } catch (webrtcErr) {
          console.error('[StudioRoom] Erro ao iniciar WebRTC:', webrtcErr);
        }
        
        // AGORA iniciar gravação (webinarIdRef já está setado)
        console.log('Iniciando gravação e envio de chunks...');
        await startRecording(stream);

        // Atualizar status no servidor
        try {
          const response = await api.post(`/client/webinars/studio/${id}/status`, { status: newStatus });
          console.log('✓ Status atualizado no servidor:', response.data);
        } catch (clientError) {
          console.error('Erro ao atualizar status via rota cliente:', clientError);
          throw clientError;
        }
        setWebinar({ ...webinar, status: newStatus });
        setStreamDuration(0);
        
        console.log('✓ Transmissão iniciada');
      } else if (newStatus === 'finished') {
        console.log('=== ENCERRANDO TRANSMISSÃO ===');
        
        if (isRecording) {
          stopRecording();
        }
        // Câmera fica ligada
        
        // Parar compartilhamento de tela se estiver ativo
        if (isScreenSharing) {
          stopScreenShare();
        }
        
        // Parar WebRTC
        stopWebRTCBroadcasting();

        // Atualizar status no servidor
        try {
          const response = await api.post(`/client/webinars/studio/${id}/status`, { status: newStatus });
          console.log('✓ Status atualizado no servidor:', response.data);
        } catch (clientError) {
          console.error('Erro ao atualizar status via rota cliente:', clientError);
          throw clientError;
        }
        setWebinar({ ...webinar, status: newStatus });
        
        console.log('✓ Transmissão encerrada');
      }
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      alert('Erro ao alterar o status da transmissão.');
    } finally {
      isHandlingStatusChangeRef.current = false;
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!webinar) return null;

  return (
    <div className="flex-1 flex w-full h-dvh max-lg:flex-col overflow-hidden">
      {/* Left/Center Panel - Main Stage */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0 p-4 max-sm:p-2 gap-4 overflow-hidden">
        {/* Top bar with title */}
        <div className="flex justify-between items-start gap-3 bg-gray-800 p-4 max-sm:p-3 rounded-lg max-sm:flex-col">
          <div className="min-w-0">
            <h2 className="text-xl max-sm:text-lg font-bold text-white break-words">{webinar.title}</h2>
            <p className="text-sm text-gray-400 break-words">Instrutor: {webinar.instructor} • Categoria: {webinar.category}</p>
          </div>
          <div className="text-right max-sm:text-left shrink-0">
            <p className="text-xs text-gray-400 uppercase tracking-wider">ID da Sessão</p>
            <p className="font-mono text-sm text-gray-300">#{webinar.id}</p>
          </div>
        </div>

        {/* Video Player */}
        <div className="relative bg-black rounded-lg overflow-hidden border border-gray-800 flex items-center justify-center aspect-video">
          {/* Vídeo de compartilhamento de tela (fundo) */}
          <video 
            ref={screenVideoRef}
            autoPlay={true}
            playsInline={true}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              backgroundColor: '#000',
              display: isScreenSharing ? 'block' : 'none'
            }}
          />
          
          {/* Vídeo da câmera (Picture-in-Picture quando compartilhando tela) */}
          <video 
            ref={videoRef}
            autoPlay={true}
            playsInline={true}
            muted={true}
            style={{
              width: isScreenSharing ? '20%' : '100%',
              height: isScreenSharing ? '20%' : '100%',
              objectFit: 'contain',
              backgroundColor: '#000',
              transform: 'scaleX(-1)',
              display: webinar.status === 'live' ? 'block' : 'none',
              position: isScreenSharing ? 'absolute' : 'static',
              bottom: isScreenSharing ? '16px' : 'auto',
              right: isScreenSharing ? '16px' : 'auto',
              border: isScreenSharing ? '2px solid #fff' : 'none',
              borderRadius: isScreenSharing ? '8px' : '0',
              zIndex: isScreenSharing ? 10 : 1
            }}
          />
          
          {/* Botão para fechar compartilhamento de tela */}
          {isScreenSharing && (
            <button
              onClick={handleScreenShareToggle}
              className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors z-20"
              title="Parar compartilhamento"
            >
              ✕ Fechar Apresentação
            </button>
          )}
          
          {/* Overlay baseado no status - não mostrar quando compartilhando tela */}
          {!isScreenSharing && (
            <>
              {webinar.status === 'live' ? (
                <>
                  {error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                      <div className="text-center text-red-400 p-6">
                        <p className="text-4xl mb-2">⚠️</p>
                        <p>{error}</p>
                      </div>
                    </div>
                  )}
                </>
              ) : webinar.status === 'finished' ? (
                <div className="absolute inset-0 flex items-center justify-center text-center">
                  <div>
                    <div className="text-gray-600 text-6xl mb-4">⏹️</div>
                    <p className="text-white text-xl font-bold mb-6">Transmissão Encerrada</p>
                    <button
                      onClick={() => window.close()}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-center">
                  <div>
                    <div className="text-gray-600 text-6xl mb-4">📹</div>
                    <p className="text-white text-xl font-bold">Câmera em Standby</p>
                    <p className="text-gray-400 mt-2">Clique em "Iniciar Transmissão" quando estiver pronto</p>
                  </div>
                </div>
              )}
            </>
          )}
          
          {/* Overlay info */}
          {webinar.status === 'live' && (
            <div className="absolute top-4 left-4 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded animate-pulse">
              AO VIVO
            </div>
          )}
        </div>

        {/* Stream Controls */}
        <StreamControls 
          status={webinar.status} 
          onStatusChange={handleStatusChange}
          duration={streamDuration}
          localStream={localStream}
          isScreenSharing={isScreenSharing}
          onScreenShareToggle={handleScreenShareToggle}
        />
      </div>

      {/* Right Panel - Sidebar (Audience & Chat) */}
      <div className="w-80 max-lg:w-full max-lg:h-72 lg:h-dvh flex flex-col bg-gray-900 border-l max-lg:border-l-0 max-lg:border-t border-gray-800 shrink-0 overflow-hidden">
        <AudiencePanel webinarId={webinar.id} status={webinar.status} />
        <StudioChat webinarId={webinar.id} />
      </div>
    </div>
  );
};

export default StudioRoom;
