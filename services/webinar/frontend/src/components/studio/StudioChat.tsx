import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';

interface Message {
  id: number | string;
  userName: string;
  message: string;
  timestamp: string;
  role: string;
  user?: string; // Fallback for compatibility
}

interface StudioChatProps {
  webinarId: string | number;
  isParticipant?: boolean;
}

const StudioChat: React.FC<StudioChatProps> = ({ webinarId, isParticipant = false }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'questions'>('all');
  const [userName, setUserName] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Carregar nome do usuário do localStorage ou gerar um anônimo
  useEffect(() => {
    const storedUserName = localStorage.getItem('userName');
    if (storedUserName) {
      setUserName(storedUserName);
    } else {
      const anonymousName = `Participante ${Math.floor(Math.random() * 1000)}`;
      setUserName(anonymousName);
      localStorage.setItem('userName', anonymousName);
    }
  }, []);

  // Polling for new messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        if (isParticipant) {
          // Para participantes (leads públicos), usar rota pública
          const response = await api.get(`/public/leads/chat/${webinarId}`);
          setMessages(response.data);
        } else {
          // Para apresentador (cliente autenticado), usar rota autenticada
          // M102.54: Tentar rota autenticada, com fallback para rota pública
          try {
            const response = await api.get(`/client/webinars/studio/${webinarId}/chat`);
            setMessages(response.data);
          } catch (authErr) {
            const response = await api.get(`/public/leads/chat/${webinarId}`);
            setMessages(response.data);
          }
        }
      } catch (error) {
        console.error('[StudioChat] Erro ao buscar mensagens:', error);
      }
    };

    fetchMessages(); // Initial fetch
    const interval = setInterval(fetchMessages, 3000); // Poll every 3s

    return () => clearInterval(interval);
  }, [webinarId, isParticipant]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const userRole = isParticipant ? 'participant' : 'client';
      const displayName = isParticipant ? userName : 'Apresentador (Você)';
      
      if (isParticipant) {
        // Para participantes (leads públicos), usar rota pública
        await api.post(`/public/leads/chat/${webinarId}`, {
          message: newMessage,
          userName: displayName,
          role: userRole
        });
      } else {
        // Para apresentador (cliente autenticado), usar rota autenticada
        // M102.54: Tentar rota autenticada, com fallback para rota pública
        try {
          await api.post(`/client/webinars/studio/${webinarId}/chat`, {
            message: newMessage,
            userName: displayName,
            role: userRole
          });
        } catch (authErr) {
          console.warn('[StudioChat] Rota autenticada falhou, usando rota pública...');
          await api.post(`/public/leads/chat/${webinarId}`, {
            message: newMessage,
            userName: displayName,
            role: userRole
          });
        }
      }
      setNewMessage('');
    } catch (error) {
      console.error('[StudioChat] Erro ao enviar mensagem:', error);
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-gray-900 border-l border-gray-800">
      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        <button 
          className={`flex-1 py-3 text-sm font-medium ${activeTab === 'all' ? 'text-white border-b-2 border-blue-500 bg-gray-800' : 'text-gray-400 hover:bg-gray-800/50'}`}
          onClick={() => setActiveTab('all')}
        >
          Chat Geral
        </button>
        <button 
          className={`flex-1 py-3 text-sm font-medium ${activeTab === 'questions' ? 'text-white border-b-2 border-blue-500 bg-gray-800' : 'text-gray-400 hover:bg-gray-800/50'}`}
          onClick={() => setActiveTab('questions')}
        >
          Perguntas (Q&A)
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-10 text-sm">
            Nenhuma mensagem ainda. O chat começará quando a transmissão iniciar.
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.role === 'client' ? 'items-end' : 'items-start'}`}>
              <div className="flex items-baseline gap-2 mb-1">
                <span className={`text-xs font-bold ${msg.role === 'client' ? 'text-blue-400' : 'text-gray-300'}`}>
                  {msg.userName || msg.user}
                </span>
                <span className="text-[10px] text-gray-600">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className={`px-3 py-2 rounded-lg max-w-[85%] text-sm ${
                msg.role === 'client' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-gray-800 text-gray-200 rounded-tl-none'
              }`}>
                {msg.message}
              </div>
              
              {/* Moderação controls para mensagens de participantes - apenas para apresentador */}
              {!isParticipant && msg.role === 'participant' && (
                <div className="flex gap-2 mt-1 opacity-0 hover:opacity-100 transition-opacity">
                  <button className="text-[10px] text-gray-500 hover:text-red-400">Excluir</button>
                  <button className="text-[10px] text-gray-500 hover:text-yellow-400">Destacar</button>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-800 bg-gray-950">
        {isParticipant && (
          <div className="mb-3 text-xs text-gray-500 px-2">
            Conectado como: <span className="text-gray-300 font-medium">{userName}</span>
          </div>
        )}
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={isParticipant ? "Faça uma pergunta ou comente..." : "Digite uma mensagem..."}
            className="flex-1 bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
          />
          <button 
            type="submit"
            disabled={!newMessage.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
};

export default StudioChat;
