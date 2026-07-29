import { Link } from 'react-router-dom'
import '../Bdr.css'

const CALLS = [
  { id: 1, name: 'Maria Silva', result: 'Atendeu', time: '09:42' },
  { id: 2, name: 'João Pereira', result: 'Não atendeu', time: '09:28' },
  { id: 3, name: 'Ana Costa', result: 'Agendado', time: '09:15' },
  { id: 4, name: 'Carlos Souza', result: 'Caixa postal', time: '08:57' },
]

export default function BdrHistoricoPage() {
  return (
    <section className="bdr-section">
      <article className="bdr-section__card">
        <h2>Histórico de Chamadas</h2>
        <p>Últimas ligações realizadas nesta sessão do discador.</p>
        <ul className="bdr-section__list">
          {CALLS.map((call) => (
            <li key={call.id}>
              <strong>{call.name}</strong>
              <span>
                {call.result} · {call.time}
              </span>
            </li>
          ))}
        </ul>
      </article>
      <Link to="/modules/bdr" className="bdr-page__back">
        ← Voltar ao painel do discador
      </Link>
    </section>
  )
}
