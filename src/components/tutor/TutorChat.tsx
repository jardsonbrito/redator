import { useState, useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TutorMessage, TutorThinkingIndicator } from './TutorMessage';
import { TutorInput } from './TutorInput';
import { TutorEmptyState } from './TutorEmptyState';
import { useTutorChat } from '@/hooks/useTutorChat';

interface TutorChatProps {
  alunoEmail:            string;
  conversationId:        string | null;
  onConversationCreated: (id: string) => void;
}

export function TutorChat({ alunoEmail, conversationId, onConversationCreated }: TutorChatProps) {
  const [inputValue, setInputValue] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const { mensagens, isLoading, enviar, creditosRestantes } = useTutorChat(
    alunoEmail,
    conversationId,
    (novoId) => {
      onConversationCreated(novoId);
    },
  );

  // Scroll automático para última mensagem
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
    <div className="flex flex-col flex-1 overflow-hidden bg-gray-50">
      {/* Barra superior com saldo de créditos */}
      <div className="flex items-center justify-end px-4 py-2 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-indigo-600">{creditosRestantes}</span>
          <div className="leading-tight">
            <p className="text-xs font-medium text-gray-700">Seus créditos</p>
            <p className="text-[10px] text-gray-400">Compartilhados com o Jarvis</p>
          </div>
        </div>
      </div>

      {/* Área de mensagens */}
      <div className="flex-1 overflow-y-auto">
        {semMensagens ? (
          <TutorEmptyState onQuickAction={handleQuickAction} />
        ) : (
          <div className="py-4">
            {mensagens.map(msg => (
              <TutorMessage key={msg.id} mensagem={msg} />
            ))}
            {isLoading && <TutorThinkingIndicator />}
            <div ref={bottomRef} />
          </div>
        )}

        {/* Mantém o scroll quando há mensagens mas loading ainda não apareceu */}
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
