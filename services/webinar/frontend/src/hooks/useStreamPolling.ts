import { useState, useRef, useCallback } from 'react';

export const useStreamPolling = (webinarId: string) => {
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastFileSizeRef = useRef(0);
  const isReloadingRef = useRef(false);
  const srcAssignedRef = useRef(false);

  const startStreamPolling = useCallback((videoElement: HTMLVideoElement) => {
    videoRef.current = videoElement;
    
    try {
      const videoUrl = `/api/webrtc/${webinarId}/stream/video`;
      
      console.log('[useStreamPolling] Iniciando polling de stream...');
      
      // NÃO atribuir src ainda - esperar chunks chegarem primeiro
      
      // Listener para quando o vídeo carrega metadados
      videoElement.onloadedmetadata = () => {
        console.log('[useStreamPolling] Metadados carregados:', {
          duration: videoElement.duration,
          width: videoElement.videoWidth,
          height: videoElement.videoHeight
        });
        setIsConnected(true);
      };
      
      videoElement.onerror = () => {
        console.error('[useStreamPolling] Erro ao carregar vídeo');
        setError('Erro ao carregar vídeo');
      };
      
      // Polling para verificar se há novos dados
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
          
          console.log(`[useStreamPolling] Tamanho do arquivo: ${newFileSize} bytes (anterior: ${lastFileSizeRef.current})`);
          
          // Se ainda não atribuiu src e há dados, atribuir agora
          if (!srcAssignedRef.current && newFileSize > 0) {
            console.log('[useStreamPolling] Dados detectados! Atribuindo src ao vídeo...');
            if (videoRef.current) {
              videoRef.current.src = videoUrl;
              srcAssignedRef.current = true;
              setIsConnected(true);
            }
          }
          
          // Se o arquivo cresceu e já tem src, recarregar o vídeo
          if (srcAssignedRef.current && newFileSize > lastFileSizeRef.current && lastFileSizeRef.current > 0) {
            console.log('[useStreamPolling] Novos dados detectados! Recarregando vídeo...');
            
            if (videoRef.current) {
              isReloadingRef.current = true;
              
              // Salvar posição atual
              const currentTime = videoRef.current.currentTime;
              
              // Recarregar o src com cache-busting
              const newUrl = `/api/webrtc/${webinarId}/stream/video?t=${Date.now()}`;
              videoRef.current.src = newUrl;
              
              // Tentar manter a posição de reprodução
              setTimeout(() => {
                if (videoRef.current && videoRef.current.duration > currentTime) {
                  try {
                    videoRef.current.currentTime = Math.max(0, currentTime - 0.5);
                  } catch (err) {
                    console.log('[useStreamPolling] Não foi possível restaurar posição');
                  }
                }
                isReloadingRef.current = false;
              }, 100);
            }
          }
          
          lastFileSizeRef.current = newFileSize;
          
        } catch (err) {
          console.error('[useStreamPolling] Erro ao fazer polling:', err);
        }
      };
      
      // Iniciar polling a cada 1 segundo
      pollingRef.current = setInterval(pollVideo, 1000);
      
      // Fazer primeira verificação imediatamente
      pollVideo();
      
    } catch (err: any) {
      console.error('[useStreamPolling] Erro ao iniciar stream:', err);
      setError(err.message || 'Erro ao iniciar stream');
    }
  }, [webinarId]);

  const stopStreamPolling = useCallback(() => {
    console.log('[useStreamPolling] Parando polling...');
    
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
    stopStreamPolling();
  }, [stopStreamPolling]);

  return {
    error,
    isConnected,
    startStreamPolling,
    stopStreamPolling,
    cleanup
  };
};
