import api from '../services/api';
import { useState, useRef, useCallback } from 'react';



export const useSimpleWebRTC = () => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const webinarIdRef = useRef<string>('');
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const isTransmittingRef = useRef<boolean>(false);
  const watchdogRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const shouldBeRecordingRef = useRef<boolean>(false);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const chunkCountRef = useRef<number>(0);

  const ICE_SERVERS = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  // Função para obter câmera padrão (Integrada > USB > Qualquer uma)
  const getDefaultCamera = async (): Promise<string | undefined> => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      
      console.log('Câmeras encontradas:', videoDevices.map(d => `${d.label} (${d.deviceId}`));
      
      const builtIn = videoDevices.find(d => 
        d.label.toLowerCase().includes('built-in') || 
        d.label.toLowerCase().includes('integrated') ||
        d.label.toLowerCase().includes('facetime') ||
        d.label.toLowerCase().includes('isight')
      );
      if (builtIn) {
        console.log('Camera integrada selecionada:', builtIn.label);
        return builtIn.deviceId;
      }
      
      const usb = videoDevices.find(d => 
        d.label.toLowerCase().includes('usb') || 
        d.label.toLowerCase().includes('external')
      );
      if (usb) {
        console.log('Camera USB selecionada:', usb.label);
        return usb.deviceId;
      }
      
      if (videoDevices.length > 0) {
        console.log('Primeira camera selecionada:', videoDevices[0].label);
        return videoDevices[0].deviceId;
      }
      
      console.warn('Nenhuma camera encontrada');
      return undefined;
    } catch (err) {
      console.error('Erro ao enumerar devices:', err);
      return undefined;
    }
  };

  // Iniciar câmera
  const startCamera = async (videoRef: React.RefObject<HTMLVideoElement>) => {
    try {
      console.log('=== INICIANDO CÂMERA ===');
      const cameraId = await getDefaultCamera();
      
      const constraints: MediaStreamConstraints = {
        video: cameraId ? { deviceId: { exact: cameraId }, width: 640, height: 480 } : { width: 640, height: 480 },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('✓ Stream obtido:', stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        console.log('✓ Stream vinculado ao videoRef');
      }
      
      activeStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err: any) {
      const errorMsg = err.name === 'NotAllowedError' 
        ? 'Permissão de câmera negada. Verifique as configurações do navegador.'
        : `Erro ao acessar câmera: ${err.message}`;
      console.error('Erro ao iniciar câmera:', err);
      setError(errorMsg);
      return null;
    }
  };

  // Parar câmera
  const stopCamera = () => {
    console.log('=== DESLIGANDO CÂMERA ===');
    if (activeStreamRef.current && !isTransmittingRef.current) {
      activeStreamRef.current.getTracks().forEach(track => {
        console.log(`Parando track: ${track.kind}`);
        track.stop();
      });
      activeStreamRef.current = null;
      setLocalStream(null);
      console.log('✓ Câmera e microfone desligados');
    } else if (isTransmittingRef.current) {
      console.log('⚠️  Transmissão em andamento - não desligando câmera');
    }
  };

  // Iniciar compartilhamento de tela
  const startScreenShare = async () => {
    try {
      console.log('=== INICIANDO COMPARTILHAMENTO DE TELA ===');
      const screen = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' } as any,
        audio: false
      });
      
      screenStreamRef.current = screen;
      setScreenStream(screen);
      setIsScreenSharing(true);
      console.log('✓ Compartilhamento de tela iniciado');
      
      screen.getTracks()[0].onended = () => {
        console.log('Compartilhamento de tela encerrado pelo usuário');
        stopScreenShare();
      };
      
      return screen;
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') {
        console.error('Erro ao compartilhar tela:', err);
        setError(`Erro ao compartilhar tela: ${err.message}`);
      }
      return null;
    }
  };

  // Parar compartilhamento de tela
  const stopScreenShare = () => {
    console.log('=== PARANDO COMPARTILHAMENTO DE TELA ===');
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => {
        console.log(`Parando track de tela: ${track.kind}`);
        track.stop();
      });
      screenStreamRef.current = null;
      setScreenStream(null);
      setIsScreenSharing(false);
      console.log('✓ Compartilhamento de tela parado');
    }
  };

  // Função interna para criar e iniciar o MediaRecorder
  const createAndStartRecorder = (stream: MediaStream): boolean => {
    try {
      // M7.02: Otimizado para redes móveis 4G
      const options = {
        audioBitsPerSecond: 64000,   // 64kbps (Voz clara e leve)
        videoBitsPerSecond: 500000   // 500kbps (Leve para 4G)
      };
      const mediaRecorder = new MediaRecorder(stream, options);
      
      console.log('[Recorder] MediaRecorder criado, MIME:', mediaRecorder.mimeType);
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunkCountRef.current++;
          const chunkNum = chunkCountRef.current;
          
          if (chunkNum <= 3 || chunkNum % 30 === 0) {
            console.log(`[Recorder] Chunk #${chunkNum}: ${event.data.size} bytes`);
          }
          
          recordedChunksRef.current.push(event.data);
          
          // Enviar chunk para backend
          if (webinarIdRef.current) {
            const reader = new FileReader();
            reader.onload = async () => {
              try {
                const arrayBuffer = reader.result as ArrayBuffer;
                const response = await fetch(`/api/webrtc/${webinarIdRef.current}/stream/chunk`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/octet-stream' },
                  body: arrayBuffer
                });
                if (!response.ok) {
                  console.error(`[Recorder] Erro ao enviar chunk #${chunkNum}: ${response.status}`);
                }
              } catch (err) {
                console.error(`[Recorder] Erro de rede ao enviar chunk #${chunkNum}:`, err);
              }
            };
            reader.readAsArrayBuffer(event.data);
          }
        }
      };
      
      mediaRecorder.onstart = () => {
        console.log('[Recorder] ✓ MediaRecorder iniciado (state: recording)');
        setIsRecording(true);
      };
      
      mediaRecorder.onstop = () => {
        console.log(`[Recorder] MediaRecorder parou. shouldBeRecording=${shouldBeRecordingRef.current}`);
        // NÃO setar isRecording=false aqui se o watchdog vai reiniciar
        if (!shouldBeRecordingRef.current) {
          setIsRecording(false);
        }
      };
      
      mediaRecorder.onerror = (event: any) => {
        console.error('[Recorder] ERRO no MediaRecorder:', event.error?.name, event.error?.message);
      };
      
      mediaRecorderRef.current = mediaRecorder;
      // M102.52: Ajustado para 1000ms (1 segundo)
      // Equilíbrio perfeito entre estabilidade e baixa latência
      mediaRecorder.start(1000);
      return true;
    } catch (err: any) {
      console.error('[Recorder] Falha ao criar MediaRecorder:', err);
      return false;
    }
  };

  // WATCHDOG: Monitora o MediaRecorder e reinicia se parar inesperadamente
  const startWatchdog = useCallback(() => {
    if (watchdogRef.current) {
      clearInterval(watchdogRef.current);
    }
    
    console.log('[Watchdog] Iniciando monitoramento do MediaRecorder...');
    
    watchdogRef.current = setInterval(() => {
      if (!shouldBeRecordingRef.current) {
        // Transmissão foi encerrada intencionalmente, parar watchdog
        if (watchdogRef.current) {
          clearInterval(watchdogRef.current);
          watchdogRef.current = null;
        }
        return;
      }
      
      const recorder = mediaRecorderRef.current;
      const stream = recordingStreamRef.current;
      
      if (!recorder || recorder.state === 'inactive') {
        console.warn('[Watchdog] ⚠️ MediaRecorder inativo! Tentando reiniciar...');
        
        if (stream && stream.active) {
          // Stream ainda está ativo, reiniciar MediaRecorder
          console.log('[Watchdog] Stream ainda ativo, reiniciando MediaRecorder...');
          const success = createAndStartRecorder(stream);
          if (success) {
            console.log('[Watchdog] ✓ MediaRecorder reiniciado com sucesso!');
          } else {
            console.error('[Watchdog] ✗ Falha ao reiniciar MediaRecorder');
          }
        } else {
          console.error('[Watchdog] ✗ Stream inativo, não é possível reiniciar');
          shouldBeRecordingRef.current = false;
          setIsRecording(false);
          if (watchdogRef.current) {
            clearInterval(watchdogRef.current);
            watchdogRef.current = null;
          }
        }
      } else if (recorder.state === 'paused') {
        console.warn('[Watchdog] MediaRecorder pausado, resumindo...');
        recorder.resume();
      }
      // Se state === 'recording', tudo OK
    }, 5000);
  }, []);

  // Iniciar gravação
  const startRecording = async (stream: MediaStream) => {
    try {
      console.log('[Recorder] === INICIANDO GRAVAÇÃO ===');
      console.log('[Recorder] Tracks:', stream.getTracks().map(t => `${t.kind}: ${t.enabled}, readyState: ${t.readyState}`));
      
      // Se já está gravando, parar primeiro
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        console.log('[Recorder] Parando gravação anterior...');
        shouldBeRecordingRef.current = false; // Evitar que watchdog reinicie
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current = null;
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // RESETAR chunks no backend antes de iniciar nova transmissão
      if (webinarIdRef.current) {
        console.log(`[Recorder] Resetando chunks no backend para webinar ${webinarIdRef.current}...`);
        try {
          await fetch(`/api/webrtc/${webinarIdRef.current}/stream/reset`, { method: 'POST' });
          console.log('[Recorder] ✓ Chunks resetados no backend');
        } catch (err) {
          console.error('[Recorder] Erro ao resetar chunks:', err);
        }
      }
      
      recordedChunksRef.current = [];
      chunkCountRef.current = 0;
      recordingStreamRef.current = stream;
      shouldBeRecordingRef.current = true;
      
      // Criar e iniciar MediaRecorder
      const success = createAndStartRecorder(stream);
      if (!success) {
        shouldBeRecordingRef.current = false;
        return;
      }
      
      // Iniciar watchdog
      startWatchdog();
      
      // Monitorar tracks do stream - se uma track terminar, logar
      stream.getTracks().forEach(track => {
        track.onended = () => {
          console.warn(`[Recorder] ⚠️ Track ${track.kind} terminou! (readyState: ${track.readyState})`);
        };
      });
      
    } catch (err: any) {
      console.error('[Recorder] Erro ao gravar:', err);
      setError(`Erro ao gravar: ${err.message}`);
      shouldBeRecordingRef.current = false;
    }
  };

  // Parar gravação (intencional)
  const stopRecording = () => {
    console.log('[Recorder] === PARANDO GRAVAÇÃO (intencional) ===');
    shouldBeRecordingRef.current = false;
    
    // Parar watchdog
    if (watchdogRef.current) {
      clearInterval(watchdogRef.current);
      watchdogRef.current = null;
    }
    
    // Parar MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    recordingStreamRef.current = null;
    setIsRecording(false);
  };


  // Iniciar transmissão WebRTC P2P
  const initWebRTCBroadcasting = async (stream: MediaStream, webinarId: string) => {
    try {
      console.log('[WebRTC Host] Iniciando transmissao P2P...');
      isTransmittingRef.current = true;
      webinarIdRef.current = webinarId;
      
      const tempPc = new RTCPeerConnection(ICE_SERVERS);
      stream.getTracks().forEach(track => tempPc.addTrack(track, stream));
      
      const offer = await tempPc.createOffer();
      await tempPc.setLocalDescription(offer);
      
      console.log('[WebRTC Host] Oferta criada, enviando ao servidor...');
      await api.post(`/webrtc/${webinarId}/offer`, { offer });
      console.log('[WebRTC Host] Oferta enviada com sucesso');
      
      tempPc.close();
      
      console.log('[WebRTC Host] Transmissao WebRTC P2P iniciada');
    } catch (err) {
      console.error('[WebRTC Host] Erro:', err);
      setError('Erro ao iniciar transmissao P2P.');
    }
  };

  const stopWebRTCBroadcasting = () => {
    isTransmittingRef.current = false;
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
  };

  return {
    localStream,
    isRecording,
    error,
    screenStream,
    isScreenSharing,
    startCamera,
    stopCamera,
    startRecording,
    stopRecording,
    startScreenShare,
    stopScreenShare,
    initWebRTCBroadcasting,
    stopWebRTCBroadcasting
  };
};
