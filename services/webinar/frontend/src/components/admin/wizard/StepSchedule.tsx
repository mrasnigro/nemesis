import React from 'react';

interface StepScheduleProps {
  formData: {
    date: string;
    time: string;
    duration: number;
  };
  onInputChange: (field: string, value: any) => void;
}

const StepSchedule: React.FC<StepScheduleProps> = ({ formData, onInputChange }) => {
  // Obter data mínima (hoje)
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Data do Webinar *
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => onInputChange('date', e.target.value)}
            min={today}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Selecione uma data futura</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Horário de Início *
          </label>
          <input
            type="time"
            value={formData.time}
            onChange={(e) => onInputChange('time', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Formato 24h</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Duração (minutos)
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="15"
            max="480"
            step="15"
            value={formData.duration}
            onChange={(e) => onInputChange('duration', parseInt(e.target.value))}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded font-semibold min-w-[80px] text-center">
            {formData.duration} min
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {Math.floor(formData.duration / 60)}h {formData.duration % 60}min
        </p>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="font-semibold text-green-800 mb-2">Resumo do Agendamento</h4>
        <div className="space-y-1 text-sm text-green-700">
          <p>
            <strong>Data:</strong> {formData.date ? new Date(formData.date).toLocaleDateString('pt-BR') : 'Não definida'}
          </p>
          <p>
            <strong>Horário:</strong> {formData.time || 'Não definido'}
          </p>
          <p>
            <strong>Duração:</strong> {Math.floor(formData.duration / 60)}h {formData.duration % 60}min
          </p>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          <strong>Aviso:</strong> Certifique-se de que a data e hora estão corretas. Os participantes receberão um lembrete 24 horas antes do webinar.
        </p>
      </div>
    </div>
  );
};

export default StepSchedule;
