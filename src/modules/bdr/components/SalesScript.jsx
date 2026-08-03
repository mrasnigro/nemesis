import {
  EQUIPE_OPTIONS,
  FATURAMENTO_OPTIONS,
  PRIORITY_OPTIONS,
} from '../data/scriptContent.js'
import { SCRIPT_PAIN_DETAILS } from '../data/scriptPainDetails.js'
import { useBdrSession } from '../hooks/useBdrSession.js'
import { IconClock } from './DialerIcons.jsx'

function Resposta() {
  return <span className="bdr-script__resposta">[RESPOSTA]</span>
}

function Tag({ children }) {
  return <span className="bdr-script__tag">{children}</span>
}

function Card({ title, titleMb = 'default', children }) {
  return (
    <article className="bdr-script__card">
      <h3 className={`bdr-script__card-title${titleMb === 'sm' ? ' bdr-script__card-title--sm' : ''}`}>
        {title}
      </h3>
      {children}
    </article>
  )
}

/**
 * Script de Abordagem — sample SDRDialer card stack (space-y-10 / p-8 cards).
 */
export default function SalesScript({ onRequestSchedule }) {
  const {
    call,
    diagnosis,
    scriptProgress,
    answerScriptRadio,
    togglePain,
    markScriptCompleted,
    scriptCompleted,
  } = useBdrSession()

  const answered = scriptProgress.answered || {}
  const pains = diagnosis.pains || {}
  const decisao = answered.decisao || diagnosis.partnerPresence || ''

  return (
    <div className="bdr-script">
      <Card title="ABERTURA">
        <div className="bdr-script__stack bdr-script__stack--tight">
          <p>
            Bom dia, <Tag>[CLIENTE]</Tag>, aqui é o <Tag>[SDR]</Tag>, do IMP.
          </p>
          <p>Prometo ser breve.</p>
          <p>
            Sei que quem toca uma empresa normalmente vive com a agenda cheia e sendo
            interrompido o tempo todo.
          </p>
          <p>Posso tomar 2 minutos do seu tempo?</p>
        </div>
        <div className="bdr-script__resposta-wrap">
          <Resposta />
        </div>
      </Card>

      <Card title="INTRODUÇÃO DAS DORES">
        <div className="bdr-script__stack">
          <p>Perfeito.</p>
          <p>
            Com frequência falamos com empresários que vivem três situações bem comuns no
            dia a dia:
          </p>
          <ul className="bdr-script__bullets">
            <li>
              <span className="bdr-script__dash" aria-hidden="true">
                -
              </span>
              <span>o lucro não acompanha o crescimento;</span>
            </li>
            <li>
              <span className="bdr-script__dash" aria-hidden="true">
                -
              </span>
              <span>as vendas oscilam e fica difícil ter previsibilidade;</span>
            </li>
            <li>
              <span className="bdr-script__dash" aria-hidden="true">
                -
              </span>
              <span>
                ou o empresário passa mais tempo resolvendo problemas do que pensando no
                crescimento, e a empresa acaba ficando dependente dele para funcionar.
              </span>
            </li>
          </ul>
          <p className="bdr-script__emphasis">
            Olhando para a sua empresa hoje... qual dessas situações mais se parece com a
            sua realidade?
          </p>
        </div>
        <div className="bdr-script__resposta-wrap">
          <Resposta />
        </div>
      </Card>

      <Card title="VER DORES DOS EMPRESÁRIOS" titleMb="sm">
        <p className="bdr-script__hint-italic">
          Clique na seta para abrir a explicação correspondente.
        </p>
        <div className="bdr-script__pains">
          {SCRIPT_PAIN_DETAILS.map((pain) => (
            <details key={pain.id} className="bdr-script__pain">
              <summary className="bdr-script__pain-summary">
                <div className="bdr-script__pain-copy">
                  <span className="bdr-script__pain-title" style={{ color: pain.color }}>
                    <input
                      type="checkbox"
                      className="bdr-script__inline-check"
                      checked={Boolean(pains[pain.id])}
                      onChange={() => togglePain(pain.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    {pain.title}
                  </span>
                  <span className="bdr-script__pain-sub">{pain.subtitle}</span>
                </div>
                <span className="bdr-script__pain-chevron" aria-hidden="true">
                  ▼
                </span>
              </summary>
              <div className="bdr-script__pain-body">
                <p className="bdr-script__pain-prompt">{pain.prompt}</p>
                <div className="bdr-script__resposta-wrap">
                  <Resposta />
                </div>
                {pain.followUps?.length ? (
                  <div className="bdr-script__pain-follow">
                    {pain.followUps.map((line) => (
                      <p key={line.slice(0, 48)}>{line}</p>
                    ))}
                  </div>
                ) : null}
                {pain.note ? <p className="bdr-script__pain-note">{pain.note}</p> : null}
              </div>
            </details>
          ))}
        </div>
      </Card>

      <Card title="PRIORIZAÇÃO / IMPACTO DA DOR">
        <p className="bdr-script__lead">
          Se você conseguisse resolver esse problema definitivamente, o que mudaria na
          empresa e, principalmente, na sua rotina?
        </p>
        <div className="bdr-script__resposta-wrap">
          <Resposta />
        </div>
      </Card>

      <Card title="CONTEXTO DECISÓRIO">
        <div className="bdr-script__stack bdr-script__stack--loose">
          <p>
            Certo. Pelo que você me contou, isso já deixou de ser apenas um problema e
            passou a limitar o crescimento da empresa. Faz sentido dizer que resolver isso
            já se tornou uma prioridade para vocês?
          </p>
          <div className="bdr-script__priority">
            {PRIORITY_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`bdr-script__priority-opt bdr-script__priority-opt--${opt.accent}`}
              >
                <input
                  type="radio"
                  name="priority"
                  value={opt.value}
                  checked={(answered.priority || diagnosis.priority || '') === opt.value}
                  onChange={() => answerScriptRadio('priority', opt.value)}
                />
                {opt.label}
              </label>
            ))}
          </div>
          <div className="bdr-script__resposta-wrap">
            <Resposta />
          </div>
          <div className="bdr-script__decisao-intro">
            <p>
              Só para eu entender melhor a dinâmica da empresa: quando surge uma decisão
              estratégica ou um investimento importante, quem normalmente participa dessa
              decisão?
            </p>
            <p className="bdr-script__muted">
              Faço essa pergunta porque a forma como as decisões são tomadas costuma
              revelar onde estão os gargalos da empresa e como ela está preparada para
              crescer.
            </p>
          </div>
          <div className="bdr-script__decisao-grid">
            <label
              className={`bdr-script__decisao-card${decisao === 'nao' ? ' is-selected' : ''}`}
            >
              <p className="bdr-script__decisao-title">
                <input
                  type="radio"
                  name="decisao"
                  value="nao"
                  checked={decisao === 'nao'}
                  onChange={() => answerScriptRadio('decisao', 'nao')}
                />{' '}
                [Se decide sozinho]
              </p>
              <p className="bdr-script__lead">
                Entendi <Tag>[CLIENTE]</Tag>.
              </p>
              <p className="bdr-script__muted">
                Isso explica por que tanta coisa acaba ficando concentrada em você. Com o
                crescimento da empresa, essa responsabilidade costuma pesar bastante.
              </p>
            </label>
            <label
              className={`bdr-script__decisao-card${decisao === 'sim' ? ' is-selected' : ''}`}
            >
              <p className="bdr-script__decisao-title">
                <input
                  type="radio"
                  name="decisao"
                  value="sim"
                  checked={decisao === 'sim'}
                  onChange={() => answerScriptRadio('decisao', 'sim')}
                />{' '}
                [Se a decisão é compartilhada]
              </p>
              <p className="bdr-script__lead">
                Perfeito <Tag>[CLIENTE]</Tag>.
              </p>
              <p className="bdr-script__muted">
                É importante que vocês dois tenham a mesma visão sobre os desafios da
                empresa, porque normalmente as decisões estratégicas são tomadas em
                conjunto.
              </p>
            </label>
          </div>
        </div>
      </Card>

      <Card title="PERGUNTAS DE QUALIFICAÇÃO">
        <div className="bdr-script__stack bdr-script__stack--loose">
          <p>
            Mas... só para eu entender melhor o contexto da empresa... deixa eu te fazer
            duas perguntas rápidas.
          </p>
          <div>
            <p className="bdr-script__lead">Em qual faixa de faturamento vocês estão hoje:</p>
            <ul className="bdr-script__radio-list">
              {FATURAMENTO_OPTIONS.map((opt) => (
                <li key={opt.value}>
                  <label>
                    <input
                      type="radio"
                      name="faturamento"
                      value={opt.value}
                      checked={
                        (answered.faturamento || diagnosis.monthlyRevenue || '') ===
                        opt.value
                      }
                      onChange={() => answerScriptRadio('faturamento', opt.value)}
                    />
                    {opt.label}
                  </label>
                </li>
              ))}
            </ul>
          </div>
          <div className="bdr-script__resposta-wrap">
            <Resposta />
          </div>
          <div>
            <p className="bdr-script__lead">
              Perfeito. E hoje a equipe tem quantas pessoas?
            </p>
            <div className="bdr-script__equipe">
              {EQUIPE_OPTIONS.map((opt) => (
                <label key={opt.value}>
                  <input
                    type="radio"
                    name="equipe"
                    value={opt.value}
                    checked={(answered.equipe || diagnosis.employees || '') === opt.value}
                    onChange={() => answerScriptRadio('equipe', opt.value)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
          <div className="bdr-script__resposta-wrap">
            <Resposta />
          </div>
        </div>
      </Card>

      <Card title="TRANSIÇÃO PARA OFERTA">
        <p className="bdr-script__body">
          Excelente. Pelo que você me contou, acredito que faça sentido uma conversa com um
          dos nossos especialistas.
        </p>
      </Card>

      <Card title="POSICIONAMENTO DO IMP">
        <div className="bdr-script__stack">
          <p>
            Só para contextualizar rapidamente o que nós oferecemos não é um software, nem
            um curso para você assistir sozinho. Também não é uma consultoria que entrega um
            relatório e vai embora.
          </p>
          <p className="bdr-script__lead">
            Nós implementamos uma metodologia de crescimento empresarial personalizada para
            pequenas e médias empresas.
          </p>
          <p>Na prática, nós trabalhamos lado a lado com a empresa na implementação.</p>
          <p>
            Um especialista acompanha a empresa durante todo o processo para garantir que as
            mudanças realmente aconteçam.
          </p>
        </div>
      </Card>

      <Card title="CONVITE PARA REUNIÃO">
        <div className="bdr-script__stack">
          <p>
            Em uma conversa de aproximadamente 30 minutos, nosso especialista mapeia o
            principal gargalo e mostra 2–3 ações práticas que podem ajudar a melhorar lucro
            e organização. Sem compromisso.
          </p>
          <p className="bdr-script__lead">Faz sentido agendarmos essa conversa?</p>
        </div>
        <div className="bdr-script__resposta-wrap">
          <Resposta />
        </div>
      </Card>

      <Card title="DISPONIBILIDADE">
        <p className="bdr-script__lead">
          Você costuma ter mais disponibilidade pela manhã ou à tarde?
        </p>
        <div className="bdr-script__resposta-wrap">
          <Resposta />
        </div>
      </Card>

      <Card title="SUGESTÃO DE AGENDA">
        <div className="bdr-script__stack">
          <p>
            Perfeito <Tag>[CLIENTE]</Tag>,
          </p>
          <p>No periodo da [... manhã ou tarde...] tenho opções na:</p>
          <ul className="bdr-script__slots">
            <li>[... segunda, terça, quarta...] às [HORA:MIN]</li>
            <li>ou [... segunda, terça, quarta...] às [HORA:MIN]</li>
          </ul>
        </div>
        <div className="bdr-script__resposta-wrap">
          <Resposta />
        </div>
        <div className="bdr-script__schedule-wrap">
          <button
            type="button"
            className="bdr-script__schedule-btn"
            disabled={call.status !== 'connected'}
            onClick={() => {
              markScriptCompleted()
              onRequestSchedule?.()
            }}
          >
            <IconClock className="bdr-discagem__cta-icon" />
            Agendar Reunião
          </button>
        </div>
        {decisao === 'sim' ? (
          <div className="bdr-script__partner-note">
            <p className="bdr-script__decisao-title">
              [Se ele já respondeu que tem um decisor junto]
            </p>
            <p>
              Ótimo. Você comentou que possui outra pessoa que também toma as decisões
              junto com você. Então faz bastante sentido que essa pessoa participe também.
              Assim, vocês conseguem ouvir o diagnóstico juntos, tirar dúvidas na hora e
              avaliar tudo com a mesma visão. Pode ser?.
            </p>
          </div>
        ) : null}
      </Card>

      <Card title="CONFIRMAÇÃO FINAL">
        <div className="bdr-script__stack">
          <p className="bdr-script__confirm-q">
            Qual é o melhor e-mail para eu enviar o convite?
          </p>
          <div className="bdr-script__resposta-wrap">
            <Resposta />
          </div>
          <div className="bdr-script__confirm-close">
            <p>
              Perfeito <Tag>[CLIENTE]</Tag>.
            </p>
            <p>Vou encaminhar o convite com todas as informações por email.</p>
            <p>
              Ficou combinado então para a <Tag>[...segunda, terça, quarta...]</Tag> às{' '}
              <Tag>[HORA:MIN]</Tag>.
            </p>
            <p>
              Muito obrigado pelo seu tempo e tenho certeza de que essa conversa vai trazer
              uma visão bem clara das oportunidades da empresa.
            </p>
            <p>Tenha um excelente dia.</p>
          </div>
          {scriptCompleted ? (
            <p className="bdr-script__ok">Script concluído — prossiga para diagnóstico / finalização.</p>
          ) : null}
        </div>
      </Card>
    </div>
  )
}
