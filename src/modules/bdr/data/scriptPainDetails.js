/** VER DORES DOS EMPRESÁRIOS — sample Dialer accordion copy */
export const SCRIPT_PAIN_DETAILS = [
  {
    id: 'lucro',
    color: '#22d3ee',
    title: '[Se disser: O dinheiro entra, mas não sobra | Lucro]',
    subtitle: 'Explorar margem, custos invisíveis e desperdícios.',
    prompt:
      'Entendi. E, na sua percepção, por que isso acontece? Onde você sente que o dinheiro acaba escapando? É custo, equipe, operação, comercial... ou ainda não conseguiu identificar?',
    followUps: [
      'Faz sentido. É exatamente esse tipo de situação que investigamos.',
      'Muitas empresas faturam bem, mas acabam perdendo margem por desperdícios, custos invisíveis ou processos que deixam o dinheiro escapar sem que o empresário perceba.',
      'O nosso trabalho é identificar esses gargalos e fazer você ter mais lucros e resultados.',
    ],
  },
  {
    id: 'vendas',
    color: '#4ade80',
    title: '[Se disser: As vendas caíram / dependo de indicação | Vendas / Crescimento]',
    subtitle: 'Entender volume de oportunidades e taxa de fechamento.',
    prompt:
      'Entendi. E, na sua percepção, o que mais mudou? Está chegando menos gente interessada ou vocês estão tendo mais dificuldade para fechar as vendas?',
    followUps: [
      'Faz sentido. É justamente esse tipo de situation que trabalhamos.',
      'O objetivo é estruturar um processo comercial para que as vendas deixem de depender da sorte ou de momentos específicos e passem a acontecer de forma muito mais previsível.',
    ],
  },
  {
    id: 'gestao',
    color: '#e879f9',
    title: '[Se disser: Vivo apagando incêndios | Gestão]',
    subtitle: 'Investigar rotina operacional, organização e acompanhamento da equipe.',
    prompt:
      'Entendi. E hoje, o que mais toma o seu tempo? Resolver problemas que aparecem o dia inteiro, organizar a operação ou acompanhar a equipe?',
    followUps: [
      'Faz sentido. É justamente esse tipo de situação que ajudamos a organizar. Estruturamos a gestão da empresa com processos, indicadores, metas e rotinas para que você deixe de apagar incêndios o tempo todo e volte a ter controle da operação e tempo para pensar no crescimento.',
    ],
  },
  {
    id: 'lideranca',
    color: '#60a5fa',
    title: '[Se disser: A equipe depende de mim | Liderança]',
    subtitle: 'Aprofundar autonomia, delegação e responsabilidade.',
    prompt:
      'Imagino o quanto isso deve sobrecarregar você. E me diz uma coisa: hoje você sente que falta autonomia da equipe ou que ninguém assume a responsabilidade pelas decisões?',
    followUps: [
      'Entendi. O objetivo do nosso trabalho é justamente desenvolver líderes e uma equipe mais preparada para que a empresa funcione com mais autonomia e você deixe de ser o centro de todas as decisões.',
    ],
  },
  {
    id: 'todos',
    color: '#f87171',
    title: '[Se disser: Tenho problemas em tudo]',
    subtitle: 'Trazer foco para o gargalo principal.',
    prompt:
      'Entendo. Isso é mais comum do que parece. Mas... olhando para a empresa hoje, qual é o problema que mais tem tirado o seu sono, que se você pudesse resolver nas próximas semanas, teria o maior impacto na sua empresa',
    followUps: [],
    note: '[Retornar para a dor Específica que ele mencionar]',
  },
  {
    id: 'nenhum',
    color: '#a855f7',
    title: '[Se disser: Não tenho nenhum Problema]',
    subtitle: 'Explorar Crescimento e Aceleração de Resultados',
    prompt:
      'Excelente. Então talvez o momento seja justamente o melhor para olhar oportunidades de crescimento, porque é muito mais fácil evoluir uma empresa organizada do que corrigir uma empresa em crise. Me diga uma coisa: hoje você acredita que sua empresa está operando perto do máximo potencial ou ainda existe espaço para aumentar os resultados?',
    followUps: [
      'Se você pudesse aumentar apenas um indicador em 20% nos próximos 12 meses, qual escolheria? Faturamento, Lucro, Produtividade da equipe., Número de clientes., Retenção... qual?',
    ],
  },
]
