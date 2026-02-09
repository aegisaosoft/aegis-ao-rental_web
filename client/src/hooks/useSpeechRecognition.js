import { useState, useEffect, useMemo } from 'react';

export const useSpeechRecognition = (language = 'en') => {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);

  const languageMap = useMemo(
    () => ({
      en: 'en-US',
      es: 'es-ES',
      pt: 'pt-BR',
      fr: 'fr-FR',
      de: 'de-DE',
    }),
    []
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognitionInstance = new SpeechRecognition();
        recognitionInstance.continuous = false;
        recognitionInstance.interimResults = true;
        recognitionInstance.lang = languageMap[language] || 'en-US';

        recognitionInstance.onresult = (event) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i += 1) {
            const transcriptPiece = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += `${transcriptPiece} `;
            } else {
              interimTranscript += transcriptPiece;
            }
          }

          setTranscript(finalTranscript || interimTranscript);
        };

        recognitionInstance.onend = () => {
          setIsListening(false);
        };

        recognitionInstance.onerror = (event) => {
          setIsListening(false);
        };

        setRecognition(recognitionInstance);
      }
    }
  }, [language, languageMap]);

  const startListening = () => {
    if (recognition) {
      setTranscript('');
      recognition.lang = languageMap[language] || 'en-US';
      recognition.start();
      setIsListening(true);
    }
  };

  const stopListening = () => {
    if (recognition) {
      recognition.stop();
      setIsListening(false);
    }
  };

  const resetTranscript = () => {
    setTranscript('');
  };

  return {
    transcript,
    isListening,
    startListening,
    stopListening,
    resetTranscript,
    isSupported: !!recognition,
  };
};
