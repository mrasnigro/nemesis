import React from 'react';

interface StepBasicInfoProps {
  formData: {
    title: string;
    description: string;
    category: string;
    presenterName: string;
  };
  onInputChange: (field: string, value: any) => void;
}

const StepBasicInfo: React.FC<StepBasicInfoProps> = ({ formData, onInputChange }) => {
  const categories = ['Geral', 'Marketing', 'Vendas', 'Tecnologia', 'Educação', 'Outro'];

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Título do Webinar *
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => onInputChange('title', e.target.value)}
          placeholder="Ex: Estratégias Avançadas de Vendas B2B"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          maxLength={100}
        />
        <p className="text-xs text-gray-500 mt-1">{formData.title.length}/100 caracteres</p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Descrição *
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => onInputChange('description', e.target.value)}
          placeholder="Descreva o conteúdo e objetivos do webinar..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          rows={5}
          maxLength={500}
        />
        <p className="text-xs text-gray-500 mt-1">{formData.description.length}/500 caracteres</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Categoria
          </label>
          <select
            value={formData.category}
            onChange={(e) => onInputChange('category', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Apresentador
          </label>
          <input
            type="text"
            value={formData.presenterName}
            onChange={(e) => onInputChange('presenterName', e.target.value)}
            placeholder="Nome do apresentador"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            maxLength={50}
          />
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Dica:</strong> Forneça um título claro e uma descrição detalhada para atrair mais participantes.
        </p>
      </div>
    </div>
  );
};

export default StepBasicInfo;
