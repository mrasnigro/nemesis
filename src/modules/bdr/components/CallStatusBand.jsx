import { DIALER_TABS } from '../data/catalogs.js'
import { formatDurationHHMMSS } from '../services/formatters.js'
import { useBdrSession } from '../hooks/useBdrSession.js'
import { IconPhone, TabIcon } from './DialerIcons.jsx'

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
          <IconPhone className="bdr-call-band__phone-svg" />
        </span>
        <div>
          <p className="bdr-call-band__label">
            {searching ? 'Aguardando ligação' : 'Falando'}
          </p>
          <p className="bdr-call-band__phone">
            {connected && phone ? phone : '...'}
          </p>
        </div>
      </div>
      <div className="bdr-call-band__right">
        <p>Tempo decorrido</p>
        <p className="bdr-call-band__timer">
          {formatDurationHHMMSS(call.elapsedTime).slice(3)}
        </p>
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
          <TabIcon name={tab.icon} className="bdr-dialer-tabs__icon" />
          {tab.label}
        </button>
      ))}
    </div>
  )
}
