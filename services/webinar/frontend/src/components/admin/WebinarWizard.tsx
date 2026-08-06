import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import StepBasicInfo from './wizard/StepBasicInfo';
import StepSchedule from './wizard/StepSchedule';
import StepMedia from './wizard/StepMedia';
import StepReview from './wizard/StepReview';

interface WebinarFormData {
  title: string;
  description: string;
  category: string;
  presenterName: string;
  date: string;
  time: string;
  duration: number;
  videoUrl: string;
  status: string;
}

interface WebinarWizardProps {
  submitEndpoint: string;
  successRedirect: string;
  cancelRedirect: string;
}

const WebinarWizard: React.FC<WebinarWizardProps> = ({ submitEndpoint, successRedirect, cancelRedirect }) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<WebinarFormData>({
    title: '',
    description: '',
    category: 'Geral',
    presenterName: '',
    date: '',
    time: '',
    duration: 60,
    videoUrl: '',
    status: 'draft',
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    } as WebinarFormData));
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
      setError(null);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validações finais
      if (!formData.title.trim()) {
        setError('Título do webinar é obrigatório');
        setLoading(false);
        return;
      }

      if (!formData.description.trim()) {
        setError('Descrição do webinar é obrigatória');
        setLoading(false);
        return;
      }

      if (!formData.date) {
        setError('Data do webinar é obrigatória');
        setLoading(false);
        return;
      }

      if (!formData.time) {
        setError('Horário do webinar é obrigatório');
        setLoading(false);
        return;
      }

      // Combinar data e hora em um único campo scheduledDate
      const scheduledDate = new Date(`${formData.date}T${formData.time}:00`);

      const dataToSend = {
        ...formData,
        scheduledDate: scheduledDate.toISOString(),
        durationMinutes: formData.duration, // Garantir que o nome do campo corresponda ao backend
      };

      // Remover campos individuais que não são esperados pelo backend
      delete (dataToSend as any).date;
      delete (dataToSend as any).time;
      delete (dataToSend as any).duration;

      console.log("WebinarWizard: Data being sent to API:", dataToSend);
      // Enviar para API
      const response = await api.post(submitEndpoint, dataToSend);

      if (response.status === 201) {
        setSuccess(true);
        setTimeout(() => {
          navigate(successRedirect);
        }, 2000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao criar webinar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, title: 'Informações Básicas' },
    { number: 2, title: 'Agendamento' },
    { number: 3, title: 'Configurações de Mídia' },
    { number: 4, title: 'Revisão e Publicação' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Criar Novo Webinar</h1>
          <p className="text-gray-600 mt-2">Siga os passos abaixo para criar um novo webinar</p>
        </div>

        {/* Stepper */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center flex-1">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm ${
                    currentStep >= step.number
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step.number}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-800">{step.title}</p>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-4 ${
                      currentStep > step.number ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  ></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-medium">✓ Webinar criado com sucesso! Redirecionando...</p>
          </div>
        )}

        {/* Form Content */}
        <div className="bg-white rounded-lg shadow p-8 mb-8">
          {currentStep === 1 && (
            <StepBasicInfo formData={formData} onInputChange={handleInputChange} />
          )}
          {currentStep === 2 && (
            <StepSchedule formData={formData} onInputChange={handleInputChange} />
          )}
          {currentStep === 3 && (
            <StepMedia formData={formData} onInputChange={handleInputChange} />
          )}
          {currentStep === 4 && (
            <StepReview formData={formData} />
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-4 justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1 || loading}
            className={`px-6 py-2 rounded font-medium transition-colors ${
              currentStep === 1 || loading
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-gray-300 hover:bg-gray-400 text-gray-800'
            }`}
          >
            ← Anterior
          </button>

          <div className="flex gap-4">
            <button
              onClick={() => navigate(cancelRedirect)}
              disabled={loading}
              className="px-6 py-2 border border-gray-300 rounded font-medium hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>

            {currentStep < 4 ? (
              <button
                onClick={handleNext}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors disabled:opacity-50"
              >
                Próximo →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium transition-colors disabled:opacity-50"
              >
                {loading ? 'Criando...' : '✓ Criar Webinar'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebinarWizard;
