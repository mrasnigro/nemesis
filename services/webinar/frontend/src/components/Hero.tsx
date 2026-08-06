import React from 'react';

export const Hero: React.FC = () => {
  return (
    <section
      id="hero"
      className="min-h-screen pt-[70px] bg-gradient-to-br from-blue-100 to-blue-900 flex items-center justify-center px-4"
    >
      <div className="container text-center py-20 md:py-32">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
          Plataforma de Webinars Recorrentes
        </h1>

        <p className="text-lg md:text-2xl font-semibold text-white mb-4">
          Transmita, grave e automatize seus webinars com replay simulado ao vivo
        </p>

        <p className="text-base md:text-lg text-gray-100 mb-8 max-w-2xl mx-auto">
          Crie experiências de webinar profissionais com chat em tempo real, enquetes interativas, 
          agendamento automático e replays que parecem ao vivo. Tudo em uma plataforma simples e poderosa.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
          <a
            href="/login"
            className="px-8 py-4 bg-primary text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-center"
          >
            Acesso Restrito
          </a>
          <a
            href="/register"
            className="px-8 py-4 bg-white text-primary border-2 border-white rounded-lg font-semibold hover:bg-gray-100 transition-colors text-center"
          >
            Cadastre-se Agora
          </a>
        </div>

        <div className="mt-16 md:mt-24">
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-lg p-8 md:p-12 border border-white border-opacity-20">
            <p className="text-white text-sm md:text-base">
              ✨ Teste gratuitamente por 30 dias, sem necessidade de cartão de crédito
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
