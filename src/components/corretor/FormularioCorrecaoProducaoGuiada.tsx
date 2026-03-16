import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, BookOpen, ClipboardList } from "lucide-react";
import { RedacaoCorretor } from "@/hooks/useCorretorRedacoes";

interface Criterio {
  id: string;
  nome: string;
  ordem: number;
}

interface FormularioCorrecaoProducaoGuiadaProps {
  redacao: RedacaoCorretor;
  corretorEmail: string;
  onVoltar: () => void;
  onSucesso: () => void;
}

const ESCALA_NOTAS = [0, 40, 80, 120, 160, 200] as const;
const MAX_POR_CRITERIO = 200;

export const FormularioCorrecaoProducaoGuiada = ({
  redacao,
  corretorEmail,
  onVoltar,
  onSucesso,
}: FormularioCorrecaoProducaoGuiadaProps) => {
  const { toast } = useToast();
  const [criterios, setCriterios] = useState<Criterio[]>([]);
  const [notasPorCriterio, setNotasPorCriterio] = useState<Record<string, number>>({});
  const [comentario, setComentario] = useState("");
  const [enunciado, setEnunciado] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [corretorId, setCorretorId] = useState<string>("");

  // Calcular nota final proporcional em tempo real
  const somaObtida = Object.values(notasPorCriterio).reduce((acc, n) => acc + n, 0);
  const somaMaxima = criterios.length * MAX_POR_CRITERIO;
  const notaFinal = somaMaxima > 0
    ? Math.min(1000, Math.round((somaObtida / somaMaxima) * 1000))
    : 0;
  const todosCriteriosPreenchidos =
    criterios.length > 0 && criterios.every(c => notasPorCriterio[c.id] !== undefined);

  useEffect(() => {
    carregarDados();
  }, [redacao.id]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      // Buscar id do corretor, exercicio_id, enunciado e critérios em paralelo
      const [corretorRes, redacaoExercicioRes] = await Promise.all([
        supabase
          .from("corretores")
          .select("id")
          .eq("email", corretorEmail)
          .eq("ativo", true)
          .single(),
        supabase
          .from("redacoes_exercicio")
          .select("exercicio_id, exercicios(enunciado)")
          .eq("id", redacao.id)
          .single(),
      ]);

      if (corretorRes.data) setCorretorId(corretorRes.data.id);

      const exercicioId = redacaoExercicioRes.data?.exercicio_id;
      setEnunciado((redacaoExercicioRes.data?.exercicios as any)?.enunciado ?? "");

      if (exercicioId) {
        const criteriosRes = await supabase
          .from("producao_guiada_criterios")
          .select("id, nome, ordem")
          .eq("exercicio_id", exercicioId)
          .order("ordem");

        const criteriosCarregados = criteriosRes.data ?? [];
        setCriterios(criteriosCarregados);

        // Carregar notas existentes (caso corretor esteja editando)
        if (criteriosCarregados.length > 0) {
          const { data: notasExistentes } = await supabase
            .from("producao_guiada_notas_criterios")
            .select("criterio_id, nota")
            .eq("resposta_id", redacao.id);

          if (notasExistentes && notasExistentes.length > 0) {
            const notasMap: Record<string, number> = {};
            notasExistentes.forEach(n => { notasMap[n.criterio_id] = n.nota; });
            setNotasPorCriterio(notasMap);
          }
        }
      }

      // Carregar comentário existente
      const { data: redacaoData } = await supabase
        .from("redacoes_exercicio")
        .select("comentario_admin, status_corretor_1")
        .eq("id", redacao.id)
        .single();

      if (redacaoData?.comentario_admin) {
        setComentario(redacaoData.comentario_admin);
      }

      // Marcar como em_correcao se ainda estava pendente
      if (redacaoData?.status_corretor_1 === "pendente") {
        await supabase
          .from("redacoes_exercicio")
          .update({ status_corretor_1: "em_correcao" })
          .eq("id", redacao.id);
      }
    } catch (err) {
      console.error("Erro ao carregar dados para correção:", err);
      toast({ title: "Erro ao carregar a atividade", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSalvar = async (finalizar = true) => {
    if (finalizar && !todosCriteriosPreenchidos) {
      toast({ title: "Selecione a nota de todos os critérios antes de finalizar.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // 1. Salvar notas por critério (DELETE + INSERT para idempotência)
      if (criterios.length > 0 && Object.keys(notasPorCriterio).length > 0) {
        await supabase
          .from("producao_guiada_notas_criterios")
          .delete()
          .eq("resposta_id", redacao.id);

        await supabase
          .from("producao_guiada_notas_criterios")
          .insert(
            Object.entries(notasPorCriterio).map(([criterio_id, nota]) => ({
              resposta_id: redacao.id,
              criterio_id,
              nota,
            }))
          );
      }

      // 2. Atualizar redacoes_exercicio
      const novoStatus = finalizar ? "corrigida" : "incompleta";
      await supabase
        .from("redacoes_exercicio")
        .update({
          nota_total: finalizar ? notaFinal : null,
          corrigida: finalizar,
          status_corretor_1: novoStatus,
          data_correcao: finalizar ? new Date().toISOString() : null,
          comentario_admin: comentario.trim() || null,
          corretor_id_1: corretorId || null,
        })
        .eq("id", redacao.id);

      // 3. Opção B: upsert em radar_dados quando a correção for finalizada
      if (finalizar) {
        // Buscar dados do aluno e exercício para radar_dados
        const { data: redacaoInfo } = await supabase
          .from("redacoes_exercicio")
          .select("email_aluno, nome_aluno, turma, exercicio_id, data_envio, exercicios(titulo)")
          .eq("id", redacao.id)
          .single();

        if (redacaoInfo) {
          const emailAluno = redacaoInfo.email_aluno;
          const exercicioId = redacaoInfo.exercicio_id;
          const dataRealizacao = redacaoInfo.data_envio
            ? redacaoInfo.data_envio.split("T")[0]
            : new Date().toISOString().split("T")[0];
          const tituloExercicio = (redacaoInfo.exercicios as any)?.titulo ?? redacao.frase_tematica ?? "";

          // Verificar se já existe registro para evitar duplicidade
          const { data: existente } = await supabase
            .from("radar_dados")
            .select("id")
            .eq("exercicio_id", exercicioId)
            .eq("email_aluno", emailAluno)
            .maybeSingle();

          if (existente) {
            // Atualizar nota se correção for refeita
            await supabase
              .from("radar_dados")
              .update({ nota: notaFinal, updated_at: new Date().toISOString() })
              .eq("id", existente.id);
          } else {
            // Inserir novo registro
            await supabase.from("radar_dados").insert({
              email_aluno: emailAluno,
              nome_aluno: redacaoInfo.nome_aluno ?? redacao.nome_aluno,
              turma: redacaoInfo.turma ?? redacao.turma ?? "",
              titulo_exercicio: tituloExercicio,
              data_realizacao: dataRealizacao,
              nota: notaFinal,
              exercicio_id: exercicioId,
            });
          }
        }
      }

      toast({ title: finalizar ? "Correção finalizada!" : "Progresso salvo." });
      if (finalizar) onSucesso();
    } catch (err) {
      console.error("Erro ao salvar correção:", err);
      toast({ title: "Erro ao salvar a correção.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onVoltar} className="flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
        <div>
          <h2 className="text-lg font-bold text-gray-900">{redacao.frase_tematica}</h2>
          <p className="text-sm text-gray-500">{redacao.nome_aluno} · {redacao.email_aluno}</p>
        </div>
      </div>

      {/* Enunciado (referência para o corretor) */}
      {enunciado && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <BookOpen className="w-3.5 h-3.5" />
            Enunciado da atividade
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {enunciado}
          </div>
        </div>
      )}

      {/* Resposta do aluno */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Resposta do aluno
        </div>
        <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap bg-white min-h-[120px]">
          {redacao.texto || <span className="text-gray-400 italic">Sem resposta registrada.</span>}
        </div>
      </div>

      {/* Critérios de avaliação */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <ClipboardList className="w-3.5 h-3.5" />
          Critérios de avaliação
        </div>

        {criterios.map((c) => (
          <div key={c.id} className="border border-gray-200 rounded-lg p-4 space-y-2 bg-white">
            <Label className="text-sm font-semibold text-gray-800">{c.nome}</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {ESCALA_NOTAS.map((valor) => {
                const selecionado = notasPorCriterio[c.id] === valor;
                return (
                  <button
                    key={valor}
                    type="button"
                    onClick={() =>
                      setNotasPorCriterio(prev => ({ ...prev, [c.id]: valor }))
                    }
                    className={`w-14 h-10 rounded-lg border text-sm font-semibold transition-colors ${
                      selecionado
                        ? "bg-[#3F0077] border-[#3F0077] text-white"
                        : "bg-white border-gray-300 text-gray-700 hover:border-purple-400 hover:bg-purple-50"
                    }`}
                  >
                    {valor}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Preview nota final */}
      <div className="border border-purple-200 bg-purple-50 rounded-lg p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-purple-800">Nota final calculada</p>
          <p className="text-xs text-purple-600 mt-0.5">
            {somaObtida}/{somaMaxima} pts →{" "}
            {somaMaxima > 0
              ? `(${somaObtida} ÷ ${somaMaxima}) × 1000`
              : "aguardando critérios"}
          </p>
        </div>
        <span className="text-3xl font-bold text-purple-700">{notaFinal}</span>
      </div>

      {/* Comentário geral */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700">Comentário geral (opcional)</Label>
        <Textarea
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder="Deixe um comentário de feedback para o aluno..."
          rows={4}
          className="text-sm resize-none"
        />
      </div>

      {/* Ações */}
      <div className="flex gap-3 pt-2">
        <Button
          variant="outline"
          onClick={() => handleSalvar(false)}
          disabled={saving}
          className="flex-1"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Salvar progresso
        </Button>
        <Button
          onClick={() => handleSalvar(true)}
          disabled={saving || !todosCriteriosPreenchidos}
          className="flex-1 bg-[#3F0077] hover:bg-[#662F96] text-white"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Finalizar correção
        </Button>
      </div>

      {!todosCriteriosPreenchidos && criterios.length > 0 && (
        <p className="text-xs text-amber-600 text-center">
          Selecione a nota de todos os {criterios.length} {criterios.length === 1 ? "critério" : "critérios"} para finalizar.
        </p>
      )}
    </div>
  );
};
