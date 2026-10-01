import CampaignList from '../components/CampaignList.jsx'
import DialerSetupPanel from '../components/DialerSetupPanel.jsx'
import MetricCards from '../components/MetricCards.jsx'
import OperatorStatusBar from '../components/OperatorStatusBar.jsx'
import QuickActions from '../components/QuickActions.jsx'
import TelephonySettingsPanel from '../components/TelephonySettingsPanel.jsx'
import { useAuth } from '../../../auth/AuthContext.jsx'
import '../styles/bdr-pages.css'

export default function BdrPainelPage() {
  const { user } = useAuth()
  const canManageTelephony = user?.profile === 'customer_admin'
  return (
    <section className="bdr-home">
      <MetricCards />
      <div className="bdr-home__grid">
        <div className="bdr-home__main">
          <OperatorStatusBar />
          <CampaignList />
        </div>
        <div className="bdr-home__side">
          <QuickActions />
          <DialerSetupPanel />
          {canManageTelephony ? <TelephonySettingsPanel /> : null}
        </div>
      </div>
    </section>
  )
}
