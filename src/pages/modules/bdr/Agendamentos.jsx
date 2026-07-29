import { Link } from 'react-router-dom'
import '../Bdr.css'

const MEETINGS = [
  { id: 1, name: 'Reunião — TechNova', when: 'Hoje, 14:00' },
  { id: 2, name: 'Demo — Orbit Soft', when: 'Amanhã, 10:30' },
  { id: 3, name: 'Follow-up — Pulse', when: 'Sex, 16:00' },
  { id: 4, name: 'Qualificação — NovaRota', when: 'Seg, 11:00' },
]

export default function BdrAgendamentosPage() {
  return (
    <section className="bdr-section">
      <article className="bdr-section__card">
        <h2>Agendamentos Realizados</h2>
        <p>Reuniões e retornos gerados pelo discador.</p>
        <ul className="bdr-section__list">
          {MEETINGS.map((item) => (
            <li key={item.id}>
              <strong>{item.name}</strong>
              <span>{item.when}</span>
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
