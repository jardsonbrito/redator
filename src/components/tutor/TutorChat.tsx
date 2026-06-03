import { useState, useRef, useEffect } from 'react';
import { BookOpen } from 'lucide-react';
import { TutorMessage, TutorThinkingIndicator } from './TutorMessage';
import { TutorInput } from './TutorInput';
import { TutorEmptyState } from './TutorEmptyState';
import { useTutorChat } from '@/hooks/useTutorChat';

interface TutorChatProps {
  alunoEmail:            string;
  conversationId:        string | null;
  onConversationCreated: (id: string) => void;
  onCreditosUpdate?:     (creditos: number) => void;
  subtabId?:             string | null;
  subtabLabel?:          string | null;
}

export function TutorChat({
  alunoEmail,
  conversationId,
  onConversationCreated,
  onCreditosUpdate,
  subtabId,
  subtabLabel,
}: TutorChatProps) {
  const [inputValue, setInputValue]     = useState('');
  const [sinteseGerada, setSinteseGerada] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { mensagens, isLoading, enviar, gerarSintese, creditosRestantes } = useTutorChat(
    alunoEmail,
    conversationId,
    (novoId) => { onConversationCreated(novoId); },
    subtabId,
  );

  useEffect(() => {
    setInputValue('');
    setSinteseGerada(false);
  }, [conversationId]);

  const handleGerarSintese = async () => {
    await gerarSintese();
    setSinteseGerada(true);
  };

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

  const handleQuickAction = async (label: string, instrucao: string) => {
    if (!label.trim() || isLoading) return;
    // label = mensagem visível no chat; instrucao = prompt técnico enviado à IA
    await enviar(label.trim(), instrucao.trim() || undefined);
  };

  const semMensagens = mensagens.length === 0 && !isLoading;

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-slate-50">
      {/* Área de mensagens com scroll */}
      <div className="flex-1 overflow-y-auto">
        {semMensagens ? (
          <TutorEmptyState
            onQuickAction={handleQuickAction}
            subtabLabel={subtabLabel}
          />
        ) : (
          <div className="py-6">
            {mensagens.map((msg, idx) => {
              const isSintese = sinteseGerada && idx === mensagens.length - 1 && msg.role === 'assistant';
              return (
                <div key={msg.id}>
                  {isSintese && (
                    <div className="mx-6 mb-3 rounded-2xl border border-purple-100 bg-purple-50/60 px-5 py-3.5 flex items-start gap-3">
                      <BookOpen className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-slate-700 leading-relaxed">
                        Se desejar, compartilhe este relatório com seu professor para que ele acompanhe seu progresso e possa orientá-lo de forma ainda mais precisa.
                      </p>
                    </div>
                  )}
                  <TutorMessage mensagem={msg} isSintese={isSintese} />
                </div>
              );
            })}
            {isLoading && <TutorThinkingIndicator />}
            <div ref={bottomRef} />
          </div>
        )}
        {!semMensagens && <div ref={bottomRef} />}
      </div>

      {/* Botão encerrar sessão — aparece quando há mensagens e síntese ainda não foi gerada */}
      {!semMensagens && !sinteseGerada && !isLoading && (
        <div className="px-5 pb-2 flex justify-center">
          <button
            onClick={handleGerarSintese}
            className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-purple-700 border border-slate-200 hover:border-purple-200 rounded-full px-4 py-1.5 transition-colors bg-white shadow-sm"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Encerrar sessão e gerar síntese
          </button>
        </div>
      )}

      {/* Campo de input fixo no rodapé */}
      <TutorInput
        value={inputValue}
        onChange={setInputValue}
        onSend={handleSend}
        isLoading={isLoading}
        disabled={sinteseGerada}
      />
    </div>
  );
}
