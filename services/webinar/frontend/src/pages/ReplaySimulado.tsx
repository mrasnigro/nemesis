import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

interface ChatMessage {
  id: string;
  user: string;
  message: string;
  timestamp: string;
  role: 'admin' | 'client';
  timeOffset: number;
}

interface ReplayMetadata {
  webinarId: string;
  title: string;
  startTime: string;
  endTime?: string;
  duration: number;
  videoFile: string;
  chatMessages: ChatMessage[];
  createdAt: string;
  status: 'recording' | 'completed' | 'scheduled';
  scheduledReplays: Array<{ date: string; time: string }>;
}

export default function ReplaySimulado() {
  const { webinarId } = useParams<{ webinarId: string }>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const [metadata, setMetadata] = useState<ReplayMetadata | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [visibleMessages, setVisibleMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Carregar metadados e chat do webinar
  useEffect(() => {
    const loadReplayData = async () => {
      try {
        setIsLoading(true);

        // Carregar metadados
        const metadataResponse = await api.get(`/replay/${webinarId}/metadata`);
        setMetadata(metadataResponse.data);

        // Carregar mensagens de chat
        const chatResponse = await api.get(`/replay/${webinarId}/chat`);
        setChatMessages(chatResponse.data.messages || []);

        setError(null);
      } catch (err: any) {
        console.error('Erro ao carregar replay:', err);
        setError(err.response?.data?.error || 'Erro ao carregar replay');
      } finally {
        setIsLoading(false);
      }
    };

    if (webinarId) {
      loadReplayData();
    }
  }, [webinarId]);

  // Sincronizar chat com o tempo do vídeo
  useEffect(() => {
    if (!videoRef.current || chatMessages.length === 0) return;

    const currentVideoTime = videoRef.current.currentTime;

    // Mostrar mensagens que já ocorreram (com um pequeno buffer)
    const messagesToShow = chatMessages.filter(msg => {
      const messageTime = msg.timeOffset;
      return messageTime <= currentVideoTime && messageTime > currentVideoTime - 5; // Mostrar últimas 5 segundos
    });

    setVisibleMessages(messagesToShow);

    // Auto-scroll para a última mensagem
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [currentTime, chatMessages]);

  // Atualizar tempo do vídeo
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Carregando replay...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <p className="text-red-500 text-lg">{error}</p>
          <button
            onClick={() => window.history.back()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">{metadata?.title}</h1>
          <p className="text-gray-400">
            Replay Simulado • {metadata?.duration} segundos • {new Date(metadata?.createdAt || '').toLocaleDateString('pt-BR')}
          </p>
        </div>

        {/* Conteúdo Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Vídeo */}
          <div className="lg:col-span-2">
            <div className="bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-auto bg-black"
                controls
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
              >
                <source src={`/api/replay/${webinarId}/video`} type="video/webm" />
                Seu navegador não suporta vídeo HTML5.
              </video>
            </div>

            {/* Informações do Replay */}
            <div className="mt-4 bg-gray-800 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-2">Informações do Replay</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Duração</p>
                  <p className="font-semibold">{formatTime(duration)}</p>
                </div>
                <div>
                  <p className="text-gray-400">Tempo Atual</p>
                  <p className="font-semibold">{formatTime(currentTime)}</p>
                </div>
                <div>
                  <p className="text-gray-400">Mensagens de Chat</p>
                  <p className="font-semibold">{chatMessages.length}</p>
                </div>
                <div>
                  <p className="text-gray-400">Status</p>
                  <p className="font-semibold capitalize">{metadata?.status}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Chat Simulado */}
          <div className="bg-gray-800 rounded-lg overflow-hidden flex flex-col h-96 lg:h-auto">
            <div className="bg-gray-700 px-4 py-3 border-b border-gray-600">
              <h3 className="font-semibold">Chat Simulado</h3>
              <p className="text-xs text-gray-400">Sincronizado com o vídeo</p>
            </div>

            {/* Mensagens */}
            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-3"
            >
              {visibleMessages.length > 0 ? (
                visibleMessages.map(msg => (
                  <div
                    key={msg.id}
                    className={`p-2 rounded text-sm ${
                      msg.role === 'admin'
                        ? 'bg-blue-900 border-l-2 border-blue-500'
                        : 'bg-gray-700'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <p className="font-semibold text-xs">{msg.user}</p>
                      <span className="text-xs text-gray-400">
                        {formatTime(msg.timeOffset)}
                      </span>
                    </div>
                    <p className="text-xs mt-1 text-gray-100">{msg.message}</p>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                  <p>Nenhuma mensagem neste momento</p>
                </div>
              )}
            </div>

            {/* Estatísticas */}
            <div className="bg-gray-700 px-4 py-3 border-t border-gray-600 text-xs text-gray-400">
              <p>Total de mensagens: {chatMessages.length}</p>
              <p>Visíveis agora: {visibleMessages.length}</p>
            </div>
          </div>
        </div>

        {/* Replays Agendados */}
        {metadata?.scheduledReplays && metadata.scheduledReplays.length > 0 && (
          <div className="mt-6 bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">Replays Agendados</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {metadata.scheduledReplays.map((replay, idx) => (
                <div
                  key={idx}
                  className="bg-gray-700 rounded p-3 text-sm"
                >
                  <p className="text-gray-400">Próximo Replay</p>
                  <p className="font-semibold">
                    {new Date(replay.date).toLocaleDateString('pt-BR')} às {replay.time}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
