import { useState, useEffect, useRef, useCallback } from 'react';

interface UseVoiceTranscriptionReturn {
  isRecording: boolean;
  isSupported: boolean;
  toggleRecording: () => void;
  stopRecording: () => void;
}

export const useVoiceTranscription = (
  onTranscript: (texto: string) => void,
  currentText: string
): UseVoiceTranscriptionReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<any>(null);
  // Texto confirmado (final) acumulado desde o início da gravação
  const baseTextRef = useRef<string>('');
  // Ref sincronizada com currentText para capturar snapshot no momento de start
  const currentTextRef = useRef<string>(currentText);

  useEffect(() => {
    currentTextRef.current = currentText;
  }, [currentText]);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SR);
  }, []);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const startRecording = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    // Captura o texto atual como base — tudo que vier de voz será concatenado
    baseTextRef.current = currentTextRef.current;

    const recognition = new SR();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        // Commita o trecho final na base
        const base = baseTextRef.current;
        const sep = base && !base.endsWith(' ') ? ' ' : '';
        baseTextRef.current = base + sep + finalTranscript.trim();
        onTranscript(baseTextRef.current);
      } else if (interimTranscript) {
        // Mostra ao vivo sem commitar na base
        const base = baseTextRef.current;
        const sep = base && !base.endsWith(' ') ? ' ' : '';
        onTranscript(base + sep + interimTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('Erro no reconhecimento de voz:', event.error);
      setIsRecording(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      setIsRecording(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, [onTranscript]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // Limpa ao desmontar
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  return { isRecording, isSupported, toggleRecording, stopRecording };
};
