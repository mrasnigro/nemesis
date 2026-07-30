import CampaignList from '../components/CampaignList.jsx'
import MetricCards from '../components/MetricCards.jsx'
import OperatorStatusBar from '../components/OperatorStatusBar.jsx'
import QuickActions from '../components/QuickActions.jsx'
import '../../../pages/modules/Bdr.css'

export default function BdrPainelPage() {
  return (
    <section className="bdr-home">
      <MetricCards />
      <OperatorStatusBar />
      <div className="bdr-home__grid">
        <CampaignList />
        <QuickActions />
      </div>
    </section>
  )
}
