import CampaignList from '../components/CampaignList.jsx'
import MetricCards from '../components/MetricCards.jsx'
import OperatorStatusBar from '../components/OperatorStatusBar.jsx'
import QuickActions from '../components/QuickActions.jsx'
import '../../../pages/modules/Bdr.css'

export default function BdrPainelPage() {
  return (
    <section className="bdr-home">
      <MetricCards />
      <div className="bdr-home__grid">
        <div className="bdr-home__main">
          <OperatorStatusBar />
          <CampaignList />
        </div>
        <QuickActions />
      </div>
    </section>
  )
}
