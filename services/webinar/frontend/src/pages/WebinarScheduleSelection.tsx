import { useState, useEffect } from 'react';

interface WebinarSession {
  id: string;
  master_webinar_id: string;
  scheduled_at: string;
  status: 'scheduled' | 'live' | 'finished';
  participants_count: number;
  created_at: string;
}

interface AutomationRule {
  id: string;
  webinar_id: string;
  type: 'fixed' | 'recurring' | 'jit';
  config: any;
  active: boolean;
}

export default function WebinarScheduleSelection({ webinarId }: { webinarId: string }) {
  const [sessions, setSessions] = useState<WebinarSession[]>([]);
  // const [rules, setRules] = useState<AutomationRule[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [jitActive, setJitActive] = useState(false);

  useEffect(() => {
    loadRulesAndSessions();
  }, [webinarId]);

  useEffect(() => {
    if (!jitActive) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 0) {
          loadRulesAndSessions();
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [jitActive]);

  const loadRulesAndSessions = async () => {
    setLoading(true);
    try {
      // Carregar regras
      const rulesResponse = await fetch(`/api/automation/rules/webinar/${webinarId}`);
      const rulesData = await rulesResponse.json();
      // setRules(rulesData.rules || []);

      // Carregar próximas sessões
      const sessionsResponse = await fetch(`/api/automation/sessions/upcoming/${webinarId}`);
      const sessionsData = await sessionsResponse.json();
      setSessions(sessionsData.sessions || []);

      // Verificar se há regra JIT ativa
      const jitRule = rulesData.rules?.find((r: AutomationRule) => r.type === 'jit' && r.active);
      if (jitRule) {
        setJitActive(true);
        setCountdown(jitRule.config.interval_minutes * 60);
      }
    } catch (error) {
      console.error('Erro ao carregar sessões:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSession = async (sessionId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/automation/sessions/${sessionId}/join`, {
        method: 'POST'
      });

      if (response.ok) {
        setSelectedSession(sessionId);
        alert('Você se registrou com sucesso! Você receberá um email com o link de acesso.');
      } else {
        alert('Erro ao registrar');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao registrar');
    } finally {
      setLoading(false);
    }
  };

  const formatCountdown = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <div className="text-center py-8">Carregando horários disponíveis...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Selecione um Horário</h1>

      {jitActive && countdown !== null && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800 font-medium">Próxima sessão começa em:</p>
          <p className="text-3xl font-bold text-red-600 mt-2">{formatCountdown(countdown)}</p>
          <p className="text-sm text-red-700 mt-2">Não perca! As vagas são limitadas.</p>
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Nenhuma sessão disponível no momento. Tente novamente em breve.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => {
            const sessionDate = new Date(session.scheduled_at);
            const now = new Date();
            const isUpcoming = sessionDate > now;
            const hoursUntil = Math.floor((sessionDate.getTime() - now.getTime()) / (1000 * 60 * 60));

            return (
              <div
                key={session.id}
                className={`border-2 rounded-lg p-4 cursor-pointer transition ${
                  selectedSession === session.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                } ${!isUpcoming ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => isUpcoming && handleSelectSession(session.id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-lg font-semibold">
                      {sessionDate.toLocaleDateString('pt-BR', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">
                      {sessionDate.toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                    {isUpcoming && hoursUntil < 24 && (
                      <p className="text-sm text-red-600 font-medium mt-2">Começa em {hoursUntil} horas!</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">{session.participants_count} inscritos</p>
                    <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${
                      session.status === 'live' ? 'bg-green-100 text-green-800' :
                      session.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {session.status === 'live' ? 'AO VIVO' :
                       session.status === 'scheduled' ? 'Agendado' :
                       'Finalizado'}
                    </span>
                  </div>
                </div>
                {selectedSession === session.id && (
                  <div className="mt-4 p-3 bg-blue-100 rounded text-blue-800 text-sm">
                    Você está registrado para esta sessão. Verifique seu email para o link de acesso.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-800 font-medium">Você receberá notificações por email</p>
        <ul className="text-sm text-blue-700 mt-2 space-y-1">
          <li>24 horas antes da sessão</li>
          <li>1 hora antes da sessão</li>
          <li>15 minutos antes da sessão</li>
        </ul>
      </div>
    </div>
  );
}
