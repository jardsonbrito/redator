import { useState, useEffect, useRef, useCallback } from 'react';

interface UseVoiceTranscriptionReturn {
  isRecording: boolean;
  isSupported: boolean;
  toggleRecording: () => void;
  stopRecording: () => void;
}

export const useVoiceTranscription = (
  onTranscript: (texto: string) => void,
  currentText: string,
  textareaRef?: React.RefObject<HTMLTextAreaElement>
): UseVoiceTranscriptionReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<any>(null);
  const currentTextRef = useRef<string>(currentText);

  // Partes do texto capturadas no momento de iniciar a gravação
  const beforeCursorRef = useRef<string>('');
  const afterCursorRef = useRef<string>('');
  // Texto ditado confirmado (finais) acumulado na sessão atual
  const accumulatedRef = useRef<string>('');

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

    // Captura posição do cursor para inserir no lugar certo
    const text = currentTextRef.current;
    let cursorStart = text.length;
    let cursorEnd = text.length;
    if (textareaRef?.current) {
      cursorStart = textareaRef.current.selectionStart ?? text.length;
      cursorEnd = textareaRef.current.selectionEnd ?? text.length;
    }
    beforeCursorRef.current = text.slice(0, cursorStart);
    afterCursorRef.current = text.slice(cursorEnd);
    accumulatedRef.current = '';

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

      const before = beforeCursorRef.current;
      const after = afterCursorRef.current;
      const sepBefore = before && !before.endsWith(' ') ? ' ' : '';
      const sepAfter = after && !after.startsWith(' ') ? ' ' : '';

      if (finalTranscript) {
        const trimmed = finalTranscript.trim();
        const prev = accumulatedRef.current;
        // Capitaliza primeira letra quando campo estava vazio ao iniciar a gravação
        const shouldCapitalize = !prev && !before.trim();
        const processed = shouldCapitalize
          ? trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
          : trimmed;
        accumulatedRef.current = prev ? prev + ' ' + processed : processed;
        onTranscript(before + sepBefore + accumulatedRef.current + sepAfter + after);
      } else if (interimTranscript) {
        const prev = accumulatedRef.current;
        const combined = prev ? prev + ' ' + interimTranscript : interimTranscript;
        onTranscript(before + sepBefore + combined + sepAfter + after);
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
  }, [onTranscript, textareaRef]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  return { isRecording, isSupported, toggleRecording, stopRecording };
};
