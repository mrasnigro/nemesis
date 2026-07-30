/**
 * Questionamentos Padrão — 7 categories, live counts (functional §5.5).
 * Reference content / suggested answers — not a hard branching engine.
 */

export const OBJECTION_LIBRARY = [
  {
    id: 'produto',
    title: 'Sobre o produto',
    entries: [
      {
        id: 'p1',
        question: 'O que vocês vendem exatamente?',
        answer:
          'Trabalhamos com uma metodologia prática de gestão e crescimento para empresas que já faturam e querem estruturar lucro, vendas e liderança — não é só um curso teórico.',
        gancho: 'O que você imagina que faltaria na sua operação hoje: método, gente ou execução?',
      },
      {
        id: 'p2',
        question: 'Ainda não entendi o que é.',
        answer:
          'Em uma frase: ajudamos o dono a sair do operacional e construir um sistema de lucro previsível, com diagnóstico e plano de ação.',
        gancho: 'Se eu resumir em 60 segundos o que fazemos, você me diz se faz sentido continuar?',
      },
      {
        id: 'p3',
        question: 'Como funciona na prática?',
        answer:
          'Começamos com um diagnóstico gratuito/estruturado, mapeamos gargalos e, se fizer sentido, desenhamos o acompanhamento com metas claras.',
        gancho: 'Qual área dói mais agora: lucro, vendas, gestão ou liderança?',
      },
      {
        id: 'p4',
        question: 'Quanto tempo dura?',
        answer:
          'O diagnóstico é curto; o acompanhamento depende do estágio da empresa. O importante é o resultado do ciclo, não o “pacote eterno”.',
        gancho: 'Você está buscando algo pontual ou uma transformação de 6–12 meses?',
      },
      {
        id: 'p5',
        question: 'É curso, software ou mentoria?',
        answer:
          'É metodologia com aplicação assistida — conteúdo + rotina + acompanhamento. Não é só vídeo gravado nem só planilha.',
        gancho: 'Você já tentou curso sozinho e não conseguiu aplicar?',
      },
    ],
  },
  {
    id: 'comparacao',
    title: 'Comparação com outros produtos',
    entries: [
      {
        id: 'c1',
        question: 'Qual o diferencial da metodologia?',
        answer:
          'Foco em lucro e previsibilidade com o dono no centro da decisão — não só “aumentar venda” sem estruturar gestão.',
        gancho: 'O que já tentaram com consultoria/curso e não resolveu?',
      },
      {
        id: 'c2',
        question: 'Como se compara a uma consultoria comum?',
        answer:
          'Consultoria tradicional muitas vezes entrega relatório. Aqui o valor é execução semanal e métricas que o dono acompanha.',
        gancho: 'Vocês já tiveram consultor que só entregou diagnóstico e sumiu?',
      },
    ],
  },
  {
    id: 'empresa',
    title: 'Sobre a empresa',
    entries: [
      {
        id: 'e1',
        question: 'O que é o IMP?',
        answer:
          'O IMP é a plataforma/metodologia que estrutura o crescimento de empresas com processos, liderança e lucro sob controle.',
        gancho: 'Você conhece alguém que já passou por um programa parecido?',
      },
      {
        id: 'e2',
        question: 'Há quanto tempo existem / qual o know-how?',
        answer:
          'Temos cases e rotina consolidada em empresas de diferentes portes — o método é testado no campo, não só em teoria.',
        gancho: 'Quer que eu cite um tipo de empresa parecida com a sua?',
      },
      {
        id: 'e3',
        question: 'Têm cases?',
        answer:
          'Sim — empresas que saíram da dependência do dono, organizaram vendas e recuperaram margem. Posso trazer exemplos na reunião diagnóstica.',
        gancho: 'Qual case seria mais relevante: lucro, vendas ou gestão?',
      },
      {
        id: 'e4',
        question: 'Quem são os clientes?',
        answer:
          'Empresários que já faturam e sentem que o crescimento travou por gestão, equipe ou falta de método.',
        gancho: 'Sua empresa está mais no estágio de estabilizar ou de escalar?',
      },
      {
        id: 'e5',
        question: 'Atendem empresas como a minha?',
        answer:
          'Sim — o diagnóstico serve exatamente para ver se o fit existe. Se não fizer sentido, falamos com transparência.',
        gancho: 'Me conta em uma frase o que mais trava o crescimento hoje.',
      },
    ],
  },
  {
    id: 'preco',
    title: 'Preço e investimento',
    entries: [
      {
        id: 'pr1',
        question: 'Quanto custa?',
        answer:
          'O investimento depende do diagnóstico e do plano. Antes disso, qualquer número seria chute. O primeiro passo é entender o tamanho do problema.',
        gancho: 'Se o diagnóstico mostrar um ganho claro de margem, faz sentido avaliar o investimento?',
      },
      {
        id: 'pr2',
        question: 'Insistência no preço / “manda o valor já”',
        answer:
          'Entendo a urgência. Sem entender faturamento, equipe e dor, o valor não ajuda — pode até afastar. Vamos alinhar o contexto em 15–20 min?',
        gancho: 'O que é mais importante: o menor preço ou o retorno em lucro?',
      },
    ],
  },
  {
    id: 'seguranca',
    title: 'Segurança para avançar',
    entries: [
      {
        id: 's1',
        question: 'Minha realidade é diferente.',
        answer:
          'Toda empresa tem particularidades — por isso o diagnóstico. O método se adapta ao estágio, não o contrário.',
        gancho: 'O que na sua realidade você acha que tornaria isso inviável?',
      },
      {
        id: 's2',
        question: 'Tem garantia?',
        answer:
          'Trabalhamos com clareza de escopo e acompanhamento. Na reunião mostramos como medimos progresso para você não “comprar no escuro”.',
        gancho: 'O que precisaria ver para se sentir seguro de avançar?',
      },
      {
        id: 's3',
        question: 'Já tentei de tudo.',
        answer:
          'Muitas vezes o que faltou não foi esforço, e sim sequência e indicadores. É isso que o diagnóstico revela.',
        gancho: 'O que você já tentou que mais se aproximou de funcionar?',
      },
      {
        id: 's4',
        question: 'Por que confiar em vocês?',
        answer:
          'Não peço confiança cega — peço 20 minutos para um diagnóstico. Se não fizer sentido, você sai com clareza do próximo passo mesmo assim.',
        gancho: 'Posso te mostrar o roteiro da reunião para você avaliar?',
      },
    ],
  },
  {
    id: 'decisao',
    title: 'Decisão e alinhamento interno',
    entries: [
      {
        id: 'd1',
        question: 'Preciso falar com o sócio.',
        answer:
          'Perfeito — a reunião diagnóstica é exatamente o momento de alinhar os dois. Podemos incluir o sócio no convite.',
        gancho: 'Qual dia/horário os dois conseguem 20 minutos juntos?',
      },
      {
        id: 'd2',
        question: 'Já temos consultoria.',
        answer:
          'Ótimo ter apoio. Muitas empresas usam o diagnóstico para validar se o que estão fazendo está gerando lucro de verdade.',
        gancho: 'A consultoria atual está focada em quê: vendas, gestão ou financeiro?',
      },
    ],
  },
  {
    id: 'timing',
    title: 'Objeções de timing e prioridade',
    entries: [
      {
        id: 't1',
        question: 'Não tenho problema.',
        answer:
          'Ótimo sinal. Mesmo assim, empresários sem “crise” usam o diagnóstico para proteger margem e escalar com menos dependência do dono.',
        gancho: 'Se pudesse melhorar uma coisa sem dor de cabeça, o que seria?',
      },
      {
        id: 't2',
        question: 'Agora não.',
        answer:
          'Entendo. Posso deixar um horário na agenda daqui a X dias — o problema raramente espera o “momento perfeito”.',
        gancho: 'Quando seria um bom momento: esta semana ou na próxima?',
      },
      {
        id: 't3',
        question: 'O problema é o mercado.',
        answer:
          'Mercado piora para quem não tem processo. Empresas com método protegido de margem sofrem menos em ciclo ruim.',
        gancho: 'O que mais te preocupa no mercado hoje: demanda, preço ou custo?',
      },
      {
        id: 't4',
        question: 'Manda um material.',
        answer:
          'Posso enviar, mas o material não substitui o diagnóstico do seu caso. 15 minutos costumam valer mais que 20 PDFs.',
        gancho: 'Se eu enviar e marcarmos 15 min depois, funciona?',
      },
    ],
  },
]

export function objectionCategorySummaries() {
  return OBJECTION_LIBRARY.map((cat) => ({
    id: cat.id,
    title: cat.title,
    count: cat.entries.length,
    snippet: cat.entries[0]?.question || '',
  }))
}
