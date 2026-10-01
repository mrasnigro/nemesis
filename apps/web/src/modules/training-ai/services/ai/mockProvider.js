/**
 * Mock AI provider — rule/script based persona replies.
 * No external API, TTS, or voice.
 */

import { assertAiProvider } from './provider.js'

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function pick(list, index) {
  if (!list?.length) return null
  return list[index % list.length]
}

/**
 * Progressive mock replies driven by persona + scenario script turns.
 * Exchange index = number of completed user turns (0-based after user sends).
 *
 * Kept as a named export so existing smokes/docs can reference the algorithm.
 */
export function generateMockReply({
  persona,
  scenario,
  scriptTurns = [],
  exchangeIndex = 0,
  userText = '',
}) {
  const objections = persona?.objections || []
  const priorities = persona?.priorities || []
  const industry = persona?.industry || scenario?.segment || scenario?.industry || 'seu mercado'
  const user = normalize(userText)

  const askedAgenda =
    /\b(12|quinze|15|agenda|reuniao|discovery|proximo passo|marcar|agendar)\b/.test(user)
  const askedPermission = /\b(segundos|minuto|momento|posso|permita|bom momento)\b/.test(user)
  const mentionedValue =
    /\b(valor|custo|econom|impacto|roi|eficiencia|pipeline|conversao)\b/.test(user)
  const mentionedPilot = /\b(piloto|prova|teste|trial|playbook)\b/.test(user)

  const scripted = scriptTurns[exchangeIndex + 1]?.ai
  if (scripted && exchangeIndex < 2) {
    return scripted
  }

  if (exchangeIndex === 0) {
    if (askedPermission) {
      return 'Pode falar, mas seja breve — estou no meio de uma reunião.'
    }
    return pick(
      [
        `Ok… e por que isso importa para ${industry} agora?`,
        `Entendi. Em ${persona?.company || 'nossa operação'} o tempo é curto — qual o ponto?`,
        'Continuo ouvindo, mas preciso entender o ganho concreto.',
      ],
      exchangeIndex,
    )
  }

  if (exchangeIndex === 1) {
    const objection =
      pick(objections, 0) ||
      'Já temos um fornecedor e o orçamento está fechado.'
    if (askedAgenda) {
      return `Agenda eu até considero, mas primeiro: ${objection}`
    }
    return `${objection} Como vocês se diferenciam sem parecer pitch genérico?`
  }

  if (exchangeIndex === 2) {
    if (mentionedValue || mentionedPilot) {
      return `Hmm. Se houver um piloto enxuto e métricas claras, posso envolver meu time. Quem mais precisaria participar?`
    }
    const priority = pick(priorities, 0)
    return priority
      ? `O que mais pesa aqui é: ${priority}. Sem isso, fica difícil avançar.`
      : `Ainda não vi como isso muda nossa rotina comercial. Tem um exemplo do segmento?`
  }

  if (exchangeIndex >= 3) {
    if (askedAgenda || mentionedPilot) {
      return `Certo. Se quiser, podemos fechar um próximo passo curto — me diga o objetivo e o tempo. Caso contrário, encerre o treino quando estiver pronto.`
    }
    return `Estou com menos margem nesta conversa. Resume o próximo passo ou podemos encerrar por aqui.`
  }

  return `Pode continuar — o que você propõe como próximo passo?`
}

/**
 * @returns {import('./provider.js').AiProvider}
 */
export function createMockAiProvider() {
  const provider = {
    id: 'mock',
    label: 'Mock (regras / scripts)',
    generatePersonaReply(request = {}) {
      const text = generateMockReply({
        persona: request.persona,
        scenario: request.scenario,
        scriptTurns: request.scriptTurns || [],
        exchangeIndex: request.exchangeIndex || 0,
        userText: request.userText || '',
      })

      return {
        text,
        provider: 'mock',
        finishReason: 'stop',
        meta: {
          exchangeIndex: request.exchangeIndex || 0,
          usedScriptTurn: Boolean(
            request.scriptTurns?.[(request.exchangeIndex || 0) + 1]?.ai &&
              (request.exchangeIndex || 0) < 2,
          ),
        },
      }
    },
  }

  assertAiProvider(provider)
  return provider
}
