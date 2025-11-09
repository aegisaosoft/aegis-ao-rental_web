import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, Volume2, Sparkles, X } from 'lucide-react';

import { useCompany } from '../context/CompanyContext';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useTextToSpeech } from '../hooks/useTextToSpeech';

const AICarRecommendations = ({ onSelectVehicle, availableVehicles }) => {
  const { t, i18n } = useTranslation();
  const { formatPrice } = useCompany();

  const [showAI, setShowAI] = useState(false);
  const [requirements, setRequirements] = useState('');
  const [recommendations, setRecommendations] = useState(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  const {
    transcript,
    isListening,
    startListening,
    stopListening,
    resetTranscript,
    isSupported: speechInputSupported,
  } = useSpeechRecognition(i18n.language);

  const {
    speak,
    stop: stopSpeaking,
    isSpeaking,
    isSupported: speechOutputSupported,
  } = useTextToSpeech(i18n.language);

  useEffect(() => {
    if (transcript) {
      setRequirements(transcript);
    }
  }, [transcript]);

  const handleVoiceInput = () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      startListening();
    }
  };

  const getAIRecommendations = async () => {
    if (!requirements.trim()) {
      return;
    }

    setIsLoadingAI(true);
    try {
      const response = await fetch('/api/recommendations/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirements,
          language: i18n.language,
          availableVehicles: availableVehicles.map((v) => ({
            id: v.vehicle_id || v.id,
            make: v.make,
            model: v.model,
            year: v.year,
            dailyRate: v.daily_rate || v.dailyRate,
            seats: v.seats,
            type: v.type,
            transmission: v.transmission,
            fuelType: v.fuel_type || v.fuelType,
            features: v.features || [],
          })),
        }),
      });

      const data = await response.json();
      setRecommendations(data);

      if (speechOutputSupported && data?.summary) {
        speak(data.summary);
      }
    } catch (error) {
      console.error('AI recommendation error:', error);
    } finally {
      setIsLoadingAI(false);
    }
  };

  const translations = {
    en: {
      aiTitle: 'AI Car Assistant',
      tellUs: 'Tell us what you need',
      placeholder: 'e.g., "I need a family car for 5 people for a beach trip"',
      getRecommendations: 'Get AI Recommendations',
      listening: 'Listening',
      clickToSpeak: 'Click to speak',
      stopRecording: 'Stop recording',
      loading: 'Getting recommendations',
      topPick: 'Top Pick',
      pros: 'Pros',
      considerations: 'Considerations',
      selectThis: 'Select This Car',
      listenToDetails: 'Listen to details',
      stopSpeaking: 'Stop speaking',
    },
    es: {
      aiTitle: 'Asistente de Autos AI',
      tellUs: 'Díganos qué necesita',
      placeholder: 'ej., "Necesito un auto familiar para 5 personas para un viaje a la playa"',
      getRecommendations: 'Obtener Recomendaciones AI',
      listening: 'Escuchando',
      clickToSpeak: 'Haga clic para hablar',
      stopRecording: 'Detener grabación',
      loading: 'Obteniendo recomendaciones',
      topPick: 'Mejor Opción',
      pros: 'Ventajas',
      considerations: 'Consideraciones',
      selectThis: 'Seleccionar Este Auto',
      listenToDetails: 'Escuchar detalles',
      stopSpeaking: 'Detener audio',
    },
    pt: {
      aiTitle: 'Assistente de Carros AI',
      tellUs: 'Diga-nos o que você precisa',
      placeholder: 'ex., "Preciso de um carro familiar para 5 pessoas para uma viagem à praia"',
      getRecommendations: 'Obter Recomendações AI',
      listening: 'Ouvindo',
      clickToSpeak: 'Clique para falar',
      stopRecording: 'Parar gravação',
      loading: 'Obtendo recomendações',
      topPick: 'Melhor Escolha',
      pros: 'Vantagens',
      considerations: 'Considerações',
      selectThis: 'Selecionar Este Carro',
      listenToDetails: 'Ouvir detalhes',
      stopSpeaking: 'Parar áudio',
    },
    fr: {
      aiTitle: 'Assistant Voiture AI',
      tellUs: 'Dites-nous ce dont vous avez besoin',
      placeholder: 'ex., "J\'ai besoin d\'une voiture familiale pour 5 personnes pour un voyage à la plage"',
      getRecommendations: 'Obtenir Recommandations AI',
      listening: 'À l\'écoute',
      clickToSpeak: 'Cliquez pour parler',
      stopRecording: 'Arrêter l\'enregistrement',
      loading: 'Obtention des recommandations',
      topPick: 'Meilleur Choix',
      pros: 'Avantages',
      considerations: 'Considérations',
      selectThis: 'Sélectionner Cette Voiture',
      listenToDetails: 'Écouter les détails',
      stopSpeaking: 'Arrêter l\'audio',
    },
    de: {
      aiTitle: 'AI Auto-Assistent',
      tellUs: 'Sagen Sie uns, was Sie brauchen',
      placeholder: 'z.B., "Ich brauche ein Familienauto für 5 Personen für eine Strandreise"',
      getRecommendations: 'AI-Empfehlungen Abrufen',
      listening: 'Hört zu',
      clickToSpeak: 'Zum Sprechen klicken',
      stopRecording: 'Aufnahme stoppen',
      loading: 'Empfehlungen werden abgerufen',
      topPick: 'Beste Wahl',
      pros: 'Vorteile',
      considerations: 'Überlegungen',
      selectThis: 'Dieses Auto Wählen',
      listenToDetails: 'Details anhören',
      stopSpeaking: 'Audio stoppen',
    },
  };

  const txt = translations[i18n.language] || translations.en;

  if (!showAI) {
    return (
      <button
        onClick={() => setShowAI(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center gap-2 z-50"
      >
        <Sparkles className="h-5 w-5" />
        <span className="font-semibold">{txt.aiTitle}</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-t-2xl flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-white" />
            <h2 className="text-2xl font-bold text-white">{txt.aiTitle}</h2>
          </div>
          <button
            onClick={() => {
              setShowAI(false);
              stopSpeaking();
            }}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {!recommendations ? (
            <div className="space-y-6">
              <div>
                <label className="block text-lg font-semibold text-gray-900 mb-3">
                  {txt.tellUs}
                </label>
                <div className="relative">
                  <textarea
                    value={requirements}
                    onChange={(e) => setRequirements(e.target.value)}
                    className="w-full p-4 pr-14 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    rows={4}
                    placeholder={txt.placeholder}
                  />

                  {speechInputSupported && (
                    <button
                      type="button"
                      onClick={handleVoiceInput}
                      className={`absolute right-3 top-3 p-3 rounded-lg transition-all ${
                        isListening
                          ? 'bg-red-500 text-white animate-pulse shadow-lg'
                          : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                      }`}
                      title={isListening ? txt.stopRecording : txt.clickToSpeak}
                    >
                      <Mic className="h-6 w-6" />
                    </button>
                  )}
                </div>

                {isListening && (
                  <div className="mt-3 flex items-center text-blue-600 font-medium">
                    <div className="animate-pulse mr-2">🎤</div>
                    {txt.listening}...
                  </div>
                )}
              </div>

              <button
                onClick={getAIRecommendations}
                disabled={isLoadingAI || !requirements.trim()}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl hover:shadow-lg transition-all font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoadingAI ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    {txt.loading}...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    {txt.getRecommendations}
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl border-2 border-blue-200">
                <div className="flex justify-between items-start gap-4">
                  <p className="text-lg leading-relaxed text-gray-800 flex-1">
                    {recommendations.summary}
                  </p>

                  {speechOutputSupported && (
                    <button
                      onClick={() =>
                        (isSpeaking ? stopSpeaking() : speak(recommendations.summary))
                      }
                      className={`flex-shrink-0 p-3 rounded-lg transition-all ${
                        isSpeaking
                          ? 'bg-red-500 text-white animate-pulse'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                      title={isSpeaking ? txt.stopSpeaking : txt.listenToDetails}
                    >
                      <Volume2 className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>

              {recommendations.recommendations?.map((rec, idx) => {
                const vehicle = availableVehicles.find(
                  (v) => (v.vehicle_id || v.id) === rec.vehicleId
                );

                if (!vehicle) return null;

                const makeUpper = (vehicle.make || '').toUpperCase();
                const modelUpper = (vehicle.model || '').toUpperCase().replace(/\s+/g, '_');
                const img = `/models/${makeUpper}_${modelUpper}.png`;

                return (
                  <div
                    key={idx}
                    className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex flex-col lg:flex-row gap-6">
                      <div className="lg:w-1/3">
                        <img
                          src={img}
                          alt={`${vehicle.make} ${vehicle.model}`}
                          className="w-full h-48 object-cover rounded-lg"
                          onError={(e) => {
                            if (!e.target.src.includes('/economy.jpg')) {
                              e.target.src = '/economy.jpg';
                            }
                          }}
                        />
                        {idx === 0 && (
                          <div className="mt-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-lg font-bold text-center flex items-center justify-center gap-2">
                            <span>⭐</span> {txt.topPick}
                          </div>
                        )}
                      </div>

                      <div className="lg:w-2/3 space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-2xl font-bold text-gray-900">
                              #{rec.rank} - {rec.make} {rec.model}
                            </h3>
                            <div className="mt-2 flex items-center gap-3">
                              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                                Match: {rec.matchScore}%
                              </span>
                              <span className="text-2xl font-bold text-blue-600">
                                {formatPrice(rec.totalCost || vehicle.daily_rate)}
                              </span>
                            </div>
                          </div>

                          {speechOutputSupported && (
                            <button
                              onClick={() => speak(rec.reasoning)}
                              className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                              title={txt.listenToDetails}
                            >
                              <Volume2 className="h-5 w-5" />
                            </button>
                          )}
                        </div>

                        <p className="text-gray-700 leading-relaxed">{rec.reasoning}</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-green-50 p-4 rounded-lg">
                            <h4 className="font-bold text-green-800 mb-2 flex items-center gap-2">
                              <span>✓</span> {txt.pros}
                            </h4>
                            <ul className="space-y-1 text-sm text-green-700">
                              {rec.pros?.map((pro, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="mt-1">•</span>
                                  <span>{pro}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="bg-orange-50 p-4 rounded-lg">
                            <h4 className="font-bold text-orange-800 mb-2 flex items-center gap-2">
                              <span>⚠</span> {txt.considerations}
                            </h4>
                            <ul className="space-y-1 text-sm text-orange-700">
                              {rec.cons?.map((con, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="mt-1">•</span>
                                  <span>{con}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            onSelectVehicle(vehicle);
                            setShowAI(false);
                          }}
                          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                        >
                          {txt.selectThis}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              <button
                onClick={() => {
                  setRecommendations(null);
                  setRequirements('');
                }}
                className="w-full bg-gray-200 text-gray-800 py-3 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
              >
                {t('common.back')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AICarRecommendations;

