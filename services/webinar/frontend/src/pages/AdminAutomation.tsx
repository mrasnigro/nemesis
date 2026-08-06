import React, { useState, useEffect } from 'react';

interface AutomationRule {
  id: string;
  webinar_id: string;
  type: 'fixed' | 'recurring' | 'jit';
  config: any;
  active: boolean;
  created_at: string;
}

interface WebinarSession {
  id: string;
  master_webinar_id: string;
  scheduled_at: string;
  status: 'scheduled' | 'live' | 'finished';
  participants_count: number;
  created_at: string;
}

export default function AdminAutomation() {
  const [webinarId, setWebinarId] = useState('');
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [sessions, setSessions] = useState<WebinarSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [ruleType, setRuleType] = useState<'fixed' | 'recurring' | 'jit'>('recurring');
  const [config, setConfig] = useState<any>({});
  const [selectedRule, setSelectedRule] = useState<string | null>(null);

  // Carregar regras quando webinar muda
  useEffect(() => {
    if (webinarId) {
      loadRules();
    }
  }, [webinarId]);

  const loadRules = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/automation/rules/webinar/${webinarId}`);
      const data = await response.json();
      setRules(data.rules || []);
    } catch (error) {
      console.error('Erro ao carregar regras:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSessions = async (ruleId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/automation/sessions/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rule_id: ruleId, count: 5 })
      });
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Erro ao carregar sessões:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webinarId) {
      alert('Selecione um webinar');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/automation/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webinar_id: webinarId,
          type: ruleType,
          config: config
        })
      });

      if (response.ok) {
        const newRule = await response.json();
        setRules([...rules, newRule]);
        setConfig({});
        alert('Regra criada com sucesso!');
      } else {
        alert('Erro ao criar regra');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao criar regra');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Tem certeza que deseja deletar esta regra?')) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/automation/rules/${ruleId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setRules(rules.filter(r => r.id !== ruleId));
        alert('Regra deletada com sucesso!');
      } else {
        alert('Erro ao deletar regra');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao deletar regra');
    } finally {
      setLoading(false);
    }
  };

  const renderConfigForm = () => {
    switch (ruleType) {
      case 'fixed':
        return (
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Datas e Horários (JSON)</span>
              <textarea
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder='[{"date":"2026-07-15","time":"19:00"}]'
                value={JSON.stringify(config.dates || [], null, 2)}
                onChange={(e) => setConfig({ dates: JSON.parse(e.target.value) })}
              />
            </label>
          </div>
        );
      case 'recurring':
        return (
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Dias da Semana (0=Dom, 1=Seg, ...)</span>
              <input
                type="text"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="1,3,5"
                value={config.days?.join(',') || ''}
                onChange={(e) => setConfig({ ...config, days: e.target.value.split(',').map(Number) })}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Horários</span>
              <input
                type="text"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="10:00,20:00"
                value={config.times?.join(',') || ''}
                onChange={(e) => setConfig({ ...config, times: e.target.value.split(',') })}
              />
            </label>
          </div>
        );
      case 'jit':
        return (
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Intervalo (minutos)</span>
              <input
                type="number"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="30"
                value={config.interval_minutes || ''}
                onChange={(e) => setConfig({ interval_minutes: parseInt(e.target.value) })}
              />
            </label>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Automação de Replays</h1>

      {/* Seleção de Webinar */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Selecione um Webinar Gravado</span>
          <select
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            value={webinarId}
            onChange={(e) => setWebinarId(e.target.value)}
          >
            <option value="">-- Escolha um webinar --</option>
            <option value="1">Webinar 1</option>
            <option value="2">Webinar 2</option>
            <option value="3">Webinar 3</option>
          </select>
        </label>
      </div>

      {webinarId && (
        <>
          {/* Criar Nova Regra */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Criar Nova Regra</h2>
            <form onSubmit={handleCreateRule} className="space-y-4">
              <div>
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Tipo de Recorrência</span>
                  <select
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={ruleType}
                    onChange={(e) => setRuleType(e.target.value as any)}
                  >
                    <option value="fixed">Datas Fixas</option>
                    <option value="recurring">Recorrente</option>
                    <option value="jit">Just-in-Time</option>
                  </select>
                </label>
              </div>

              {renderConfigForm()}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loading ? 'Criando...' : 'Criar Regra'}
              </button>
            </form>
          </div>

          {/* Lista de Regras */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Regras de Automação</h2>
            {rules.length === 0 ? (
              <p className="text-gray-500">Nenhuma regra criada para este webinar.</p>
            ) : (
              <div className="space-y-4">
                {rules.map((rule) => (
                  <div key={rule.id} className="border border-gray-200 rounded p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">Tipo: {rule.type}</p>
                        <p className="text-sm text-gray-600">Config: {JSON.stringify(rule.config)}</p>
                        <p className="text-sm text-gray-600">Criado: {new Date(rule.created_at).toLocaleString('pt-BR')}</p>
                      </div>
                      <div className="space-x-2">
                        <button
                          onClick={() => {
                            setSelectedRule(rule.id);
                            loadSessions(rule.id);
                          }}
                          className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                        >
                          Ver Sessões
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                        >
                          Deletar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sessões Geradas */}
          {selectedRule && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Próximas Sessões</h2>
              {sessions.length === 0 ? (
                <p className="text-gray-500">Nenhuma sessão gerada.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left">ID</th>
                        <th className="px-4 py-2 text-left">Data/Hora</th>
                        <th className="px-4 py-2 text-left">Status</th>
                        <th className="px-4 py-2 text-left">Participantes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((session) => (
                        <tr key={session.id} className="border-t">
                          <td className="px-4 py-2 text-sm">{session.id.substring(0, 8)}...</td>
                          <td className="px-4 py-2 text-sm">{new Date(session.scheduled_at).toLocaleString('pt-BR')}</td>
                          <td className="px-4 py-2 text-sm">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              session.status === 'live' ? 'bg-green-100 text-green-800' :
                              session.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {session.status}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm">{session.participants_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
