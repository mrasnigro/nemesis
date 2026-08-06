import React from 'react';

export const CTA: React.FC = () => {
  return (
    <section className="py-20 md:py-section bg-gradient-to-r from-blue-600 to-blue-800">
      <div className="container text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Comece Agora
        </h2>

        <p className="text-lg md:text-xl text-blue-100 mb-12 max-w-2xl mx-auto">
          Teste gratuitamente por 30 dias, sem necessidade de cartão de crédito
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/login"
            className="px-8 py-4 bg-white text-primary rounded-lg font-semibold hover:bg-gray-100 transition-colors text-center"
          >
            Acesso Restrito
          </a>
          <a
            href="/register"
            className="px-8 py-4 bg-primary text-white border-2 border-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-center"
          >
            Cadastre-se Agora
          </a>
        </div>
      </div>
    </section>
  );
};
