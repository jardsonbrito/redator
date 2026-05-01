import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart2, CheckCircle2, ClipboardList, Trash2 } from 'lucide-react';
import { StudentHeader } from '@/components/StudentHeader';
import { TooltipProvider } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useInteracoesAtivas,
  useMinhasRespostas,
  useResponderInteracao,
  useRemoverRespostaAluno,
  useResultadoInteracao,
  statusInteracao,
} from '@/hooks/useInteratividade';

const InteratividadeResposta = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: interacoes = [], isLoading } = useInteracoesAtivas();
  const interacao = interacoes.find(i => i.id === id);

  const { data: minhasRespostas = [], isLoading: loadingResposta } = useMinhasRespostas(id ? [id] : []);
  const minhaResposta = minhasRespostas.find(r => r.interacao_id === id);

  const jaRespondeu = !!minhaResposta;
  const status = interacao ? statusInteracao(interacao, jaRespondeu) : 'aberta';
  const encerrada = status === 'encerrada';

  const { data: resultado } = useResultadoInteracao(
    interacao?.mostrar_resultado_aluno && (jaRespondeu || encerrada) ? id! : ''
  );

  const responderMutation = useResponderInteracao();
  const removerMutation = useRemoverRespostaAluno();
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [textoAberto, setTextoAberto] = useState('');
  const [confirmRemover, setConfirmRemover] = useState(false);

  const alternativas = useMemo(
    () => [...(interacao?.alternativas ?? [])].sort((a, b) => a.ordem - b.ordem),
    [interacao]
  );

  const tipoResposta = interacao?.tipo_resposta ?? 'alternativas';
  const isAberta = tipoResposta === 'aberta';
  const isComAberta = tipoResposta === 'alternativas_com_aberta';

  // Campo de texto visível para 'aberta' (obrigatório) e 'alternativas_com_aberta' (opcional)
  const mostraTextoAberto = isAberta || isComAberta;

  const podeEnviar = useMemo(() => {
    if (jaRespondeu || encerrada) return false;
    if (isAberta) return textoAberto.trim().length > 0;
    if (selecionada === null) return false;
    return true; // para alternativas_com_aberta o texto é opcional
  }, [jaRespondeu, encerrada, isAberta, selecionada, textoAberto]);

  const handleResponder = async () => {
    if (!id || !podeEnviar) return;
    try {
      await responderMutation.mutateAsync({
        interacao_id: id,
        alternativa_id: isAberta ? null : selecionada,
        resposta_texto: textoAberto.trim() || null,
      });
      toast.success('Participação registrada!');
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao registrar resposta.');
    }
  };

  // ── Loading ─────────────────────────────────────────────────────────────

  if (isLoading || loadingResposta) {
    return (
      <TooltipProvider>
        <div className="min-h-screen bg-[#f1eefc] pb-28">
          <StudentHeader />
          <main className="mx-auto max-w-3xl px-4 pt-5 space-y-4">
            <div className="h-8 w-32 rounded-full bg-white/70 animate-pulse" />
            <div className="h-80 rounded-3xl bg-white animate-pulse" />
          </main>
        </div>
      </TooltipProvider>
    );
  }

  if (!interacao) {
    return (
      <TooltipProvider>
        <div className="min-h-screen bg-[#f1eefc] pb-28">
          <StudentHeader />
          <main className="mx-auto max-w-3xl px-4 pt-5 text-center py-20">
            <p className="text-slate-500">Interação não encontrada ou não está mais ativa.</p>
            <button
              className="mt-4 flex items-center gap-2 mx-auto text-sm font-semibold text-slate-600"
              onClick={() => navigate('/interatividade')}
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
          </main>
        </div>
      </TooltipProvider>
    );
  }

  const BADGE = {
    aberta:     { label: 'Aberta',                  cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    respondida: { label: 'Participação registrada', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
    encerrada:  { label: 'Encerrada',               cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  }[status];

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-[#f1eefc] pb-28">
        <StudentHeader />

        <main className="mx-auto max-w-3xl px-4 pt-5">
          {/* Voltar */}
          <button
            onClick={() => navigate('/interatividade')}
            className="mb-7 flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Interatividade
          </button>

          {/* Card principal */}
          <div className="rounded-3xl bg-white shadow-sm">
            <div className="p-6 sm:p-7 space-y-5">

              {/* Cabeçalho */}
              <div className="flex items-start gap-3">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                  jaRespondeu ? 'bg-purple-100 text-[#5b16a3]' : 'bg-purple-100 text-[#5b16a3]'
                }`}>
                  {jaRespondeu
                    ? <CheckCircle2 className="w-6 h-6" />
                    : <ClipboardList className="w-6 h-6" />
                  }
                </div>
                <div className="flex-1">
                  <h1 className="text-xl font-bold text-slate-950 leading-snug">{interacao.titulo}</h1>
                  <div className="mt-2">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${BADGE.cls}`}>
                      {BADGE.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Banner: participação registrada */}
              {jaRespondeu && !encerrada && (
                <div className="rounded-2xl border border-purple-100 bg-purple-50 p-4 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 mt-0.5 text-[#5b16a3] shrink-0" />
                    <div>
                      <p className="font-bold text-[#4b0082]">Participação registrada</p>
                      <p className="mt-1 text-sm text-slate-600">Sua resposta foi enviada com sucesso.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setConfirmRemover(true)}
                    className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-red-500 transition-colors mt-0.5"
                    title="Remover minha participação"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remover
                  </button>
                </div>
              )}

              {/* Banner: encerrada */}
              {encerrada && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-bold text-slate-700">Interatividade encerrada</p>
                  {interacao.encerramento_em && (
                    <p className="mt-1 text-sm text-slate-500">
                      Encerrou em {format(new Date(interacao.encerramento_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  )}
                </div>
              )}

              {/* Descrição */}
              {interacao.descricao && (
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-600">
                  {interacao.descricao}
                </div>
              )}

              {/* Pergunta */}
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Pergunta</p>
                <h2 className="text-lg font-bold leading-snug text-slate-950">{interacao.pergunta}</h2>
              </div>

              {/* Alternativas */}
              {!isAberta && (
                <div className="space-y-3">
                  {alternativas.map(alt => {
                    const ativa = selecionada === alt.id;
                    const foiEscolhida = minhaResposta?.alternativa_id === alt.id;
                    return (
                      <button
                        key={alt.id}
                        disabled={jaRespondeu || encerrada}
                        onClick={() => setSelecionada(alt.id)}
                        className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-all ${
                          foiEscolhida
                            ? 'border-[#7e57c2] bg-purple-50'
                            : ativa
                            ? 'border-[#7e57c2] bg-purple-50 shadow-sm'
                            : jaRespondeu || encerrada
                            ? 'border-slate-200 bg-slate-50 cursor-default'
                            : 'border-slate-200 bg-white hover:border-purple-200 hover:bg-purple-50/40 cursor-pointer'
                        }`}
                      >
                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                          ativa || foiEscolhida
                            ? 'border-[#5b16a3] bg-[#5b16a3]'
                            : 'border-slate-300 bg-white'
                        }`}>
                          {(ativa || foiEscolhida) && (
                            <span className="h-2 w-2 rounded-full bg-white" />
                          )}
                        </span>
                        <span className="text-sm font-semibold text-slate-700">{alt.texto}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Campo de texto aberto */}
              {mostraTextoAberto && (
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    {isAberta ? 'Resposta' : 'Comentário (opcional)'}
                  </label>
                  <textarea
                    value={jaRespondeu ? (minhaResposta?.resposta_texto ?? '') : textoAberto}
                    onChange={e => setTextoAberto(e.target.value)}
                    disabled={jaRespondeu || encerrada}
                    rows={5}
                    maxLength={500}
                    placeholder="Digite sua resposta aqui."
                    className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#7e57c2] focus:ring-4 focus:ring-purple-100 disabled:bg-slate-50 disabled:text-slate-500"
                  />
                  <div className="mt-1 text-right text-xs text-slate-400">
                    {(jaRespondeu ? (minhaResposta?.resposta_texto?.length ?? 0) : textoAberto.length)}/500
                  </div>
                </div>
              )}

              {/* Botão enviar */}
              {!jaRespondeu && !encerrada && (
                <button
                  disabled={!podeEnviar || responderMutation.isPending}
                  onClick={handleResponder}
                  className="h-12 w-full rounded-xl bg-[#8e72c7] text-sm font-bold text-white transition hover:bg-[#7e57c2] disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  {responderMutation.isPending ? 'Registrando...' : 'Confirmar resposta'}
                </button>
              )}

              {/* Resultado parcial */}
              {(jaRespondeu || encerrada) && interacao.mostrar_resultado_aluno && resultado && resultado.resultados.length > 0 && (
                <div className="border-t border-slate-100 pt-6 space-y-4">
                  <div className="flex items-center gap-2 text-[#4b0082]">
                    <BarChart2 className="w-5 h-5" />
                    <h3 className="font-bold">
                      Resultado parcial — {resultado.totalVotos}{' '}
                      {resultado.totalVotos === 1 ? 'voto' : 'votos'}
                    </h3>
                  </div>
                  <div className="space-y-4">
                    {resultado.resultados.map(r => (
                      <div key={r.alternativa_id} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-4 text-sm">
                          <span className="font-medium text-slate-700">{r.texto}</span>
                          <span className="font-bold text-[#4b0082] shrink-0">{r.percentual}%</span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-purple-100">
                          <div
                            className="h-full rounded-full bg-[#7e57c2] transition-all duration-500"
                            style={{ width: `${r.percentual}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mensagem quando resultado não está habilitado */}
              {jaRespondeu && !interacao.mostrar_resultado_aluno && !encerrada && (
                <p className="text-xs text-slate-400 text-center pt-1">
                  Obrigado pela participação! O resultado será divulgado pelo professor.
                </p>
              )}
            </div>
          </div>
        </main>
      </div>

      <AlertDialog open={confirmRemover} onOpenChange={setConfirmRemover}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover participação?</AlertDialogTitle>
            <AlertDialogDescription>
              Sua resposta será apagada e você poderá responder novamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={async () => {
                if (!id) return;
                await removerMutation.mutateAsync(id);
                setSelecionada(null);
                setTextoAberto('');
                setConfirmRemover(false);
                toast.success('Participação removida. Você pode responder novamente.');
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
};

export default InteratividadeResposta;
