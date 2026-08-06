import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
// import { useSimpleWebRTC } from '../hooks/useSimpleWebRTC';

const StudioPreview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [webinar, setWebinar] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [selectedMicrophone, setSelectedMicrophone] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [isReady, setIsReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  // const { stopCamera } = useSimpleWebRTC();

  // Carregar dados do webinar
  useEffect(() => {
    const fetchWebinarData = async () => {
      try {
        try {
          const response = await api.get(`/client/webinars/studio/${id}`);
          setWebinar(response.data);
        } catch (clientError) {
          const response = await api.get(`/admin/studio/${id}`);
          setWebinar(response.data.webinar);
        }
      } catch (error) {
        console.error('Erro ao carregar webinar:', error);
        navigate('/dashboard/webinars');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchWebinarData();
    }
  }, [id, navigate]);

  // Listar dispositivos disponíveis
  useEffect(() => {
    const listDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        const audioDevices = devices.filter(d => d.kind === 'audioinput');
        
        setCameras(videoDevices);
        setMicrophones(audioDevices);
        
        // Selecionar padrões
        if (videoDevices.length > 0) {
          setSelectedCamera(videoDevices[0].deviceId);
        }
        if (audioDevices.length > 0) {
          setSelectedMicrophone(audioDevices[0].deviceId);
        }
      } catch (error) {
        console.error('Erro ao listar dispositivos:', error);
      }
    };

    listDevices();
  }, []);

  // Iniciar câmera quando dispositivos forem selecionados
  useEffect(() => {
    if (!selectedCamera || !videoRef.current) return;

    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: selectedCamera }, width: 640, height: 480 },
          audio: { deviceId: { exact: selectedMicrophone } }
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsReady(true);

          // Configurar analisador de áudio
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const analyser = audioContext.createAnalyser();
          const source = audioContext.createMediaStreamSource(stream);
          source.connect(analyser);
          analyserRef.current = analyser;

          // Monitorar nível de áudio
          const monitorAudio = () => {
            if (analyserRef.current) {
              const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
              analyserRef.current.getByteFrequencyData(dataArray);
              const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
              setAudioLevel(Math.round(average));
            }
            animationRef.current = requestAnimationFrame(monitorAudio);
          };
          monitorAudio();
        }
      } catch (error) {
        console.error('Erro ao iniciar câmera:', error);
        setIsReady(false);
      }
    };

    initCamera();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [selectedCamera, selectedMicrophone]);

  const handleEnterStudio = async () => {
    // Parar a câmera de pré-visualização
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
    // Navegar para o estúdio
    navigate(`/studio/${id}`);
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
    <div className="flex-1 flex items-center justify-center bg-gray-900 p-4">
      <div className="w-full max-w-2xl bg-gray-800 rounded-lg overflow-hidden shadow-2xl border border-gray-700">
        {/* Header */}
        <div className="bg-gray-900 p-6 border-b border-gray-700">
          <h1 className="text-2xl font-bold text-white mb-2">{webinar.title}</h1>
          <p className="text-gray-400">Prepare-se para entrar no estúdio</p>
        </div>

        {/* Main Content */}
        <div className="p-6 space-y-6">
          {/* Video Preview */}
          <div className="space-y-2">
            <label className="text-white font-semibold">Pré-visualização da Câmera</label>
            <div className="relative bg-black rounded-lg overflow-hidden border-2 border-gray-700 aspect-video flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay={true}
                playsInline={true}
                muted={true}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: 'scaleX(-1)'
                }}
              />
              {!isReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                  <div className="text-center">
                    <div className="text-gray-400 text-4xl mb-2">📹</div>
                    <p className="text-gray-300">Aguardando câmera...</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Camera Selection */}
          <div className="space-y-2">
            <label className="text-white font-semibold">Câmera</label>
            <select
              value={selectedCamera}
              onChange={(e) => setSelectedCamera(e.target.value)}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
            >
              {cameras.map(camera => (
                <option key={camera.deviceId} value={camera.deviceId}>
                  {camera.label || `Câmera ${cameras.indexOf(camera) + 1}`}
                </option>
              ))}
            </select>
          </div>

          {/* Microphone Selection */}
          <div className="space-y-2">
            <label className="text-white font-semibold">Microfone</label>
            <select
              value={selectedMicrophone}
              onChange={(e) => setSelectedMicrophone(e.target.value)}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
            >
              {microphones.map(mic => (
                <option key={mic.deviceId} value={mic.deviceId}>
                  {mic.label || `Microfone ${microphones.indexOf(mic) + 1}`}
                </option>
              ))}
            </select>
          </div>

          {/* Audio Level Indicator */}
          <div className="space-y-2">
            <label className="text-white font-semibold">Nível de Áudio</label>
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="bg-gray-600 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-green-500 h-full transition-all duration-100"
                      style={{ width: `${Math.min(audioLevel, 255) / 255 * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-gray-300 text-sm font-mono w-12 text-right">
                  {Math.round((audioLevel / 255) * 100)}%
                </span>
              </div>
              <p className="text-gray-400 text-xs mt-2">
                {audioLevel < 30 ? '🔇 Fale para testar o microfone' : audioLevel < 100 ? '🔉 Áudio detectado' : '🔊 Áudio alto'}
              </p>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
            <p className="text-blue-200 text-sm">
              ✓ Verifique se o enquadramento está correto<br/>
              ✓ Teste o microfone falando algo<br/>
              ✓ Ajuste câmera e microfone se necessário
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => navigate('/dashboard/webinars')}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              ← Voltar
            </button>
            <button
              onClick={handleEnterStudio}
              disabled={!isReady}
              className={`flex-1 font-bold py-3 px-6 rounded-lg transition-colors ${
                isReady
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              ✓ Entrar no Estúdio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudioPreview;
