import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Sparkles, Mic, Volume2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCompany } from '../context/CompanyContext';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import './AICarAssistant.css';

const DEFAULT_MODE = 'claude';
const normalizeMode = (value) => {
  if (!value) return DEFAULT_MODE;
  const normalized = value.toString().trim().toLowerCase();
  return ['free', 'claude', 'premium'].includes(normalized) ? normalized : DEFAULT_MODE;
};

const normalizeVehiclePayload = (vehicle) => {
  if (!vehicle) return null;
  const id =
    vehicle.vehicle_id ||
    vehicle.vehicleId ||
    vehicle.id ||
    vehicle.Id ||
    vehicle.VehicleId ||
    vehicle.VehicleID ||
    vehicle.key ||
    null;

  return {
    id: id ?? undefined,
    make: vehicle.make || vehicle.Make || '',
    model: vehicle.model || vehicle.Model || '',
    year:
      vehicle.year ||
      vehicle.Year ||
      vehicle.modelYear ||
      (Array.isArray(vehicle.years) ? vehicle.years[0] : undefined) ||
      null,
    dailyRate:
      vehicle.daily_rate ??
      vehicle.dailyRate ??
      vehicle.DailyRate ??
      vehicle.Daily_Rate ??
      null,
    seats: vehicle.seats ?? vehicle.Seats ?? null,
    type: vehicle.type || vehicle.Type || '',
    transmission: vehicle.transmission || vehicle.Transmission || '',
    fuelType: vehicle.fuel_type || vehicle.fuelType || vehicle.FuelType || '',
    features: Array.isArray(vehicle.features)
      ? vehicle.features
      : Array.isArray(vehicle.Features)
      ? vehicle.Features
      : [],
  };
};

const sanitizeForDebug = (value) => {
  if (!value || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeForDebug);
  }

  return Object.entries(value).reduce((acc, [key, val]) => {
    if (key === 'key' || key === 'account') {
      return acc;
    }
    acc[key] = sanitizeForDebug(val);
    return acc;
  }, {});
};

const AICarAssistant = ({ availableVehicles = [], onSelectVehicle }) => {
  const { t, i18n } = useTranslation();
  const { formatPrice, aiIntegration } = useCompany();

  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [summary, setSummary] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);

  const normalizedVehicles = useMemo(
    () =>
      (availableVehicles || [])
        .map(normalizeVehiclePayload)
        .filter((item) => item !== null),
    [availableVehicles]
  );
  const mode = useMemo(() => normalizeMode(aiIntegration), [aiIntegration]);

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
      setInputValue(transcript);
    }
  }, [transcript]);

  const toggleAssistant = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev;
      if (!next) {
        stopSpeaking();
      }
      return next;
    });
  }, [stopSpeaking]);

  const handleVoiceInput = () => {
    if (!speechInputSupported) {
      alert(t('ai.voiceInputNotSupported', 'Speech recognition is not supported in this browser.'));
      return;
    }

    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      startListening();
    }
  };

  const handleGetRecommendations = async () => {
    if (!inputValue.trim()) {
      alert(t('ai.enterRequirements', 'Please describe what you need.'));
      return;
    }

    if (!normalizedVehicles.length) {
      alert(t('ai.noVehiclesAvailable', 'No vehicles available for recommendations.'));
      return;
    }

    setLoading(true);
    setSummary('');
    setRecommendations([]);

    try {
      console.log('🚀 Sending request with:', {
        requirements: inputValue,
        language: i18n.language,
        vehicleCount: normalizedVehicles.length,
        mode,
      });

      const response = await fetch('/api/recommendations/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requirements: inputValue,
          language: i18n.language,
          availableVehicles: normalizedVehicles,
          mode,
        }),
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', [...response.headers.entries()]);

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('❌ Error response:', errorBody);
        throw new Error(errorBody || `AI request failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Full response data:', sanitizeForDebug(data));

      const actualData = data.result || data;
      console.log('📝 Summary:', actualData.summary);
      console.log('🚗 Recommendations:', sanitizeForDebug(actualData.recommendations));

      setSummary(actualData.summary || '');
      setRecommendations(Array.isArray(actualData.recommendations) ? actualData.recommendations : []);

      if (speechOutputSupported && (actualData.summary || '').trim()) {
        speak(actualData.summary.trim());
      }
    } catch (error) {
      console.error('[AICarAssistant] Failed to fetch recommendations:', error);
      alert(t('ai.genericError', 'Unable to fetch recommendations at this time.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVehicle = (vehicleId) => {
    if (!onSelectVehicle) return;
    const match = availableVehicles.find((vehicle) => {
      const id =
        vehicle.vehicle_id ||
        vehicle.vehicleId ||
        vehicle.id ||
        vehicle.Id ||
        vehicle.VehicleId ||
        vehicle.VehicleID;
      return id?.toString() === vehicleId?.toString();
    });

    if (match) {
      onSelectVehicle(match);
      setIsOpen(false);
      stopSpeaking();
    }
  };

  return (
    <>
      <button
        type="button"
        className="ai-assistant-launcher"
        onClick={toggleAssistant}
      >
        <Sparkles className="h-5 w-5" />
        <span>{t('ai.assistantLaunch', 'AI Chat')}</span>
      </button>

      {isOpen && (
        <div className="ai-assistant-overlay">
          <div className="ai-assistant-wrapper">
            <button
              type="button"
              className="ai-assistant-close"
              onClick={toggleAssistant}
            >
              ×
            </button>

            <div className="ai-assistant-container">
              <div className="ai-header">
                <Sparkles className="w-8 h-8 text-indigo-600" />
                <h2 className="ai-title">{t('ai.assistantTitle', 'AI Chat')}</h2>
              </div>

              <div className="input-section">
                <label className="input-label">
                  {t('ai.tellUs', 'Tell us what you need')}
                </label>
                <div className="input-container">
                  <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={t(
                      'ai.placeholder',
                      'e.g., "I need a family car for 5 people for a beach trip"'
                    )}
                    rows={4}
                    className="input-textarea"
                  />
                  {speechInputSupported && (
                    <button
                      type="button"
                      className={`mic-button ${isListening ? 'listening' : ''}`}
                      onClick={handleVoiceInput}
                      disabled={loading}
                      title={isListening ? t('ai.stopRecording', 'Stop recording') : t('ai.clickToSpeak', 'Click to speak')}
                    >
                      <Mic className="w-5 h-5" />
                    </button>
                  )}
                </div>
                {isListening && (
                  <div className="ai-status-text">
                    🎤 {t('ai.listening', 'Listening...')}
                  </div>
                )}
              </div>

              <button
                type="button"
                className="get-recommendations-btn"
                onClick={handleGetRecommendations}
                disabled={loading || !inputValue.trim()}
              >
                {loading ? (
                  <>
                    <div className="spinner" />
                    {t('ai.thinking', 'Thinking...')}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    {t('ai.getRecommendations', 'Get AI Recommendations')}
                  </>
                )}
              </button>

              {(summary || recommendations.length > 0) && (
                <div className="recommendations-box">
                  <div className="recommendations-header">
                    <h3>{t('ai.recommendationsTitle', 'AI Recommendations')}</h3>
                    {speechOutputSupported && summary && (
                      <button
                        type="button"
                        className="play-audio-btn"
                        onClick={() => (isSpeaking ? stopSpeaking() : speak(summary))}
                        title={isSpeaking ? t('ai.stopSpeaking', 'Stop speaking') : t('ai.listenToDetails', 'Listen to details')}
                      >
                        <Volume2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  {summary && <p className="ai-summary-text">{summary}</p>}

                  <div className="ai-recommendations-grid">
                    {recommendations.map((rec, idx) => (
                      <div key={`${rec.vehicleId || idx}`} className="ai-recommendation-card">
                        <div className="ai-recommendation-header">
                          <span className="ai-chip">#{rec.rank || idx + 1}</span>
                          {rec.matchScore !== undefined && (
                            <span className="ai-chip success">
                              {t('ai.matchScore', 'Match')}: {rec.matchScore}%
                            </span>
                          )}
                        </div>
                        <h4 className="ai-recommendation-title">
                          {(rec.make || '') + ' ' + (rec.model || '')}
                        </h4>
                        {rec.totalCost !== undefined && rec.totalCost !== null && (
                          <div className="ai-recommendation-price">
                            {formatPrice(rec.totalCost)}
                          </div>
                        )}
                        {rec.reasoning && <p className="ai-recommendation-text">{rec.reasoning}</p>}

                        <div className="ai-attributes">
                          {Array.isArray(rec.pros) && rec.pros.length > 0 && (
                            <div className="ai-attribute-group">
                              <div className="ai-attribute-title">{t('ai.pros', 'Pros')}</div>
                              <ul>
                                {rec.pros.map((item, i) => (
                                  <li key={`pros-${idx}-${i}`}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {Array.isArray(rec.cons) && rec.cons.length > 0 && (
                            <div className="ai-attribute-group warning">
                              <div className="ai-attribute-title">{t('ai.considerations', 'Considerations')}</div>
                              <ul>
                                {rec.cons.map((item, i) => (
                                  <li key={`cons-${idx}-${i}`}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {onSelectVehicle && (rec.vehicleId || rec.vehicle_id) && (
                          <button
                            type="button"
                            className="ai-select-btn"
                            onClick={() => handleSelectVehicle(rec.vehicleId || rec.vehicle_id)}
                          >
                            {t('ai.selectThis', 'Select This Car')}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AICarAssistant;
