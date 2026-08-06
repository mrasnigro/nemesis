import React from 'react';

interface Plan {
  name: string;
  price: string;
  period: string;
  features: string[];
  buttonText: string;
  highlighted?: boolean;
  badge?: string;
}

export const Pricing: React.FC = () => {
  const plans: Plan[] = [
    {
      name: 'Trial',
      price: 'Gratuito',
      period: '30 dias',
      features: [
        'Webinars até 20 minutos',
        'Até 10 participantes',
        'Chat básico',
        'Replays por 30 dias',
        '1 webinar por semana',
      ],
      buttonText: 'Começar Agora',
    },
    {
      name: 'Básico',
      price: 'R$ 99',
      period: 'por mês',
      features: [
        'Webinars até 30 minutos',
        'Até 1.000 participantes',
        'Chat avançado',
        'Replays por 30 dias',
        'Enquetes e CTAs',
      ],
      buttonText: 'Escolher Plano',
    },
    {
      name: 'Profissional',
      price: 'R$ 299',
      period: 'por mês',
      features: [
        'Webinars até 2 horas',
        'Até 5.000 participantes',
        'Chat ilimitado',
        'Replays ilimitados',
        'Automação completa',
      ],
      buttonText: 'Escolher Plano',
      highlighted: true,
      badge: 'MAIS POPULAR',
    },
    {
      name: 'Enterprise',
      price: 'Customizado',
      period: 'sob consulta',
      features: [
        'Sem limites',
        'Suporte prioritário',
        'Integrações customizadas',
        'Dedicado',
        'SLA garantido',
      ],
      buttonText: 'Solicitar Orçamento',
    },
  ];

  return (
    <section id="pricing" className="py-20 md:py-section bg-white">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-text mb-4">
            Planos e Preços
          </h2>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            Escolha o plano perfeito para suas necessidades
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative rounded-lg p-8 transition-all ${
                plan.highlighted
                  ? 'border-2 border-primary shadow-lg scale-105 md:scale-100'
                  : 'border-2 border-border hover:border-primary'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-primary text-white px-4 py-1 rounded-full text-sm font-bold">
                  {plan.badge}
                </div>
              )}

              <h3 className="text-2xl font-bold text-text mb-2">{plan.name}</h3>

              <div className="mb-6">
                <span className="text-4xl font-bold text-primary">{plan.price}</span>
                <p className="text-text-secondary text-sm mt-1">{plan.period}</p>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-3">
                    <span className="text-primary font-bold mt-1">✓</span>
                    <span className="text-text-secondary text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                  plan.highlighted
                    ? 'bg-primary text-white hover:bg-blue-700'
                    : 'bg-light text-primary hover:bg-gray-200'
                }`}
              >
                {plan.buttonText}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
