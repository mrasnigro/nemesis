import { useState, useRef, useCallback } from 'react';
import api from '../services/api';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export const useWebRTC = (webinarId: string, _isHost: boolean) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Host: Map of peer connections for multiple clients
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  
  // Client: Single peer connection to host
  const hostConnection = useRef<RTCPeerConnection | null>(null);
  
  // Polling intervals
  const pollingIntervals = useRef<ReturnType<typeof setInterval>[]>([]);

  const clearPolling = () => {
    pollingIntervals.current.forEach(clearInterval);
    pollingIntervals.current = [];
  };

  // --- HOST METHODS ---
  
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { height: 720 },
        audio: true
      });
      setLocalStream(stream);
      return stream;
    } catch (err) {
      setError('Não foi possível acessar câmera/microfone.');
      console.error(err);
      return null;
    }
  };

  const stopCamera = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
  };

  const initHostBroadcasting = async (stream: MediaStream) => {
    try {
      // Create a master connection just to generate the offer
      const masterPc = new RTCPeerConnection(ICE_SERVERS);
      stream.getTracks().forEach(track => masterPc.addTrack(track, stream));
      
      const offer = await masterPc.createOffer();
      await masterPc.setLocalDescription(offer);
      
      // Send offer to server
      await api.post(`/webrtc/${webinarId}/offer`, { offer });
      
      // Start polling for client answers
      const interval = setInterval(async () => {
        try {
          const { data } = await api.get(`/webrtc/${webinarId}/answers`);
          const answers = data.answers || {};
          
          for (const [clientId, answer] of Object.entries(answers)) {
            if (!peerConnections.current.has(clientId)) {
              // Create new connection for this client
              const pc = new RTCPeerConnection(ICE_SERVERS);
              stream.getTracks().forEach(track => pc.addTrack(track, stream));
              
              pc.onicecandidate = (event) => {
                if (event.candidate) {
                  api.post(`/webrtc/${webinarId}/candidate`, {
                    candidate: event.candidate,
                    senderId: 'host',
                    targetId: clientId
                  });
                }
              };
              
              await pc.setRemoteDescription(new RTCSessionDescription(answer as RTCSessionDescriptionInit));
              peerConnections.current.set(clientId, pc);
            }
          }
        } catch (err) {
          console.error('Error polling answers:', err);
        }
      }, 3000);
      
      pollingIntervals.current.push(interval);
      
    } catch (err) {
      setError('Erro ao iniciar transmissão P2P.');
      console.error(err);
    }
  };

  // --- CLIENT METHODS ---

  const connectAsClient = async (clientId: string) => {
    const pollForOffer = async (): Promise<any> => {
      try {
        const { data } = await api.get(`/webrtc/${webinarId}/offer`);
        return data.offer;
      } catch (err) {
        return null;
      }
    };
    
    const setupConnection = async (offer: any) => {
      try {
        console.log('[WebRTC Client] Oferta recebida, criando conexão P2P...');
      
      const pc = new RTCPeerConnection(ICE_SERVERS);
      hostConnection.current = pc;
      
      pc.ontrack = (event) => {
        console.log(`[WebRTC Client] Track recebido: ${event.track.kind}`);
        console.log(`[WebRTC Client] Track settings:`, event.track.getSettings());
        console.log(`[WebRTC Client] Track state:`, event.track.readyState);
        if (event.track.kind === 'video') {
          console.log(`[WebRTC Client] Video codec:`, event.track.getCapabilities?.());
        }
        setRemoteStream(event.streams[0]);
      };
      
      pc.onconnectionstatechange = () => {
        console.log(`[WebRTC Client] Estado da conexão: ${pc.connectionState}`);
      };
      
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          api.post(`/webrtc/${webinarId}/candidate`, {
            candidate: event.candidate,
            senderId: clientId,
            targetId: 'host'
          });
        }
      };
      
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      await api.post(`/webrtc/${webinarId}/answer`, { clientId, answer });
      
      // Poll for ICE candidates from host
      const interval = setInterval(async () => {
        try {
          const { data } = await api.get(`/webrtc/${webinarId}/candidates/${clientId}`);
          const candidates = data.candidates || [];
          
          for (const c of candidates) {
            if (c.senderId === 'host') {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(c.candidate));
              } catch (e) {
                // Ignore if already added
              }
            }
          }
        } catch (err) {
          console.error('Error polling candidates:', err);
        }
      }, 3000);
      
      pollingIntervals.current.push(interval);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Transmissão não iniciada ou erro de conexão.';
        setError(errorMsg);
        console.error('[WebRTC Client] Erro:', err);
      }
    };
    
    try {
      console.log(`[WebRTC Client] Conectando como cliente: ${clientId}`);
      
      let offer = await pollForOffer();
      
      if (!offer) {
        console.log('[WebRTC Client] Oferta não disponível, aguardando...');
        const pollInterval = setInterval(async () => {
          offer = await pollForOffer();
          if (offer) {
            clearInterval(pollInterval);
            console.log('[WebRTC Client] Oferta recebida após polling!');
            await setupConnection(offer);
          }
        }, 2000);
        pollingIntervals.current.push(pollInterval);
        return;
      }
      
      await setupConnection(offer);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao conectar ao WebRTC';
      setError(errorMsg);
      console.error('[WebRTC Client] Erro:', err);
    }
  };

  const cleanup = useCallback(() => {
    clearPolling();
    stopCamera();
    
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    
    if (hostConnection.current) {
      hostConnection.current.close();
      hostConnection.current = null;
    }
  }, []);

  return {
    localStream,
    remoteStream,
    error,
    startCamera,
    stopCamera,
    initHostBroadcasting,
    connectAsClient,
    cleanup
  };
};
