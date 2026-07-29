import { Link } from 'react-router-dom'
import '../Bdr.css'

export default function BdrManualPage() {
  return (
    <section className="bdr-section">
      <article className="bdr-section__card">
        <h2>Ligação Manual</h2>
        <p>Disque um número manualmente e registre o resultado do contato nesta sessão.</p>
        <button type="button" className="bdr-section__cta">
          Abrir discagem manual
        </button>
      </article>
      <Link to="/modules/bdr" className="bdr-page__back">
        ← Voltar ao painel do discador
      </Link>
    </section>
  )
}
