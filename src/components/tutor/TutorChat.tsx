import { useState, useRef, useEffect } from 'react';
import { BookOpen } from 'lucide-react';
import { TutorMessage, TutorThinkingIndicator } from './TutorMessage';
import { TutorInput } from './TutorInput';
import { TutorEmptyState } from './TutorEmptyState';
import { useTutorChat } from '@/hooks/useTutorChat';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface TutorChatProps {
  alunoEmail:            string;
  conversationId:        string | null;
  onConversationCreated: (id: string) => void;
  onCreditosUpdate?:     (creditos: number) => void;
  onAtalhoUsado?:        () => void;
  subtabId?:             string | null;
  subtabLabel?:          string | null;
  atalhoContadores?:     Record<string, number>;
}

export function TutorChat({
  alunoEmail,
  conversationId,
  onConversationCreated,
  onCreditosUpdate,
  onAtalhoUsado,
  subtabId,
  subtabLabel,
  atalhoContadores = {},
}: TutorChatProps) {
  const [inputValue, setInputValue]         = useState('');
  const [sinteseGerada, setSinteseGerada]   = useState(false);
  const [showConfirmSintese, setShowConfirmSintese] = useState(false);
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
    // Confirma para o aluno que a sessão foi registrada
    window.dispatchEvent(new CustomEvent('jarvis-sessao-registrada'));
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

  const handleQuickAction = async (label: string, instrucao: string, atalhoId?: string) => {
    if (!label.trim() || isLoading) return;
    await enviar(label.trim(), instrucao.trim() || undefined, atalhoId ?? null);
    if (atalhoId) onAtalhoUsado?.();
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
            atalhoContadores={atalhoContadores}
          />
        ) : (
          <div className="py-6">
            {mensagens.map((msg, idx) => {
              const isSintese = msg.role === 'assistant' &&
                (msg.conteudo.includes('Síntese da Sessão de Tutoria') ||
                 (sinteseGerada && idx === mensagens.length - 1));
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
        <div className="px-5 pb-3 flex justify-center">
          <button
            onClick={() => setShowConfirmSintese(true)}
            className="flex items-center gap-2 text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 rounded-full px-5 py-2 transition-all shadow-md hover:shadow-purple-200 hover:shadow-lg active:scale-95"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Encerrar sessão e gerar síntese
          </button>
        </div>
      )}

      <AlertDialog open={showConfirmSintese} onOpenChange={setShowConfirmSintese}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar sessão?</AlertDialogTitle>
            <AlertDialogDescription>
              Após confirmar, a conversa será encerrada e a síntese gerada. Não será possível enviar novas mensagens nesta sessão.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowConfirmSintese(false);
                setTimeout(() => handleGerarSintese(), 100);
              }}
              className="bg-purple-700 hover:bg-purple-800"
            >
              Sim, encerrar sessão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
