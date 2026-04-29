import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ClipboardList, BarChart2 } from 'lucide-react';
import { StudentHeader } from '@/components/StudentHeader';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  useInteracoesAtivas,
  useMinhasRespostas,
  useResponderInteracao,
  useResultadoInteracao,
} from '@/hooks/useInteratividade';

const InteratividadeResposta = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: interacoes = [], isLoading } = useInteracoesAtivas();
  const interacao = interacoes.find(i => i.id === id);

  const { data: minhasRespostas = [], isLoading: loadingResposta } = useMinhasRespostas(
    id ? [id] : []
  );
  const minhaResposta = minhasRespostas.find(r => r.interacao_id === id);

  const { data: resultado } = useResultadoInteracao(
    interacao?.mostrar_resultado_aluno && minhaResposta ? id! : ''
  );

  const responderMutation = useResponderInteracao();
  const [selecionada, setSelecionada] = useState<string | null>(null);

  const handleResponder = async () => {
    if (!selecionada || !id) return;
    try {
      await responderMutation.mutateAsync({ interacao_id: id, alternativa_id: selecionada });
      toast.success('Participação registrada!');
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao registrar resposta.');
    }
  };

  const jaRespondeu = !!minhaResposta;
  const alternativas = interacao?.alternativas?.sort((a, b) => a.ordem - b.ordem) ?? [];

  if (isLoading || loadingResposta) {
    return (
      <TooltipProvider>
        <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-100 pb-24">
          <StudentHeader />
          <main className="container mx-auto px-4 py-8 max-w-2xl">
            <div className="space-y-4">
              <div className="h-8 w-32 rounded bg-gray-200 animate-pulse" />
              <div className="h-40 rounded-2xl bg-white animate-pulse" />
            </div>
          </main>
        </div>
      </TooltipProvider>
    );
  }

  if (!interacao) {
    return (
      <TooltipProvider>
        <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-100 pb-24">
          <StudentHeader />
          <main className="container mx-auto px-4 py-8 max-w-2xl text-center py-20">
            <p className="text-gray-500">Interação não encontrada ou não está mais ativa.</p>
            <Button variant="ghost" className="mt-4" onClick={() => navigate('/interatividade')}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Voltar
            </Button>
          </main>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-100 pb-24">
        <StudentHeader />
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          {/* Voltar */}
          <Button
            variant="ghost"
            size="sm"
            className="mb-5 -ml-2 text-gray-500 hover:text-gray-700"
            onClick={() => navigate('/interatividade')}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Interatividade
          </Button>

          {/* Card principal */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
            {/* Cabeçalho */}
            <div className="flex items-start gap-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                jaRespondeu ? 'bg-green-100' : 'bg-violet-100'
              }`}>
                {jaRespondeu
                  ? <CheckCircle2 className="w-6 h-6 text-green-600" />
                  : <ClipboardList className="w-6 h-6 text-violet-600" />
                }
              </div>
              <div className="flex-1">
                <h1 className="text-lg font-bold text-gray-900">{interacao.titulo}</h1>
                {jaRespondeu && (
                  <Badge variant="outline" className="mt-1 text-xs text-green-700 border-green-200 bg-green-50">
                    Participação registrada
                  </Badge>
                )}
              </div>
            </div>

            {/* Descrição */}
            {interacao.descricao && (
              <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3">{interacao.descricao}</p>
            )}

            {/* Pergunta */}
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Pergunta</p>
              <p className="text-gray-900 font-medium">{interacao.pergunta}</p>
            </div>

            {/* Alternativas */}
            <div className="space-y-2">
              {alternativas.map(alt => {
                const estaSelecionada = selecionada === alt.id;
                const estaRespondida = minhaResposta?.alternativa_id === alt.id;

                return (
                  <button
                    key={alt.id}
                    disabled={jaRespondeu}
                    onClick={() => !jaRespondeu && setSelecionada(alt.id)}
                    className={`w-full text-left rounded-xl border-2 p-3.5 text-sm font-medium transition-all ${
                      estaRespondida
                        ? 'border-green-400 bg-green-50 text-green-800'
                        : estaSelecionada
                        ? 'border-violet-500 bg-violet-50 text-violet-800'
                        : jaRespondeu
                        ? 'border-gray-100 bg-gray-50 text-gray-500 cursor-default'
                        : 'border-gray-200 bg-white text-gray-800 hover:border-violet-300 hover:bg-violet-50 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        estaRespondida
                          ? 'border-green-500 bg-green-500'
                          : estaSelecionada
                          ? 'border-violet-500 bg-violet-500'
                          : 'border-gray-300'
                      }`}>
                        {(estaRespondida || estaSelecionada) && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </div>
                      {alt.texto}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Botão de resposta */}
            {!jaRespondeu && (
              <Button
                className="w-full"
                disabled={!selecionada || responderMutation.isPending}
                onClick={handleResponder}
              >
                {responderMutation.isPending ? 'Registrando...' : 'Confirmar resposta'}
              </Button>
            )}

            {/* Resultado (se habilitado pelo admin e aluno já respondeu) */}
            {jaRespondeu && interacao.mostrar_resultado_aluno && resultado && (
              <div className="pt-2 border-t space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <BarChart2 className="w-4 h-4" />
                  Resultado parcial — {resultado.total} {resultado.total === 1 ? 'participação' : 'participações'}
                </div>
                <div className="space-y-3">
                  {resultado.resultados.map(r => (
                    <div key={r.alternativa_id}>
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>{r.texto}</span>
                        <span className="font-semibold">{r.percentual}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-violet-500 rounded-full transition-all duration-500"
                          style={{ width: `${r.percentual}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mensagem quando resultado não está habilitado mas já respondeu */}
            {jaRespondeu && !interacao.mostrar_resultado_aluno && (
              <p className="text-xs text-gray-400 text-center pt-1">
                Obrigado pela participação! O resultado será divulgado pelo professor.
              </p>
            )}
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
};

export default InteratividadeResposta;
