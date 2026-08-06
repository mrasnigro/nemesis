import { useState, useRef, useCallback } from 'react';

/**
 * Hook de streaming "INFINITE STREAM" - M102.47
 * 
 * Estratégia:
 * - Abre uma conexão HTTP persistente com o servidor.
 * - O servidor mantém a conexão aberta e envia chunks em tempo real.
 * - O player não recarrega mais, eliminando o aviso de "Sinal fraco".
 */
export const useChunkStream = (webinarId: string) => {
  const [error] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const startChunkStream = useCallback((videoElement: HTMLVideoElement) => {
    console.log('[ChunkStream] ===== INFINITE STREAM (M102.47) =====');
    videoRef.current = videoElement;
    
    // M102.47: A URL agora aponta para um stream que nunca fecha (enquanto durar a live)
    videoElement.src = `/api/webrtc/${webinarId}/stream/live?t=${Date.now()}`;
    
    videoElement.onloadedmetadata = () => {
      console.log('[ChunkStream] ✓ Metadata carregado');
      setIsConnected(true);
      setIsWaiting(false);
      videoElement.play().catch(() => {});
    };

    // M102.51: Forçar estado conectado se recebermos progresso de dados
    videoElement.onprogress = () => {
      if (!isConnected && videoElement.buffered.length > 0) {
        setIsConnected(true);
      }
    };

    videoElement.onplay = () => {
      setIsConnected(true);
      setIsWaiting(false);
    };

    // M102.48: Só mostrar "Sinal Fraco" se o vídeo ficar parado por mais de 3 segundos
    // Evita alarmes falsos em oscilações rápidas de rede
    let waitingTimeout: ReturnType<typeof setTimeout> | null = null;
    
    videoElement.onwaiting = () => {
      if (!waitingTimeout) {
        waitingTimeout = setTimeout(() => {
          setIsWaiting(true);
        }, 3000);
      }
    };

    videoElement.onplaying = () => {
      if (waitingTimeout) {
        clearTimeout(waitingTimeout);
        waitingTimeout = null;
      }
      setIsWaiting(false);
    };

    // M102.47: O onended só deve ocorrer se o servidor fechar a conexão propositalmente
    videoElement.onended = () => {
      console.log('[ChunkStream] Stream finalizado pelo servidor. Tentando reconectar em 3s...');
      setIsWaiting(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.src = `/api/webrtc/${webinarId}/stream/live?t=${Date.now()}`;
          videoRef.current.load();
        }
      }, 3000);
    };

    videoElement.onerror = (e) => {
      console.error('[ChunkStream] Erro no vídeo:', e);
      setIsWaiting(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.src = `/api/webrtc/${webinarId}/stream/live?t=${Date.now()}`;
          videoRef.current.load();
        }
      }, 2000);
    };

    // M102.53: Gold Standard Sync (2s Delay)
    const syncInterval = setInterval(() => {
      if (videoElement && !videoElement.paused) {
        const buffered = videoElement.buffered;
        if (buffered.length > 0) {
          const bufferEnd = buffered.end(buffered.length - 1);
          const delay = bufferEnd - videoElement.currentTime;
          
          // M102.53: Se o delay passar de 5s, pula para manter 2s de buffer de segurança
          if (delay > 5.0) {
            console.log(`[ChunkStream] ⚡ Gold Jump: ${delay.toFixed(1)}s -> 2.0s`);
            videoElement.currentTime = bufferEnd - 2.0;
          } 
          // Se o delay estiver entre 2.5s e 5s, acelera levemente
          else if (delay > 2.5) {
            videoElement.playbackRate = 1.1;
          } 
          else {
            videoElement.playbackRate = 1.0;
          }
        }
      }
    }, 2000);

    return () => clearInterval(syncInterval);

  }, [webinarId]);

  const stopChunkStream = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.src = '';
      videoRef.current.load();
    }
    setIsConnected(false);
  }, []);

  const cleanup = useCallback(() => {
    stopChunkStream();
  }, [stopChunkStream]);

  return { error, isConnected, isWaiting, startChunkStream, stopChunkStream, cleanup };
};
