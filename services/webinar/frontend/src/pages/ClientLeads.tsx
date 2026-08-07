import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { useAuth } from '../hooks/useAuth'

interface Lead {
  id: number
  name: string
  email: string
  phone?: string
  webinar_id?: number
  status: string
  registered_at: string
  attended_at?: string
}

export default function ClientLeads() {
  const { user } = useAuth()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'registered' | 'attended' | 'no-show'>('all')
  const [stats, setStats] = useState({ total: 0, registered: 0, attended: 0, no_show: 0 })

  const clientId = user?.id != null ? String(user.id) : ''

  const loadStats = useCallback(async () => {
    if (!clientId) return
    try {
      const { data } = await api.get(`/leads/stats/${clientId}`)
      setStats(data.stats || { total: 0, registered: 0, attended: 0, no_show: 0 })
    } catch (err) {
      console.error('Erro ao carregar stats:', err)
    }
  }, [clientId])

  const loadLeads = useCallback(async () => {
    if (!clientId) {
      setLoading(false)
      setError('Sessão Webinar ausente')
      return
    }
    setLoading(true)
    try {
      const url =
        filter === 'all'
          ? `/leads/client/${clientId}`
          : `/leads/client/${clientId}?status=${filter}`
      const { data } = await api.get(url)
      setLeads(data.leads || [])
      setError(null)
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Erro ao carregar leads')
    } finally {
      setLoading(false)
    }
  }, [clientId, filter])

  useEffect(() => {
    void loadLeads()
    void loadStats()
  }, [loadLeads, loadStats])

  const handleDeleteLead = async (leadId: number) => {
    if (!confirm('Tem certeza que deseja deletar este lead?')) return
    try {
      await api.delete(`/leads/${leadId}`)
      setLeads((prev) => prev.filter((l) => l.id !== leadId))
      void loadStats()
    } catch (err: any) {
      alert(err?.response?.data?.error || err.message)
    }
  }

  const handleMarkAttended = async (leadId: number) => {
    try {
      await api.put(`/leads/${leadId}/attended`)
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status: 'attended' } : l)),
      )
      void loadStats()
    } catch (err: any) {
      alert(err?.response?.data?.error || err.message)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Meus Leads</h1>
        <p className="text-gray-600 mt-1">Gerencie os participantes dos seus webinars</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm">Total de Leads</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm">Registrados</p>
          <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.registered}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm">Presentes</p>
          <p className="text-3xl font-bold text-green-600 mt-2">{stats.attended}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm">Ausentes</p>
          <p className="text-3xl font-bold text-red-600 mt-2">{stats.no_show}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex gap-2 flex-wrap">
          {(['all', 'registered', 'attended', 'no-show'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f === 'all'
                ? 'Todos'
                : f === 'registered'
                  ? 'Registrados'
                  : f === 'attended'
                    ? 'Presentes'
                    : 'Ausentes'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <p className="text-gray-600">Carregando leads...</p>
          </div>
        ) : error ? (
          <div className="p-8 bg-red-50 text-red-800">
            <p>{error}</p>
          </div>
        ) : leads.length === 0 ? (
          <div className="p-8 text-center text-gray-600">
            <p>Nenhum lead encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Telefone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Data de Registro</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {lead.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{lead.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {lead.phone || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          lead.status === 'attended'
                            ? 'bg-green-100 text-green-800'
                            : lead.status === 'registered'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {lead.status === 'attended'
                          ? 'Presente'
                          : lead.status === 'registered'
                            ? 'Registrado'
                            : 'Ausente'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(lead.registered_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      {lead.status !== 'attended' && (
                        <button
                          type="button"
                          onClick={() => handleMarkAttended(lead.id)}
                          className="px-3 py-1 rounded text-xs font-medium bg-green-100 hover:bg-green-200 text-green-800 transition-colors"
                        >
                          Marcar Presente
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteLead(lead.id)}
                        className="px-3 py-1 rounded text-xs font-medium bg-red-100 hover:bg-red-200 text-red-800 transition-colors"
                      >
                        Deletar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
