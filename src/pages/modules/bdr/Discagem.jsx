import { Link } from 'react-router-dom'
import '../Bdr.css'

export default function BdrDiscagemPage() {
  return (
    <section className="bdr-section">
      <article className="bdr-section__card">
        <h2>Discagem Automática</h2>
        <p>
          Inicie a fila de discagem da campanha selecionada. O operador permanece dentro do módulo
          IMP — sem redirecionar para domínio externo.
        </p>
        <button type="button" className="bdr-section__cta">
          Iniciar discagem
        </button>
      </article>
      <Link to="/modules/bdr" className="bdr-page__back">
        ← Voltar ao painel do discador
      </Link>
    </section>
  )
}
