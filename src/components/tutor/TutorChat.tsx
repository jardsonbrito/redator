import { useState, useRef, useEffect } from 'react';
import { TutorMessage, TutorThinkingIndicator } from './TutorMessage';
import { TutorInput } from './TutorInput';
import { TutorEmptyState } from './TutorEmptyState';
import { useTutorChat } from '@/hooks/useTutorChat';

interface TutorChatProps {
  alunoEmail:            string;
  conversationId:        string | null;
  onConversationCreated: (id: string) => void;
  onCreditosUpdate?:     (creditos: number) => void;
}

export function TutorChat({
  alunoEmail,
  conversationId,
  onConversationCreated,
  onCreditosUpdate,
}: TutorChatProps) {
  const [inputValue, setInputValue] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const { mensagens, isLoading, enviar, creditosRestantes } = useTutorChat(
    alunoEmail,
    conversationId,
    (novoId) => { onConversationCreated(novoId); },
  );

  useEffect(() => {
    onCreditosUpdate?.(creditosRestantes);
  }, [creditosRestantes]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens, isLoading]);

  const handleSend = async () => {
    const texto = inputValue.trim();
    if (!texto) return;
    setInputValue('');
    await enviar(texto);
  };

  const handleQuickAction = (texto: string) => {
    setInputValue(texto);
  };

  const semMensagens = mensagens.length === 0 && !isLoading;

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-slate-50">
      {/* Área de mensagens com scroll */}
      <div className="flex-1 overflow-y-auto">
        {semMensagens ? (
          <TutorEmptyState onQuickAction={handleQuickAction} />
        ) : (
          <div className="py-6">
            {mensagens.map(msg => (
              <TutorMessage key={msg.id} mensagem={msg} />
            ))}
            {isLoading && <TutorThinkingIndicator />}
            <div ref={bottomRef} />
          </div>
        )}
        {!semMensagens && <div ref={bottomRef} />}
      </div>

      {/* Campo de input fixo no rodapé */}
      <TutorInput
        value={inputValue}
        onChange={setInputValue}
        onSend={handleSend}
        isLoading={isLoading}
      />
    </div>
  );
}
