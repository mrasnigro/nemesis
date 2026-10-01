import { thermometerLabel } from '../data/catalogs.js'
import { useBdrSession } from '../hooks/useBdrSession.js'

function bandClass(label) {
  if (label === 'Frio') return 'bdr-thermo--frio'
  if (label === 'Morno') return 'bdr-thermo--morno'
  return 'bdr-thermo--quente'
}

/**
 * Sales thermometer 0–100 — bands ≤30 Frio / ≤65 Morno / >65 Quente.
 */
export default function ThermometerControl() {
  const { salesTemperature, setSalesTemperature } = useBdrSession()
  const label = thermometerLabel(salesTemperature)

  return (
    <div className={`bdr-thermo ${bandClass(label)}`}>
      <div className="bdr-thermo__header">
        <h3>Termômetro de Venda</h3>
        <strong>
          {salesTemperature}% · {label}
        </strong>
      </div>
      <div className="bdr-thermo__scale">
        <span>BAIXA</span>
        <span>ALTA</span>
      </div>
      <input
        id="salesThermometer"
        type="range"
        min={0}
        max={100}
        step={1}
        value={salesTemperature}
        onChange={(e) => setSalesTemperature(Number(e.target.value))}
        aria-valuetext={`${salesTemperature}% ${label}`}
      />
      <div className="bdr-thermo__bands">
        <span>≤30 Frio</span>
        <span>≤65 Morno</span>
        <span>&gt;65 Quente</span>
      </div>
    </div>
  )
}
