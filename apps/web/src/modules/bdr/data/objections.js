/**
 * Questionamentos Padrão — live Dialer / PLUCK parity.
 * Reference talk-tracks — not a hard branching engine.
 */

export const OBJECTION_LIBRARY = [
  {
    id: 'produto',
    title: 'Sobre o produto',
    color: '#2dd4bf',
    snippet:
      'O que vende? Não entendi? Como funciona? Quanto tempo dura? É uma mentoria ou curso?.',
    entries: [
      {
        id: 'p1',
        label: '[O QUE VOCÊS VENDEM]',
        subtitle: 'Explicação objetiva da oferta.',
        question: 'O que vocês vendem?',
        paragraphs: [
          'Só para contextualizar rapidamente: o que nós oferecemos não é um software, nem um curso para você assistir sozinho. Também não é uma consultoria que entrega um relatório e vai embora.',
          'Nós implementamos uma metodologia de crescimento empresarial personalizada para pequenas e médias empresas. Na prática, nós trabalhamos lado a lado com a empresa na implementação. Um especialista acompanha a empresa durante todo o processo para garantir que as mudanças gerem resultado.',
        ],
        ganchoTitle: 'GANCHO PARA CONTINUAR A CONVERSA',
        ganchoLines: [
          '- Mas me ajuda a entender uma coisa: na sua empresa hoje, qual é o principal desafio?',
          '- Se você pudesse resolver já nas próximas semanas o maior desafio que você está enfrentando hoje na sua empresa, qual faria maior diferença para o seu negócio?',
        ],
      },
      {
        id: 'p2',
        label: '[AINDA NÃO ENTENDI O QUE VOCÊS VENDEM]',
        subtitle: 'Versão resumida com exemplo prático.',
        question: 'Ainda não entendi o que vocês vendem',
        paragraphs: [
          'Perfeito, deixa eu resumir em uma frase. Nós implementamos uma metodologia de crescimento empresarial para pequenas e médias empresas.',
          'Na prática, ajudamos a empresa a aumentar a lucratividade, estruturar as vendas, organizar a gestão e desenvolver líderes, acompanhando a implementação até que as mudanças gerem resultado.',
          'Por exemplo:',
        ],
        bullets: [
          'Se hoje você me disser que o dinheiro entra, mas não sobra, nós trabalhamos para descobrir onde a empresa está perdendo margem e corrigir isso.',
          'Se o problema for vendas, estruturamos o processo comercial.',
          'Se for gestão ou equipe, organizamos a operação e desenvolvemos os líderes.',
        ],
        paragraphsAfter: [
          'Em resumo, ajudamos a empresa a crescer resolvendo o principal gargalo que está limitando os resultados.',
        ],
      },
      {
        id: 'p3',
        label: '[COMO FUNCIONA NA PRÁTICA]',
        subtitle: 'Mostra a lógica do processo.',
        question: 'Como funciona na prática?',
        paragraphs: [
          'Primeiro entendemos a realidade da empresa e identificamos o principal gargalo.',
          'Depois construímos um plano de ação e acompanhamos a implementação junto com a equipe. O foco é transformar as melhorias em rotina e gerar resultados consistentes.',
        ],
      },
      {
        id: 'p4',
        label: '[QUANTO TEMPO DURA O TRABALHO]',
        subtitle: 'Explica duração e frentes de atuação.',
        question: 'Quanto tempo dura o trabalho?',
        paragraphs: [
          'Excelente pergunta. A implementação normalmente leva entre 3 e 6 meses, dependendo da complexidade do negócio.',
          'Parece bastante tempo, mas é justamente esse período que permite implantar as mudanças, acompanhar a equipe e consolidar os resultados para garantir que realmente façam parte da operação.',
          'Durante esse processo, atuamos em três frentes principais:',
        ],
        bullets: [
          'Aumentar a lucratividade.',
          'Estruturar um processo comercial previsível.',
          'Organizar a gestão e desenvolver líderes para que a empresa deixe de depender exclusivamente do empresário.',
        ],
      },
      {
        id: 'p5',
        label: '[É UM CURSO, SOFTWARE OU MENTORIA?]',
        subtitle: 'Quebra comparações erradas e reposiciona.',
        question: 'É um curso, software ou mentoria?',
        paragraphs: [
          'Não é um curso nem um software. Também não é uma consultoria tradicional que entrega um relatório e vai embora.',
          'Nós implementamos uma metodologia junto com a empresa. Um especialista acompanha a execução para garantir que as mudanças gerem resultados.',
        ],
        branches: [
          {
            title: 'SE PERGUNTAR “É UM CURSO?”',
            text: 'Não. É uma metodologia de implementação acompanhada por um especialista. Ela é personalizada para a realidade de cada empresa. Agora me conta: hoje o maior desafio está mais na operação, nas vendas ou na gestão?',
          },
          {
            title: 'SE PERGUNTAR “É UM SOFTWARE?”',
            text: 'Também não. Nós utilizamos ferramentas durante o processo, mas o principal é a implementação da metodologia junto com a empresa. Deixa eu entender melhor: quando você falou que vive apagando incêndios, o que mais toma o seu tempo hoje?',
          },
          {
            title: 'SE PERGUNTAR “É UMA MENTORIA?”',
            text: 'Existe um acompanhamento próximo, mas o foco não é apenas orientar. O trabalho é implementar uma metodologia de crescimento empresarial junto com a empresa. E me conta: qual é o maior desafio hoje para o seu negócio?',
          },
        ],
      },
    ],
  },
  {
    id: 'comparacao',
    title: 'Comparação com outros produtos',
    color: '#60a5fa',
    snippet: 'Por que é diferente? Qual a diferença das outras Mentorias?.',
    entries: [
      {
        id: 'c1',
        label: '[POR QUE A METODOLOGIA DE VOCÊS É DIFERENTE]',
        subtitle: 'Diferença estrutural da abordagem.',
        question: 'Por que a metodologia de vocês é diferente?',
        paragraphs: [
          'Porque ela integra três camadas que normalmente são tratadas separadamente: lucratividade, crescimento e operações, que engloba gestão e liderança.',
          'Em vez de atacar apenas um sintoma, buscamos o gargalo principal que está limitando o crescimento da empresa.',
        ],
      },
      {
        id: 'c2',
        label: '[O QUE DIFERENCIA DE UMA CONSULTORIA COMUM?]',
        subtitle: 'Mostra personalização e acompanhamento.',
        question: 'O que diferencia de uma consultoria comum?',
        paragraphs: [
          'O que faz funcionar não é a metodologia por si só, mas a forma como ela é aplicada. Empresas diferentes têm desafios diferentes.',
          'Por isso não trabalhamos com uma receita pronta. Primeiro entendemos profundamente a operação, depois adaptamos a implementação à realidade de cada empresa.',
        ],
      },
    ],
  },
  {
    id: 'empresa',
    title: 'Sobre a empresa',
    color: '#a78bfa',
    snippet:
      'O que é o IMP? O que já fizeram? Vocês tem Cases? Qual são seus clientes? Já atenderam empresas como a minha?',
    entries: [
      {
        id: 'e1',
        label: '[O QUE É O IMP]',
        subtitle: 'Explicativo da empresa.',
        question: 'O que é o IMP?',
        paragraphs: [
          'Claro. O IMP é uma empresa especializada em crescimento empresarial. Há mais de 25 anos ajudamos Pequenas e Médias empresas a aumentar os lucros, organizar a gestão, desenvolver líderes e estruturar vendas.',
        ],
        ganchoTitle: 'GANCHO PARA CONTINUAR',
        ganchoLines: [
          '- Posso te fazer uma pergunta rápida para entender se faz sentido para a realidade da sua empresa?',
        ],
      },
      {
        id: 'e2',
        label: '[HÁ QUANTO TEMPO ATUAM COM ISSO? VOCÊS TÊM KNOW-HOW?]',
        subtitle: 'Histórico, método e experiência.',
        question: 'Há quanto tempo atuam com isso? Vocês têm know-how?',
        paragraphs: [
          'Ótima pergunta. Temos uma metodologia desenvolvida ao longo de mais de 25 anos, reunindo práticas utilizadas em organizações como Kraft, Petrobras e Tribunal de Justiça, adaptadas para pequenas e médias empresas.',
        ],
      },
      {
        id: 'e3',
        label: '[E VOCÊS TÊM CASES]',
        subtitle: 'Casos, segmentos e resultados.',
        question: 'E vocês têm cases?',
        paragraphs: [
          'Temos, sim. Ao longo dos últimos 25 anos, já ajudamos empresas de diferentes segmentos e portes.',
          'Além disso, empresas que aplicaram essa metodologia já geraram, juntas, mais de R$ 300 milhões em resultados.',
        ],
      },
      {
        id: 'e4',
        label: '[QUEM SÃO OS CLIENTES DE VOCÊS]',
        subtitle: 'Perfil das empresas atendidas.',
        question: 'Quem são os clientes de vocês?',
        paragraphs: [
          'Atendemos principalmente pequenas e médias empresas em fase de crescimento, de diferentes segmentos.',
        ],
      },
      {
        id: 'e5',
        label: '[JÁ ATENDERAM EMPRESAS COMO A MINHA]',
        subtitle: 'Semelhança de desafio, não só de segmento.',
        question: 'Já atenderam empresas como a minha?',
        paragraphs: [
          'Sim — o mais importante não é só o segmento, e sim o tipo de desafio. Empresas com dores parecidas passam pelo mesmo processo de diagnóstico e adaptação da metodologia.',
        ],
      },
    ],
  },
  {
    id: 'preco',
    title: 'Preço e investimento',
    color: '#fbbf24',
    snippet: 'Quanto custa? Você não falou sobre preço?',
    entries: [
      {
        id: 'pr1',
        label: '[QUANTO CUSTA]',
        subtitle: 'Investimento depende do diagnóstico.',
        question: 'Quanto custa?',
        paragraphs: [
          'O investimento depende do diagnóstico e do plano. Antes disso, qualquer número seria chute. O primeiro passo é entender o tamanho do problema.',
        ],
      },
      {
        id: 'pr2',
        label: '[VOCÊ NÃO FALOU SOBRE PREÇO]',
        subtitle: 'Reposiciona urgência sem chute de valor.',
        question: 'Você não falou sobre preço?',
        paragraphs: [
          'Entendo a urgência. Sem entender faturamento, equipe e dor, o valor não ajuda — pode até afastar. Vamos alinhar o contexto em 15–20 min?',
        ],
      },
    ],
  },
  {
    id: 'seguranca',
    title: 'Segurança para avançar',
    color: '#4ade80',
    snippet: 'E se a minha empresa for diferente? Vocês garantem que funciona? Eu já tentei isso.',
    entries: [
      {
        id: 's1',
        label: '[E SE A MINHA EMPRESA FOR DIFERENTE]',
        subtitle: 'Particularidade e adaptação do método.',
        question: 'E se a minha empresa for diferente?',
        paragraphs: [
          'Toda empresa tem particularidades — por isso o diagnóstico. O método se adapta ao estágio, não o contrário.',
        ],
      },
      {
        id: 's2',
        label: '[VOCÊS GARANTEM QUE FUNCIONA]',
        subtitle: 'Clareza de escopo e medição.',
        question: 'Vocês garantem que funciona?',
        paragraphs: [
          'Trabalhamos com clareza de escopo e acompanhamento. Na reunião mostramos como medimos progresso para você não “comprar no escuro”.',
        ],
      },
      {
        id: 's3',
        label: '[EU JÁ TENTEI ISSO]',
        subtitle: 'Sequência e indicadores.',
        question: 'Eu já tentei isso.',
        paragraphs: [
          'Muitas vezes o que faltou não foi esforço, e sim sequência e indicadores. É isso que o diagnóstico revela.',
        ],
      },
      {
        id: 's4',
        label: '[POR QUE CONFIAR EM VOCÊS]',
        subtitle: 'Convite ao diagnóstico sem pressão.',
        question: 'Por que confiar em vocês?',
        paragraphs: [
          'Não peço confiança cega — peço 20 minutos para um diagnóstico. Se não fizer sentido, você sai com clareza do próximo passo mesmo assim.',
        ],
      },
    ],
  },
  {
    id: 'decisao',
    title: 'Decisão e alinhamento interno',
    color: '#3b82f6',
    snippet: 'Vou falar com meu Sócio. Já temos uma consultoria.',
    entries: [
      {
        id: 'd1',
        label: '[VOU FALAR COM MEU SÓCIO]',
        subtitle: 'Inclui o sócio na reunião diagnóstica.',
        question: 'Vou falar com meu sócio.',
        paragraphs: [
          'Perfeito — a reunião diagnóstica é exatamente o momento de alinhar os dois. Podemos incluir o sócio no convite.',
        ],
      },
      {
        id: 'd2',
        label: '[JÁ TEMOS UMA CONSULTORIA]',
        subtitle: 'Complementa, não compete às cegas.',
        question: 'Já temos uma consultoria.',
        paragraphs: [
          'Ótimo ter apoio. Muitas empresas usam o diagnóstico para validar se o que estão fazendo está gerando lucro de verdade.',
        ],
      },
    ],
  },
  {
    id: 'timing',
    title: 'Objeções de timing e prioridade',
    color: '#94a3b8',
    snippet: 'Eu não tenho problema nenhum. Agora não é um bom momento. Manda Material.',
    entries: [
      {
        id: 't1',
        label: '[EU NÃO TENHO PROBLEMA NENHUM]',
        subtitle: 'Oportunidade mesmo sem crise.',
        question: 'Eu não tenho problema nenhum.',
        paragraphs: [
          'Ótimo sinal. Mesmo assim, empresários sem “crise” usam o diagnóstico para proteger margem e escalar com menos dependência do dono.',
        ],
      },
      {
        id: 't2',
        label: '[AGORA NÃO É UM BOM MOMENTO]',
        subtitle: 'Agenda sem perder o gancho.',
        question: 'Agora não é um bom momento.',
        paragraphs: [
          'Entendo. Posso deixar um horário na agenda daqui a alguns dias — o problema raramente espera o “momento perfeito”.',
        ],
      },
      {
        id: 't3',
        label: '[O PROBLEMA É O MERCADO]',
        subtitle: 'Processo protege margem no ciclo ruim.',
        question: 'O problema é o mercado.',
        paragraphs: [
          'Mercado piora para quem não tem processo. Empresas com método protegido de margem sofrem menos em ciclo ruim.',
        ],
      },
      {
        id: 't4',
        label: '[MANDA MATERIAL]',
        subtitle: 'Material + diagnóstico curto.',
        question: 'Manda material.',
        paragraphs: [
          'Posso enviar, mas o material não substitui o diagnóstico do seu caso. 15 minutos costumam valer mais que 20 PDFs.',
        ],
      },
    ],
  },
]

export function objectionCategorySummaries() {
  return OBJECTION_LIBRARY.map((cat) => ({
    id: cat.id,
    title: cat.title,
    count: cat.entries.length,
    snippet: cat.snippet || cat.entries[0]?.question || '',
    color: cat.color,
  }))
}
