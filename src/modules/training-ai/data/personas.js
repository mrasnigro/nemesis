/**
 * Training personas (mock) — identity + light behavior hints.
 * No avatars / TTS in this phase.
 */

export const personas = [
  {
    id: 'per_marina',
    name: 'Marina Costa',
    role: 'Diretora Comercial',
    company: 'Nexo Logística',
    location: 'São Paulo, SP',
    negotiatorType: 'Cliente Analítico',
    mood: 'Cética, objetiva',
    openingLine: 'Alô? Marina falando. Quem é e por que está ligando?',
    objections: ['Recebo muitas ligações', 'Não tenho tempo agora'],
    priorities: ['Previsibilidade de agenda', 'Reuniões com decisores'],
  },
  {
    id: 'per_rafael',
    name: 'Rafael Souza',
    role: 'Head de Operações',
    company: 'Atlas Retail',
    location: 'Curitiba, PR',
    negotiatorType: 'Cliente Dominante',
    mood: 'Pressão por custo',
    openingLine: 'Olha, já tenho um fornecedor 30% mais barato. Por que eu mudaria?',
    objections: ['Concorrente mais barato', 'Sem orçamento este trimestre'],
    priorities: ['Reduzir custo oculto', 'Piloto sem lock-in'],
  },
  {
    id: 'per_helena',
    name: 'Helena Prado',
    role: 'Gerente de Expansão',
    company: 'Forge Industrial',
    location: 'Belo Horizonte, MG',
    negotiatorType: 'Cliente Analítico',
    mood: 'Analítica, detalhista',
    openingLine: 'Antes de qualquer pitch: o que você precisa entender do nosso processo?',
    objections: ['Não quero processo engessado', 'Já tentamos ferramentas genéricas'],
    priorities: ['Diagnóstico antes de pitch', 'Gates leves de qualificação'],
  },
]

export function getPersona(personaId) {
  return personas.find((item) => item.id === personaId) || null
}
