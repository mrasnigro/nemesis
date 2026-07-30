import { DIALER_TABS } from '../data/catalogs.js'
import { formatDurationHHMMSS } from '../services/formatters.js'
import { useBdrSession } from '../hooks/useBdrSession.js'

/** Foundation call status band — searching / connected chrome */
export default function CallStatusBand() {
  const { call } = useBdrSession()

  if (call.status === 'idle') return null

  const searching = call.status === 'searching'
  const connected = call.status === 'connected'
  const phone = call.currentLead?.phone || call.manualPhone || ''

  return (
    <div
      className={`bdr-call-band${searching ? ' bdr-call-band--searching' : ''}${
        connected ? ' bdr-call-band--connected' : ''
      }`}
      role="status"
    >
      <div className="bdr-call-band__left">
        <span className="bdr-call-band__phone-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.3 1.2.4 2.5.6 3.8.6.6 0 1 .4 1 1V21c0 .6-.4 1-1 1C10.6 22 2 13.4 2 2.9 2 2.4 2.4 2 3 2h3.5c.6 0 1 .4 1 1 0 1.3.2 2.6.6 3.8.1.4 0 .8-.3 1.1L6.6 10.8z"
            />
          </svg>
        </span>
        <div>
          <span className="bdr-call-band__label">
            {searching ? 'Aguardando ligação' : 'Falando'}
          </span>
          <strong className="bdr-call-band__phone">
            {connected && phone ? phone : '...'}
          </strong>
        </div>
      </div>
      <div className="bdr-call-band__right">
        <span>Tempo decorrido</span>
        <strong>{formatDurationHHMMSS(call.elapsedTime).slice(3)}</strong>
      </div>
    </div>
  )
}

export function DialerTabBar() {
  const { activeTab, setActiveTab, call } = useBdrSession()
  if (call.status !== 'connected') return null

  return (
    <div className="bdr-dialer-tabs" role="tablist" aria-label="Área da ligação">
      {DIALER_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          className={`bdr-dialer-tabs__tab${activeTab === tab.id ? ' is-active' : ''}`}
          onClick={() => setActiveTab(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
