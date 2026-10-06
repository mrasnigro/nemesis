import { useSearchParams } from 'react-router-dom'
import { webinarApi } from '../services/webinarPlatformApi.js'
import { useLoad } from '../hooks/useLoad.js'
import { useCanEdit } from '../hooks/useCanEdit.js'
import { errorMessage, formatDateTime } from '../utils/format.js'
import LeadsPanel from '../components/LeadsPanel.jsx'

/** Leads live inside a webinar; this page is the shortcut that picks one. */
export default function PlatformLeads() {
  const [params, setParams] = useSearchParams()
  const canEditWebinar = useCanEdit()
  const list = useLoad(() => webinarApi.listWebinars({ pageSize: 100, sort: '-scheduledAt' }), [])
  const webinars = list.data?.data || []
  const selected = webinars.find((webinar) => webinar.id === params.get('webinar')) || null

  return (
    <section className="imp-module">
      <header className="webinar-page-header">
        <div>
          <h2>Leads</h2>
          <p>Escolha um webinar para ver quem se inscreveu.</p>
        </div>
      </header>

      <div className="imp-panel">
        <label className="imp-field">
          <span>Webinar</span>
          <select
            value={selected?.id || ''}
            onChange={(event) => setParams(event.target.value ? { webinar: event.target.value } : {}, { replace: true })}
          >
            <option value="">Selecione…</option>
            {webinars.map((webinar) => (
              <option key={webinar.id} value={webinar.id}>
                {webinar.title} — {formatDateTime(webinar.scheduledAt, webinar.timezone)}
              </option>
            ))}
          </select>
        </label>
        {list.error ? <p className="webinar-note webinar-note--error">{errorMessage(list.error)}</p> : null}
        {list.data && webinars.length === 0 ? <div className="imp-empty">Crie um webinar para começar a captar leads.</div> : null}
      </div>

      {selected ? <LeadsPanel key={selected.id} webinarId={selected.id} canEdit={canEditWebinar(selected)} /> : null}
    </section>
  )
}
