import {
  DECISAO_OPTIONS,
  EQUIPE_OPTIONS,
  FATURAMENTO_OPTIONS,
  PRIORITY_OPTIONS,
  SCRIPT_SECTIONS,
  substituteScriptPlaceholders,
} from '../data/scriptContent.js'
import { useBdrSession } from '../hooks/useBdrSession.js'
import PainPointSelector from './PainPointSelector.jsx'

function Marker({ children, tone = 'red' }) {
  return <span className={`bdr-script__chip bdr-script__chip--${tone}`}>{children}</span>
}

function RadioGroup({ name, options, value, onChange }) {
  return (
    <div className="bdr-script__radios" role="radiogroup" aria-label={name}>
      {options.map((opt) => (
        <label key={opt.value} className={`bdr-script__radio${value === opt.value ? ' is-selected' : ''}`}>
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(name, opt.value)}
          />
          <span>{opt.label}</span>
        </label>
      ))}
    </div>
  )
}

/**
 * Full Script de Abordagem — progression + conditional branches + diagnosis sync.
 */
export default function SalesScript({ onRequestSchedule }) {
  const {
    call,
    diagnosis,
    scriptProgress,
    answerScriptRadio,
    setScriptSection,
    markScriptCompleted,
    scriptCompleted,
    selectedCampaign,
  } = useBdrSession()

  const lead = call.currentLead
  const answered = scriptProgress.answered || {}
  const placeholders = {
    agentName: 'Consultor IMP',
    companyName: 'IMP',
    prospectName: lead?.company || lead?.name || '[CLIENTE]',
    productName: selectedCampaign?.name
      ? `solução vinculada à campanha ${selectedCampaign.name}`
      : 'metodologia IMP de crescimento',
  }
  const t = (text) => substituteScriptPlaceholders(text, placeholders)

  const sectionIdx = SCRIPT_SECTIONS.indexOf(scriptProgress.section || 'abertura')

  return (
    <div className="bdr-script">
      <nav className="bdr-script__progress" aria-label="Progresso do script">
        {SCRIPT_SECTIONS.map((id, idx) => (
          <button
            key={id}
            type="button"
            className={`bdr-script__step${idx === sectionIdx ? ' is-current' : ''}${
              idx < sectionIdx ? ' is-done' : ''
            }`}
            onClick={() => setScriptSection(id)}
          >
            {idx + 1}
          </button>
        ))}
      </nav>

      <section className="bdr-script__section" data-section="abertura">
        <h3>ABERTURA</h3>
        <p>{t('Olá, tudo bem? Meu nome é [AGENTE] e estou ligando da [EMPRESA].')}</p>
        <p>
          {t(
            'A razão da minha ligação é que identificamos que a [EMPRESA_PROSPECT] pode se beneficiar muito com a nossa solução de [PRODUTO/SERVIÇO].',
          )}
        </p>
        <p>Você teria 2 minutos para conversar sobre isso?</p>
        <p>
          <Marker>[AGUARDAR RESPOSTA]</Marker>
        </p>
        <RadioGroup
          name="abertura"
          options={[
            { value: 'sim', label: 'SIM — Ótimo! Então…' },
            { value: 'nao', label: 'NÃO — Sem problema, quando seria um melhor momento?' },
          ]}
          value={answered.abertura || ''}
          onChange={answerScriptRadio}
        />
        {answered.abertura === 'nao' ? (
          <p className="bdr-script__callout">
            Encaminhe para agendamento de retorno ou registre disposição{' '}
            <strong>Agendamento / Retorno</strong>.
          </p>
        ) : null}
      </section>

      <section className="bdr-script__section" data-section="dores_intro">
        <h3>Descoberta de dor</h3>
        <p>
          {t(
            '[BDR]: [CLIENTE], a maioria dos empresários com quem falamos está em uma destas situações…',
          )}
        </p>
        <ul className="bdr-script__list">
          <li>O dinheiro entra, mas não sobra (Lucro)</li>
          <li>As vendas caíram / dependo de indicação (Vendas)</li>
          <li>A equipe depende de mim para tudo (Liderança / Gestão)</li>
        </ul>
        <p>
          <Marker>[RESPOSTA]</Marker>
        </p>
      </section>

      <section className="bdr-script__section" data-section="dores">
        <h3>VER DORES DOS EMPRESÁRIOS</h3>
        <p className="bdr-script__hint">
          Marque as dores mencionadas — sincroniza com Anotações de Diagnóstico.
        </p>
        <PainPointSelector title={null} />
      </section>

      <section className="bdr-script__section" data-section="priorizacao">
        <h3>Priorização / impacto</h3>
        <p>Dessas dores, qual tem mais impacto no resultado da empresa neste momento?</p>
        <RadioGroup
          name="priority"
          options={PRIORITY_OPTIONS}
          value={answered.priority || diagnosis.priority || ''}
          onChange={answerScriptRadio}
        />
      </section>

      <section className="bdr-script__section" data-section="contexto_decisorio">
        <h3>CONTEXTO DECISÓRIO</h3>
        <p>
          Nas decisões estratégicas da empresa — investimentos, mudanças de processo — quem
          participa além de você?
        </p>
        <RadioGroup
          name="decisao"
          options={DECISAO_OPTIONS}
          value={answered.decisao || diagnosis.partnerPresence || ''}
          onChange={answerScriptRadio}
        />

        {(answered.decisao || diagnosis.partnerPresence) === 'nao' ? (
          <div className="bdr-script__branch">
            <strong>[Se decide sozinho]</strong>
            <p>
              {t(
                'Perfeito, [CLIENTE]. Então na reunião diagnóstica vamos olhar os números e o plano com você no comando da decisão.',
              )}
            </p>
            <p className="bdr-script__callout">
              Soft rule: confirme se não há outro sócio oculto antes de fechar compromisso.
            </p>
          </div>
        ) : null}

        {(answered.decisao || diagnosis.partnerPresence) === 'sim' ? (
          <div className="bdr-script__branch">
            <strong>[Se a decisão é compartilhada]</strong>
            <p>
              {t(
                'Ótimo, [CLIENTE]. Vamos incluir o(s) sócio(s) no convite da reunião diagnóstica para alinharem juntos.',
              )}
            </p>
          </div>
        ) : null}
      </section>

      <section className="bdr-script__section" data-section="qualificacao">
        <h3>PERGUNTAS DE QUALIFICAÇÃO</h3>
        <p className="bdr-script__hint">Respostas sincronizam porte, faturamento e equipe no diagnóstico.</p>

        <h4>Faixa de faturamento mensal</h4>
        <RadioGroup
          name="faturamento"
          options={FATURAMENTO_OPTIONS}
          value={answered.faturamento || diagnosis.monthlyRevenue || ''}
          onChange={answerScriptRadio}
        />

        <h4>Tamanho da equipe</h4>
        <RadioGroup
          name="equipe"
          options={EQUIPE_OPTIONS}
          value={answered.equipe || diagnosis.employees || ''}
          onChange={answerScriptRadio}
        />
      </section>

      <section className="bdr-script__section" data-section="transicao">
        <h3>Transição / posicionamento</h3>
        <p>
          {t(
            '[BDR]: Com base no que você me contou, o próximo passo natural é um diagnóstico rápido para entender se a metodologia faz sentido para a [EMPRESA_PROSPECT].',
          )}
        </p>
        <p>
          <Marker tone="cyan">[POSICIONAMENTO]</Marker> Não é proposta comercial nesta ligação —
          é clareza do problema e do caminho.
        </p>
      </section>

      <section className="bdr-script__section" data-section="convite">
        <h3>Convite / disponibilidade</h3>
        <p>
          {t(
            'Você teria 20 minutos esta semana ou na próxima para essa reunião diagnóstica comigo e, se fizer sentido, com o especialista?',
          )}
        </p>
        <p>
          <Marker>[RESPOSTA]</Marker>
        </p>
      </section>

      <section className="bdr-script__section" data-section="agenda">
        <h3>Sugestão de agenda</h3>
        <p>
          {t(
            'Posso te enviar o convite por e-mail com data e horário. Qual o melhor encaixe na agenda de [CLIENTE]?',
          )}
        </p>
        <button
          type="button"
          className="bdr-discagem__schedule"
          disabled={call.status !== 'connected'}
          title={
            call.status !== 'connected'
              ? 'Aguarde a conexão da chamada'
              : scriptCompleted
                ? 'Abrir agendamento'
                : 'Complete o script para facilitar o handoff (agendar já liberado em chamada conectada)'
          }
          onClick={onRequestSchedule}
        >
          Agendar Reunião
        </button>
      </section>

      <section className="bdr-script__section" data-section="confirmacao">
        <h3>CONFIRMAÇÃO FINAL</h3>
        <p>
          {t(
            'Perfeito, [CLIENTE]. Vou te mandar o convite para [HORA:MIN] — confirma o e-mail principal para o invite?',
          )}
        </p>
        <p>
          E-mail sugerido:{' '}
          <Marker tone="cyan">{lead?.email || 'confirmar com o lead'}</Marker>
        </p>
        <p>
          <Marker>[RESPOSTA]</Marker>
        </p>
        {!scriptCompleted ? (
          <button type="button" className="bdr-script__complete-btn" onClick={markScriptCompleted}>
            Marcar script como concluído
          </button>
        ) : (
          <p className="bdr-script__ok">Script concluído — prossiga para diagnóstico / finalização.</p>
        )}
      </section>
    </div>
  )
}
