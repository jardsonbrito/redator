import { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import { useMicroQuizQuestoes } from '@/hooks/useMicroItens';

interface Props {
  itemId: string;
  notaMaxima?: number | null;
  onConcluido?: () => void;
}

// Embaralha array com seed baseado no número da tentativa
const embaralhar = <T,>(arr: T[], seed: number): T[] => {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const QuizViewer = ({ itemId, notaMaxima, onConcluido }: Props) => {
  const { studentData } = useStudentAuth();
  const { data: questoes = [], isLoading } = useMicroQuizQuestoes(itemId);
  const queryClient = useQueryClient();

  const [questaoIdx, setQuestaoIdx] = useState(0);
  const [tentativaNumero, setTentativaNumero] = useState(1);
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const [respondida, setRespondida] = useState(false);
  const [acertou, setAcertou] = useState(false);
  const [quizConcluido, setQuizConcluido] = useState(false);
  const [acertosTotal, setAcertosTotal] = useState(0);

  const questao = questoes[questaoIdx];

  // Alternativas embaralhadas com base na tentativa (muda a cada tentativa)
  const alternativasEmbaralhadas = useMemo(() => {
    if (!questao?.micro_quiz_alternativas) return [];
    return embaralhar(questao.micro_quiz_alternativas, tentativaNumero * (questaoIdx + 1));
  }, [questao, tentativaNumero, questaoIdx]);

  const registrarTentativa = useMutation({
    mutationFn: async ({ questaoId, altIds, acertou }: { questaoId: string; altIds: string[]; acertou: boolean }) => {
      const email = studentData.email?.toLowerCase().trim();
      if (!email) return;
      await supabase.from('micro_quiz_tentativas').insert({
        email_aluno: email,
        questao_id: questaoId,
        alternativas_escolhidas: altIds,
        acertou,
        tentativa_numero: tentativaNumero,
      });
      await supabase.from('micro_analytics').insert({
        email_aluno: email,
        item_id: itemId,
        evento: acertou ? 'quiz_acerto' : 'quiz_erro',
        metadata: { questao_id: questaoId, tentativa: tentativaNumero },
      });
    },
  });

  const responder = useCallback(() => {
    if (!questao || selecionadas.length === 0) return;

    const corretas = questao.micro_quiz_alternativas
      .filter((a: any) => a.correta)
      .map((a: any) => a.id)
      .sort();
    const escolhidasOrdenadas = [...selecionadas].sort();
    const ok = JSON.stringify(corretas) === JSON.stringify(escolhidasOrdenadas);

    setAcertou(ok);
    setRespondida(true);

    registrarTentativa.mutate({
      questaoId: questao.id,
      altIds: selecionadas,
      acertou: ok,
    });
  }, [questao, selecionadas, registrarTentativa]);

  const proxima = () => {
    if (acertou) setAcertosTotal(p => p + 1);

    if (questaoIdx < questoes.length - 1) {
      setQuestaoIdx(q => q + 1);
      setTentativaNumero(1);
      setSelecionadas([]);
      setRespondida(false);
      setAcertou(false);
    } else {
      // Quiz concluído
      setQuizConcluido(true);
      onConcluido?.();
    }
  };

  const tentarNovamente = () => {
    setSelecionadas([]);
    setRespondida(false);
    setAcertou(false);
    setTentativaNumero(t => t + 1);
  };

  const reiniciar = () => {
    setQuestaoIdx(0);
    setTentativaNumero(1);
    setSelecionadas([]);
    setRespondida(false);
    setAcertou(false);
    setQuizConcluido(false);
    setAcertosTotal(0);
  };

  const toggleAlternativa = (id: string) => {
    if (respondida) return;
    // Suporte a múltiplas corretas
    const corretas = questao?.micro_quiz_alternativas?.filter((a: any) => a.correta) ?? [];
    if (corretas.length === 1) {
      // Seleção única
      setSelecionadas([id]);
    } else {
      setSelecionadas(prev =>
        prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      );
    }
  };

  if (isLoading) {
    return <div className="w-full h-40 bg-gray-50 rounded-xl animate-pulse" />;
  }

  if (!questoes.length) {
    return (
      <div className="text-center py-10 text-gray-400">
        <p>Este quiz ainda não possui questões.</p>
      </div>
    );
  }

  // Tela de resultado final
  if (quizConcluido) {
    const notaObtida = notaMaxima != null
      ? (acertosTotal / questoes.length) * notaMaxima
      : null;
    const aprovado = notaMaxima != null ? notaObtida! >= notaMaxima * 0.6 : acertosTotal === questoes.length;

    return (
      <div className="text-center space-y-4 py-6">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${aprovado ? 'bg-green-100' : 'bg-yellow-100'}`}>
          <CheckCircle2 className={`w-8 h-8 ${aprovado ? 'text-green-600' : 'text-yellow-500'}`} />
        </div>
        <h3 className="text-lg font-bold text-gray-800">Quiz concluído!</h3>

        {notaMaxima != null ? (
          <div className="space-y-1">
            <p className="text-3xl font-bold text-[#3f0776]">
              {notaObtida!.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              <span className="text-lg text-gray-400 font-normal"> / {notaMaxima.toLocaleString('pt-BR')}</span>
            </p>
            <p className="text-sm text-gray-500">
              {acertosTotal} de {questoes.length} questões corretas
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            Você acertou <strong>{acertosTotal}</strong> de <strong>{questoes.length}</strong> questões.
          </p>
        )}

        <Button variant="outline" size="sm" onClick={reiniciar}>
          <RefreshCw className="w-4 h-4 mr-1" />
          Refazer quiz
        </Button>
      </div>
    );
  }

  const tentativasRestantes = questao.tentativas_max - tentativaNumero;
  const esgotouTentativas = !acertou && respondida && tentativasRestantes <= 0;

  return (
    <div className="space-y-5">
      {/* Progresso */}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>Questão {questaoIdx + 1} de {questoes.length}</span>
        <Badge variant="outline" className="text-xs">
          Tentativa {tentativaNumero}/{questao.tentativas_max}
        </Badge>
      </div>

      {/* Enunciado */}
      <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
        <p className="text-sm font-semibold text-gray-800 leading-relaxed">
          {questao.enunciado}
        </p>
      </div>

      {/* Alternativas */}
      <div className="space-y-2">
        {alternativasEmbaralhadas.map((alt: any) => {
          const isSelecionada = selecionadas.includes(alt.id);
          const isCorreta = alt.correta;
          let classeBase = 'w-full text-left p-3 rounded-xl border text-sm transition-all cursor-pointer ';

          if (respondida) {
            if (isCorreta) classeBase += 'bg-green-50 border-green-300 text-green-800';
            else if (isSelecionada && !isCorreta) classeBase += 'bg-red-50 border-red-300 text-red-800';
            else classeBase += 'bg-gray-50 border-gray-200 text-gray-500';
          } else {
            classeBase += isSelecionada
              ? 'bg-purple-50 border-[#3f0776] text-[#3f0776] font-medium'
              : 'bg-white border-gray-200 text-gray-700 hover:border-purple-300';
          }

          return (
            <button
              key={alt.id}
              className={classeBase}
              onClick={() => toggleAlternativa(alt.id)}
              disabled={respondida}
            >
              <div className="flex items-start gap-2">
                <span className="shrink-0 mt-0.5">
                  {respondida && isCorreta && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                  {respondida && isSelecionada && !isCorreta && <XCircle className="w-4 h-4 text-red-500" />}
                  {!respondida && (
                    <span className={`w-4 h-4 rounded-full border inline-flex items-center justify-center ${isSelecionada ? 'border-[#3f0776] bg-[#3f0776]' : 'border-gray-300'}`}>
                      {isSelecionada && <span className="w-2 h-2 rounded-full bg-white" />}
                    </span>
                  )}
                </span>
                <div>
                  <span>{alt.texto}</span>
                  {respondida && alt.justificativa && (
                    <p className="text-xs mt-1 opacity-75">{alt.justificativa}</p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Feedback */}
      {respondida && (
        <div className={`p-3 rounded-xl text-sm font-medium ${acertou ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {acertou ? '✅ Correto!' : `❌ Incorreto.${esgotouTentativas ? ' Tentativas esgotadas.' : ` Você tem ${tentativasRestantes} tentativa(s) restante(s).`}`}
        </div>
      )}

      {/* Ações */}
      <div className="flex gap-2">
        {!respondida && (
          <Button
            className="bg-[#3f0776] hover:bg-[#643293]"
            disabled={selecionadas.length === 0}
            onClick={responder}
          >
            Responder
          </Button>
        )}
        {respondida && (acertou || esgotouTentativas) && (
          <Button className="bg-[#3f0776] hover:bg-[#643293]" onClick={proxima}>
            {questaoIdx < questoes.length - 1 ? 'Próxima questão' : 'Finalizar quiz'}
          </Button>
        )}
        {respondida && !acertou && !esgotouTentativas && (
          <Button variant="outline" onClick={tentarNovamente}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Tentar novamente
          </Button>
        )}
      </div>
    </div>
  );
};
