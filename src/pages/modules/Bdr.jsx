import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Bdr.css'

const METRICS = [
  {
    id: 'total',
    label: 'Total de Ligações',
    value: '156',
    hint: '+12% vs semana anterior',
    hintTone: 'up',
  },
  {
    id: 'today',
    label: 'Contatos Hoje',
    value: '23',
    hint: 'Meta: 30 ligações',
    hintTone: 'warn',
  },
  {
    id: 'duration',
    label: 'Duração Média',
    value: '3m 45s',
    hint: 'Tempo médio por ligação',
    hintTone: 'muted',
  },
  {
    id: 'meetings',
    label: 'Reuniões Agendadas',
    value: '4',
    hint: 'Meta: 10 agendamentos',
    hintTone: 'up',
  },
]

const STATUSES = [
  { id: 'offline', label: 'Desconectado', activeClass: 'bdr-home__status--offline' },
  { id: 'active', label: 'Em atendimento', activeClass: 'bdr-home__status--active' },
  { id: 'break', label: 'Em intervalo', activeClass: 'bdr-home__status--break' },
  { id: 'busy', label: 'Indisponível', activeClass: 'bdr-home__status--busy' },
]

const CAMPAIGNS = [
  {
    id: 'padrao',
    title: 'Campanha Padrão',
    progress: 36,
    current: 89,
    total: 245,
    status: 'Ativa',
  },
  {
    id: 'fria',
    title: 'Prospecção Fria - Região Sul',
    progress: 46,
    current: 234,
    total: 512,
    status: 'Ativa',
  },
  {
    id: 'follow',
    title: 'Follow-up Clientes',
    progress: 100,
    current: 156,
    total: 156,
    status: 'Pausada',
  },
]

const ACTIONS = [
  { id: 'auto', label: 'Discagem Automática', to: '/modules/bdr/discagem', icon: 'phone' },
  { id: 'manual', label: 'Ligação Manual', to: '/modules/bdr/manual', icon: 'call' },
  { id: 'history', label: 'Ver Histórico de Chamadas', to: '/modules/bdr/historico', icon: 'history' },
  { id: 'agenda', label: 'Agendamentos Realizados', to: '/modules/bdr/agendamentos', icon: 'calendar' },
]

function ActionIcon({ name }) {
  const icons = {
    phone: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.3 1.2.4 2.5.6 3.8.6.6 0 1 .4 1 1V21c0 .6-.4 1-1 1C10.6 22 2 13.4 2 2.9 2 2.4 2.4 2 3 2h3.5c.6 0 1 .4 1 1 0 1.3.2 2.6.6 3.8.1.4 0 .8-.3 1.1L6.6 10.8z"
        />
      </svg>
    ),
    call: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M20 15.5c-1.2 0-2.4-.2-3.6-.6-.4-.1-.8 0-1.1.3l-2.2 2.2c-2.8-1.5-5.2-3.8-6.6-6.6L8.7 8.6c.3-.3.4-.7.3-1.1C8.6 6.3 8.4 5 8.4 3.8c0-.6-.4-1-1-1H3.9c-.6 0-1 .4-1 1C2.9 13.4 10.5 21 20 21c.6 0 1-.4 1-1v-3.5c0-.6-.4-1-1-1z"
        />
      </svg>
    ),
    history: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M13 3a9 9 0 1 0 8.94 8H19a7 7 0 1 1-2.05-4.95L14 9h7V2l-2.65 2.65A8.96 8.96 0 0 0 13 3zm-1 5v5l4.25 2.52.75-1.23-3.5-2.04V8H12z"
        />
      </svg>
    ),
    calendar: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M7 2h2v2h6V2h2v2h3a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3V2zm12 8H5v9h14v-9zM5 8h14V6H5v2z"
        />
      </svg>
    ),
  }

  return <span className="bdr-home__action-icon">{icons[name]}</span>
}

export default function BdrPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('offline')
  const [selectedCampaign, setSelectedCampaign] = useState('padrao')

  return (
    <section className="bdr-home">
      <div className="bdr-home__metrics">
        {METRICS.map((metric) => (
          <article key={metric.id} className="bdr-home__metric">
            <p>{metric.label}</p>
            <strong>{metric.value}</strong>
            <span className={`bdr-home__hint bdr-home__hint--${metric.hintTone}`}>{metric.hint}</span>
          </article>
        ))}
      </div>

      <div className="bdr-home__statuses" role="group" aria-label="Status do operador">
        {STATUSES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`bdr-home__status${status === item.id ? ` ${item.activeClass}` : ''}`}
            onClick={() => setStatus(item.id)}
          >
            <span className="bdr-home__status-dot" aria-hidden="true" />
            {item.label}
          </button>
        ))}
      </div>

      <div className="bdr-home__grid">
        <section className="bdr-home__panel">
          <header>
            <h2>Campanhas Ativas</h2>
            <p>Selecione a campanha para operar no discador.</p>
          </header>

          <ul className="bdr-home__campaigns">
            {CAMPAIGNS.map((campaign) => {
              const selected = selectedCampaign === campaign.id
              return (
                <li key={campaign.id}>
                  <button
                    type="button"
                    className={`bdr-home__campaign${selected ? ' bdr-home__campaign--selected' : ''}`}
                    onClick={() => setSelectedCampaign(campaign.id)}
                  >
                    <div className="bdr-home__campaign-top">
                      <strong>{campaign.title}</strong>
                      <span>{selected ? 'Selecionado' : campaign.status}</span>
                    </div>
                    <div className="bdr-home__progress" aria-hidden="true">
                      <span style={{ width: `${campaign.progress}%` }} />
                    </div>
                    <p>
                      {campaign.current} de {campaign.total} contatos · {campaign.progress}%
                    </p>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>

        <aside className="bdr-home__panel bdr-home__panel--actions">
          <header>
            <h2>Ações Rápidas</h2>
            <p>Navegue pelas funcionalidades do discador.</p>
          </header>

          <div className="bdr-home__actions">
            {ACTIONS.map((action) => (
              <button key={action.id} type="button" onClick={() => navigate(action.to)}>
                <ActionIcon name={action.icon} />
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </section>
  )
}
