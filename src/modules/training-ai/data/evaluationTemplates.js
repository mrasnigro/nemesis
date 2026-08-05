/**
 * Evaluation rubrics for Training IA (mock).
 * Weights across all criteria in a template must sum to 100.
 */

export const evaluationTemplates = [
  {
    id: 'tpl_cold_call',
    title: 'Contato Telefônico - Frio',
    contactType: 'cold_call',
    sections: [
      {
        id: 'sec_abertura',
        name: 'Abertura',
        criteria: [
          {
            id: 'crit_saudacao',
            name: 'Saudação e apresentação',
            weight: 15,
            yesNoQuestion: 'O vendedor cumprimentou e se apresentou com clareza?',
          },
          {
            id: 'crit_permissao',
            name: 'Pedido de permissão',
            weight: 10,
            yesNoQuestion: 'Pediu um momento curto antes de avançar o pitch?',
          },
        ],
      },
      {
        id: 'sec_valor',
        name: 'Proposta de valor',
        criteria: [
          {
            id: 'crit_insight',
            name: 'Insight do segmento',
            weight: 15,
            yesNoQuestion: 'Trouxe um insight relevante para o segmento do lead?',
          },
          {
            id: 'crit_agenda',
            name: 'Agenda clara',
            weight: 15,
            yesNoQuestion: 'Propôs um próximo passo com tempo e objetivo explícitos?',
          },
        ],
      },
      {
        id: 'sec_qualificacao',
        name: 'Qualificação',
        criteria: [
          {
            id: 'crit_beneficio',
            name: 'Benefício concreto',
            weight: 20,
            yesNoQuestion: 'Explicou o que o lead ganha na conversa (não só o produto)?',
          },
          {
            id: 'crit_decisor',
            name: 'Confirmação de decisores',
            weight: 10,
            yesNoQuestion: 'Validou ou abriu caminho para envolvimento de decisores?',
          },
        ],
      },
      {
        id: 'sec_fecho',
        name: 'Próximo passo',
        criteria: [
          {
            id: 'crit_next',
            name: 'Fechamento do próximo passo',
            weight: 15,
            yesNoQuestion: 'Convidou para um próximo marco agendável?',
          },
        ],
      },
    ],
  },
  {
    id: 'tpl_objection',
    title: 'Tratamento de Objeção - Preço',
    contactType: 'objection',
    sections: [
      {
        id: 'sec_reconhecimento',
        name: 'Reconhecimento',
        criteria: [
          {
            id: 'crit_empatia',
            name: 'Empatia com a pressão de custo',
            weight: 15,
            yesNoQuestion: 'Reconheceu a preocupação de custo sem atacar o concorrente?',
          },
        ],
      },
      {
        id: 'sec_reposicao',
        name: 'Reposição de valor',
        criteria: [
          {
            id: 'crit_custo_oculto',
            name: 'Custo oculto / oportunidade',
            weight: 20,
            yesNoQuestion: 'Separou preço de custo de oportunidade com argumento claro?',
          },
          {
            id: 'crit_numero',
            name: 'Evidência numérica',
            weight: 20,
            yesNoQuestion: 'Trouxe um número concreto e crível?',
          },
        ],
      },
      {
        id: 'sec_avanco',
        name: 'Avanço comercial',
        criteria: [
          {
            id: 'crit_piloto',
            name: 'Prova controlada',
            weight: 25,
            yesNoQuestion: 'Propôs um próximo passo sem exigir compra imediata?',
          },
          {
            id: 'crit_sem_desconto',
            name: 'Evitar desconto precoce',
            weight: 20,
            yesNoQuestion: 'Evitou cair em desconto imediato como resposta principal?',
          },
        ],
      },
    ],
  },
  {
    id: 'tpl_discovery',
    title: 'Diagnóstico / Discovery',
    contactType: 'discovery',
    sections: [
      {
        id: 'sec_diagnostico',
        name: 'Diagnóstico',
        criteria: [
          {
            id: 'crit_processo',
            name: 'Exploração do processo atual',
            weight: 20,
            yesNoQuestion: 'Perguntou como o processo funciona hoje antes de oferecer solução?',
          },
          {
            id: 'crit_gargalo',
            name: 'Identificação do gargalo',
            weight: 20,
            yesNoQuestion: 'Aprofundou a dor/gargalo mencionado pelo lead?',
          },
        ],
      },
      {
        id: 'sec_stakeholders',
        name: 'Stakeholders',
        criteria: [
          {
            id: 'crit_cadencia',
            name: 'Cadência e ownership',
            weight: 20,
            yesNoQuestion: 'Clarificou quem define cadência/metas no processo?',
          },
        ],
      },
      {
        id: 'sec_termometro',
        name: 'Termômetro e fecho',
        criteria: [
          {
            id: 'crit_playbook',
            name: 'Playbook / próximo marco',
            weight: 25,
            yesNoQuestion: 'Propôs um playbook leve ou marco com data?',
          },
          {
            id: 'crit_sem_pitch',
            name: 'Evitar pitch prematuro',
            weight: 15,
            yesNoQuestion: 'Evitou empurrar features antes de validar o contexto?',
          },
        ],
      },
    ],
  },
]

export function getEvaluationTemplate(templateId) {
  return evaluationTemplates.find((item) => item.id === templateId) || null
}

export function flattenCriteria(template) {
  if (!template) return []
  return template.sections.flatMap((section) =>
    section.criteria.map((criterion) => ({
      ...criterion,
      sectionId: section.id,
      sectionName: section.name,
    })),
  )
}

export function assertTemplateWeights(template) {
  const total = flattenCriteria(template).reduce((sum, c) => sum + c.weight, 0)
  return total === 100
}
