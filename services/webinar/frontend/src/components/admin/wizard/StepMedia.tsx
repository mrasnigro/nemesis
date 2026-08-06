import React from 'react';

interface StepMediaProps {
  formData: {
    videoUrl: string;
    status: string;
  };
  onInputChange: (field: string, value: any) => void;
}

const StepMedia: React.FC<StepMediaProps> = ({ formData, onInputChange }) => {

  const getVideoSourceType = (url: string) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('vimeo.com')) return 'vimeo';
    if (url) return 'upload';
    return 'none';
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          URL do Vídeo
        </label>
        <input
          type="url"
          value={formData.videoUrl}
          onChange={(e) => onInputChange('videoUrl', e.target.value)}
          placeholder="https://youtube.com/watch?v=... ou https://vimeo.com/..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Cole a URL do vídeo do YouTube, Vimeo ou outro provedor
        </p>
      </div>

      {formData.videoUrl && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Tipo detectado:</strong> {getVideoSourceType(formData.videoUrl).toUpperCase()}
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Status de Publicação
        </label>
        <div className="space-y-3">
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="status"
              value="draft"
              checked={formData.status === 'draft'}
              onChange={(e) => onInputChange('status', e.target.value)}
              className="w-4 h-4 text-blue-600"
            />
            <span className="ml-3 text-sm font-medium text-gray-700">
              Rascunho
            </span>
            <span className="ml-2 text-xs text-gray-500">(Não será visível para clientes)</span>
          </label>

          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="status"
              value="published"
              checked={formData.status === 'published'}
              onChange={(e) => onInputChange('status', e.target.value)}
              className="w-4 h-4 text-blue-600"
            />
            <span className="ml-3 text-sm font-medium text-gray-700">
              Publicado
            </span>
            <span className="ml-2 text-xs text-gray-500">(Visível para clientes)</span>
          </label>
        </div>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h4 className="font-semibold text-purple-800 mb-2">Formatos Suportados</h4>
        <ul className="text-sm text-purple-700 space-y-1">
          <li>✓ YouTube (links públicos)</li>
          <li>✓ Vimeo (links públicos ou compartilháveis)</li>
          <li>✓ Transmissão ao vivo (Zoom, OBS, etc.)</li>
          <li>✓ Arquivos de vídeo hospedados externamente</li>
        </ul>
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <p className="text-sm text-orange-800">
          <strong>Dica:</strong> Você pode deixar a URL vazia se o webinar será uma transmissão ao vivo. Adicione a URL depois que a transmissão começar.
        </p>
      </div>
    </div>
  );
};

export default StepMedia;
