import { useState, useRef, useEffect } from 'react';
import { BookOpen, AlertTriangle, Star } from 'lucide-react';
import { TutorMessage, TutorThinkingIndicator } from './TutorMessage';
import { TutorInput } from './TutorInput';
import { TutorEmptyState } from './TutorEmptyState';
import { useTutorChat } from '@/hooks/useTutorChat';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

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
  const [inputValue, setInputValue]                   = useState('');
  const [sinteseGerada, setSinteseGerada]             = useState(false);
  const [showConfirmSintese, setShowConfirmSintese]   = useState(false);
  const [avaliacao, setAvaliacao]                     = useState<number | null>(null);
  const [hoveredStar, setHoveredStar]                 = useState(0);
  const [showBugReport, setShowBugReport]             = useState(false);
  const [bugText, setBugText]                         = useState('');
  const [bugEnviando, setBugEnviando]                 = useState(false);
  const [bugEnviado, setBugEnviado]                   = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const {
    mensagens, isLoading, enviar, gerarSintese,
    avaliarSessao, reportarBug, sessaoId,
    creditosRestantes,
  } = useTutorChat(
    alunoEmail,
    conversationId,
    (novoId) => { onConversationCreated(novoId); },
    subtabId,
  );

  useEffect(() => {
    setInputValue('');
    setSinteseGerada(false);
    setAvaliacao(null);
    setBugEnviado(false);
  }, [conversationId]);

  const handleGerarSintese = async () => {
    await gerarSintese();
    setSinteseGerada(true);
    window.dispatchEvent(new CustomEvent('jarvis-sessao-registrada'));
  };

  const handleAvaliar = async (nota: number) => {
    if (avaliacao || !sessaoId) return;
    setAvaliacao(nota);
    await avaliarSessao(sessaoId, nota);
  };

  const handleEnviarBug = async () => {
    if (!bugText.trim()) return;
    setBugEnviando(true);
    await reportarBug(bugText);
    setBugEnviando(false);
    setBugEnviado(true);
    setBugText('');
    setTimeout(() => setShowBugReport(false), 1500);
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

      {/* Botão encerrar sessão */}
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

      {/* Avaliação por estrelas — aparece após a síntese */}
      {sinteseGerada && sessaoId && (
        <div className="px-5 py-3 border-t border-slate-100 flex flex-col items-center gap-1.5">
          {!avaliacao ? (
            <>
              <p className="text-xs text-slate-400">Como foi esta sessão?</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => handleAvaliar(star)}
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(0)}
                    className="transition-transform hover:scale-125 active:scale-110"
                  >
                    <Star
                      className={cn(
                        'w-6 h-6 transition-colors',
                        star <= (hoveredStar || 0)
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-slate-200 text-slate-200'
                      )}
                    />
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star
                    key={star}
                    className={cn(
                      'w-5 h-5',
                      star <= avaliacao
                        ? 'fill-amber-400 text-amber-400'
                        : 'fill-slate-200 text-slate-200'
                    )}
                  />
                ))}
              </div>
              <span className="text-xs text-slate-400">Obrigado pela avaliação!</span>
            </div>
          )}
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

      {/* Link reportar problema */}
      <div className="pb-2 flex justify-center">
        <button
          onClick={() => { setBugEnviado(false); setShowBugReport(true); }}
          className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-slate-500 transition-colors"
        >
          <AlertTriangle className="w-3 h-3" />
          Reportar problema
        </button>
      </div>

      {/* Dialogs */}
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

      <Dialog open={showBugReport} onOpenChange={setShowBugReport}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Reportar um problema
            </DialogTitle>
          </DialogHeader>
          {bugEnviado ? (
            <p className="text-sm text-green-600 text-center py-4">Relatório enviado! Obrigado.</p>
          ) : (
            <>
              <textarea
                value={bugText}
                onChange={e => setBugText(e.target.value)}
                placeholder="Descreva o problema que você encontrou..."
                rows={4}
                className="w-full text-sm text-slate-700 border border-slate-200 rounded-lg px-3 py-2.5 resize-none outline-none focus:ring-1 focus:ring-purple-300 focus:border-purple-300 placeholder-slate-400"
              />
              <DialogFooter>
                <button
                  onClick={() => setShowBugReport(false)}
                  className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEnviarBug}
                  disabled={!bugText.trim() || bugEnviando}
                  className="text-sm font-medium text-white bg-purple-700 hover:bg-purple-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-4 py-2 transition-colors"
                >
                  {bugEnviando ? 'Enviando...' : 'Enviar'}
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
