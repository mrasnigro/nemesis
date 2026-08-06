import React from 'react';

interface StepReviewProps {
  formData: {
    title: string;
    description: string;
    category: string;
    instructor: string;
    date: string;
    time: string;
    duration: number;
    videoUrl: string;
    status: string;
  };
}

const StepReview: React.FC<StepReviewProps> = ({ formData }) => {
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Não definida';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusLabel = (status: string) => {
    return status === 'draft' ? 'Rascunho' : 'Publicado';
  };

  const getStatusColor = (status: string) => {
    return status === 'draft'
      ? 'bg-yellow-100 text-yellow-800'
      : 'bg-green-100 text-green-800';
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Revise os dados abaixo antes de criar o webinar.</strong> Você poderá editar essas informações depois se necessário.
        </p>
      </div>

      {/* Informações Básicas */}
      <div className="border-l-4 border-blue-600 pl-4">
        <h3 className="font-bold text-gray-800 mb-3">Informações Básicas</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Título:</span>
            <span className="font-medium text-gray-800">{formData.title}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Descrição:</span>
            <span className="font-medium text-gray-800 text-right max-w-xs">
              {formData.description.substring(0, 50)}...
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Categoria:</span>
            <span className="font-medium text-gray-800">{formData.category}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Instrutor:</span>
            <span className="font-medium text-gray-800">
              {formData.instructor || '(Não especificado)'}
            </span>
          </div>
        </div>
      </div>

      {/* Agendamento */}
      <div className="border-l-4 border-green-600 pl-4">
        <h3 className="font-bold text-gray-800 mb-3">Agendamento</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Data:</span>
            <span className="font-medium text-gray-800">{formatDate(formData.date)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Horário:</span>
            <span className="font-medium text-gray-800">{formData.time}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Duração:</span>
            <span className="font-medium text-gray-800">
              {Math.floor(formData.duration / 60)}h {formData.duration % 60}min
            </span>
          </div>
        </div>
      </div>

      {/* Mídia */}
      <div className="border-l-4 border-purple-600 pl-4">
        <h3 className="font-bold text-gray-800 mb-3">Configurações de Mídia</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">URL do Vídeo:</span>
            <span className="font-medium text-gray-800">
              {formData.videoUrl ? '✓ Configurada' : '(Não configurada)'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Status:</span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(formData.status)}`}>
              {getStatusLabel(formData.status)}
            </span>
          </div>
        </div>
      </div>

      {/* Resumo Final */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-bold text-gray-800 mb-3">Resumo da Criação</h4>
        <div className="space-y-2 text-sm text-gray-700">
          <p>
            ✓ Webinar <strong>{formData.title}</strong> será criado como <strong>{getStatusLabel(formData.status)}</strong>.
          </p>
          <p>
            ✓ Agendado para <strong>{formatDate(formData.date)} às {formData.time}</strong>.
          </p>
          {formData.videoUrl && (
            <p>
              ✓ Vídeo será incluído na página do webinar.
            </p>
          )}
          <p>
            ✓ Os participantes poderão acessar o webinar na plataforma.
          </p>
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-sm text-green-800">
          <strong>Pronto!</strong> Clique no botão "✓ Criar Webinar" abaixo para finalizar a criação.
        </p>
      </div>
    </div>
  );
};

export default StepReview;
