import { useState, useRef, useCallback } from 'react';

export const useStreamRelay = (webinarId: string) => {
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastFileSizeRef = useRef(0);
  const isReloadingRef = useRef(false);

  const startStreamRelay = useCallback((videoElement: HTMLVideoElement) => {
    console.log('[StreamRelay] ===== INICIANDO STREAM ACUMULADO =====');
    videoRef.current = videoElement;
    
    try {
      // URL do vídeo acumulado
      const videoUrl = `/api/webrtc/${webinarId}/stream/video`;
      console.log('[StreamRelay] Video URL:', videoUrl);
      
      // Atribuir URL ao vídeo
      videoElement.src = videoUrl;
      console.log('[StreamRelay] ✅ src atribuído ao vídeo');
      
      // Polling para verificar se há dados novos
      const pollVideo = async () => {
        if (!videoRef.current || isReloadingRef.current) {
          return;
        }
        
        try {
          // Fazer HEAD request para obter o tamanho do arquivo
          const response = await fetch(`/api/webrtc/${webinarId}/stream/video`, {
            method: 'HEAD'
          });
          
          const contentLength = response.headers.get('content-length');
          const newFileSize = contentLength ? parseInt(contentLength) : 0;
          
          console.log(`[StreamRelay] Tamanho do arquivo: ${newFileSize} bytes (anterior: ${lastFileSizeRef.current})`);
          
          // Se o arquivo cresceu significativamente, recarregar
          if (newFileSize > lastFileSizeRef.current + 50000 && lastFileSizeRef.current > 0) {
            console.log('[StreamRelay] Novos dados detectados! Recarregando vídeo...');
            
            if (videoRef.current) {
              isReloadingRef.current = true;
              
              // Salvar estado de reprodução
              const wasPlaying = !videoRef.current.paused;
              
              // Recarregar o src com cache-busting
              const newUrl = `/api/webrtc/${webinarId}/stream/video?t=${Date.now()}`;
              videoRef.current.src = newUrl;
              
              // Tentar manter a reprodução
              setTimeout(() => {
                if (videoRef.current) {
                  if (wasPlaying) {
                    videoRef.current.play().catch(() => {
                      console.log('[StreamRelay] Não conseguiu reproduzir automaticamente');
                    });
                  }
                }
                isReloadingRef.current = false;
              }, 100);
            }
          }
          
          lastFileSizeRef.current = newFileSize;
          
        } catch (err) {
          console.error('[StreamRelay] Erro ao fazer polling:', err);
        }
      };
      
      // Listeners de evento
      videoElement.onloadstart = () => {
        console.log('[StreamRelay] 📥 Começando a carregar...');
      };
      
      videoElement.onloadedmetadata = () => {
        console.log(`[StreamRelay] 📹 Metadados carregados: ${videoElement.videoWidth}x${videoElement.videoHeight}`);
        console.log(`[StreamRelay] Duração: ${videoElement.duration}s`);
        setIsConnected(true);
      };
      
      videoElement.onplay = () => {
        console.log('[StreamRelay] ▶️ Vídeo começou a reproduzir');
      };
      
      videoElement.onpause = () => {
        console.log('[StreamRelay] ⊸️ Vídeo pausado');
      };
      
      videoElement.onended = () => {
        console.log('[StreamRelay] ⌅️ Vídeo terminou - recarregando automaticamente...');
        
        if (isReloadingRef.current) {
          return;
        }
        
        isReloadingRef.current = true;
        
        // Recarregar o src com cache-busting para pegar novos chunks
        const newUrl = `/api/webrtc/${webinarId}/stream/video?t=${Date.now()}`;
        videoElement.src = newUrl;
        
        // Aguardar um pouco para o vídeo carregar e depois reproduzir
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.play().catch(() => {
              console.log('[StreamRelay] Não conseguiu reproduzir automaticamente');
            });
          }
          isReloadingRef.current = false;
        }, 100);
      };
      
      videoElement.onerror = (e) => {
        console.error('[StreamRelay] ❌ Erro ao carregar vídeo:', e);
        setError('Erro ao carregar vídeo');
      };
      
      // Tentar reproduzir
      videoElement.play().catch(() => {
        console.log('[StreamRelay] Autoplay bloqueado');
      });
      
      // Se conseguir carregar, parar polling inicial
      if (videoElement.readyState >= 2) {
        console.log('[StreamRelay] ✅ Vídeo carregado');
        setIsConnected(true);
      }
      
      // Iniciar polling para verificar novos dados
      pollingRef.current = setInterval(pollVideo, 1000);
      console.log('[StreamRelay] ✅ Polling iniciado');
      
      // Fazer primeira verificação imediatamente
      pollVideo();
      
    } catch (err: any) {
      console.error('[StreamRelay] Erro fatal:', err);
      setError(err.message || 'Erro ao iniciar stream');
    }
  }, [webinarId]);

  const stopStreamRelay = useCallback(() => {
    console.log('[StreamRelay] Parando stream...');
    
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.src = '';
    }
    
    setIsConnected(false);
  }, []);

  const cleanup = useCallback(() => {
    stopStreamRelay();
  }, [stopStreamRelay]);

  return {
    error,
    isConnected,
    startStreamRelay,
    stopStreamRelay,
    cleanup
  };
};
