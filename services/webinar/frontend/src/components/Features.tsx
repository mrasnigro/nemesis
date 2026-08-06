import React from 'react';

interface Feature {
  icon: string;
  title: string;
  description: string;
}

export const Features: React.FC = () => {
  const features: Feature[] = [
    {
      icon: '🎬',
      title: 'Replay Simulado ao Vivo',
      description: 'Grave seus webinars e reproduza como se fossem ao vivo',
    },
    {
      icon: '💬',
      title: 'Chat em Tempo Real',
      description: 'Interaja com seu público em tempo real',
    },
    {
      icon: '📊',
      title: 'Enquetes e CTAs',
      description: 'Crie enquetes e ofertas interativas',
    },
    {
      icon: '📅',
      title: 'Agendamento Automático',
      description: 'Agende replays para horários fixos',
    },
    {
      icon: '📈',
      title: 'Relatórios Detalhados',
      description: 'Analise o desempenho de cada webinar',
    },
    {
      icon: '🔔',
      title: 'Notificações Automáticas',
      description: 'Lembretes por email e WhatsApp',
    },
  ];

  return (
    <section id="features" className="py-20 md:py-section bg-light">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-text mb-4">
            Por que escolher nossa plataforma?
          </h2>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            Recursos poderosos para criar, transmitir e monetizar seus webinars
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white p-8 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-border"
            >
              <div className="text-5xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-bold text-text mb-3">{feature.title}</h3>
              <p className="text-text-secondary">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
