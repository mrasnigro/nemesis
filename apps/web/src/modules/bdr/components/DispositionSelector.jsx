import { DISPOSITIONS } from '../data/catalogs.js'
import { useBdrSession } from '../hooks/useBdrSession.js'

const COLOR_CLASS = {
  green: 'bdr-disp--green',
  blue: 'bdr-disp--blue',
  yellow: 'bdr-disp--yellow',
  red: 'bdr-disp--red',
  'blue-dark': 'bdr-disp--blue-dark',
  black: 'bdr-disp--black',
  'green-dark': 'bdr-disp--green-dark',
}

/**
 * Full Vw disposition catalog — required before Finalizar Atendimento.
 */
export default function DispositionSelector() {
  const { dispositionId, setDisposition } = useBdrSession()

  return (
    <fieldset className="bdr-disp">
      <legend>Qualificação do atendimento (disposição)</legend>
      <p className="bdr-script__hint">Selecione o resultado conceitual da chamada antes de finalizar.</p>
      <div className="bdr-disp__list">
        {DISPOSITIONS.map((item) => {
          const selected = dispositionId === item.id
          return (
            <label
              key={item.id}
              className={`bdr-disp__item ${COLOR_CLASS[item.color] || ''}${selected ? ' is-selected' : ''}`}
            >
              <input
                type="radio"
                name="bdr-disposition"
                value={item.id}
                checked={selected}
                onChange={() => setDisposition(item.id)}
              />
              <span>{item.label}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
