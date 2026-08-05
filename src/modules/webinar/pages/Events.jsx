import { IconPlus, IconUsers } from '../components/WebinarIcons.jsx'
import WebinarEmptyState from '../components/WebinarEmptyState.jsx'
import WebinarEventCard from '../components/WebinarEventCard.jsx'
import { useWebinar } from '../context/WebinarContext.jsx'

export default function WebinarEventsPage() {
  const { metrics, events, publishDraft, canManage } = useWebinar()

  return (
    <section className="imp-module webinar-page">
      <header className="webinar-page__intro">
        <div>
          <h2>Gestão de webinars</h2>
          <p>Acompanhe agenda, publicação e resultados dos eventos do workspace.</p>
        </div>
        <button
          type="button"
          className="imp-btn imp-btn--primary"
          disabled
          title="Criação de eventos na próxima onda"
        >
          <IconPlus />
          Novo evento
        </button>
      </header>

      <div className="imp-module__metrics webinar-metrics">
        <article className="imp-metric">
          <p>Próximos</p>
          <strong className="accent">{metrics.upcoming}</strong>
          <span>Eventos agendados</span>
        </article>
        <article className="imp-metric">
          <p>Em destaque</p>
          <strong>{metrics.liveOrSoon}</strong>
          <span>Janela de 7 dias</span>
        </article>
        <article className="imp-metric">
          <p>Presença média</p>
          <strong className="success">{metrics.avgAttendance}</strong>
          <span>Eventos concluídos</span>
        </article>
        <article className="imp-metric">
          <p>Reuniões geradas</p>
          <strong>{metrics.meetingsBooked}</strong>
          <span>Pós-webinar</span>
        </article>
      </div>

      <div className="imp-panel">
        <div className="imp-panel__header">
          <div>
            <h2>Eventos</h2>
            <p>Lista operacional com status, host e ações rápidas.</p>
          </div>
        </div>

        {events.length === 0 ? (
          <WebinarEmptyState
            icon={IconUsers}
            title="Nenhum evento ainda"
            copy="Quando houver webinars no workspace, eles aparecerão aqui com status e atalhos."
          />
        ) : (
          <div className="imp-list">
            {events.map((event) => (
              <WebinarEventCard
                key={event.id}
                event={event}
                canManage={canManage}
                onPublish={publishDraft}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
