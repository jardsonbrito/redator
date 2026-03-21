import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, BookOpen, ClipboardList, ArrowLeft, Copy, Check, RotateCcw } from "lucide-react";

interface Criterio {
  id: string;
  nome: string;
  ordem: number;
}

interface SubmissaoInfo {
  id: string;
  nome_aluno: string;
  email_aluno: string;
  turma: string | null;
  redacao_texto: string | null;
  exercicio_id?: string;
}

interface AdminCorrecaoProducaoGuiadaModalProps {
  isOpen: boolean;
  onClose: () => void;
  submissao: SubmissaoInfo | null;
  exercicioId: string;
  exercicioTitulo: string;
  onSucesso: () => void;
}

const ESCALA_NOTAS = [0, 40, 80, 120, 160, 200] as const;
const MAX_POR_CRITERIO = 200;

export const AdminCorrecaoProducaoGuiadaModal = ({
  isOpen,
  onClose,
  submissao,
  exercicioId,
  exercicioTitulo,
  onSucesso,
}: AdminCorrecaoProducaoGuiadaModalProps) => {
  const [criterios, setCriterios] = useState<Criterio[]>([]);
  const [notasPorCriterio, setNotasPorCriterio] = useState<Record<string, number>>({});
  const [comentario, setComentario] = useState("");
  const [enunciado, setEnunciado] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [showDevolverModal, setShowDevolverModal] = useState(false);
  const [motivoDevolucao, setMotivoDevolucao] = useState("");

  const somaObtida = Object.values(notasPorCriterio).reduce((acc, n) => acc + n, 0);
  const somaMaxima = criterios.length * MAX_POR_CRITERIO;
  const notaFinal = somaMaxima > 0
    ? Math.min(1000, Math.round((somaObtida / somaMaxima) * 1000))
    : 0;
  const todosCriteriosPreenchidos =
    criterios.length > 0 && criterios.every(c => notasPorCriterio[c.id] !== undefined);

  useEffect(() => {
    if (isOpen && submissao) {
      carregarDados();
    }
  }, [isOpen, submissao?.id]);

  const carregarDados = async () => {
    if (!submissao) return;
    setLoading(true);
    setNotasPorCriterio({});
    setComentario("");
    try {
      const [exercicioRes, criteriosRes] = await Promise.all([
        supabase
          .from("exercicios")
          .select("enunciado")
          .eq("id", exercicioId)
          .single(),
        supabase
          .from("producao_guiada_criterios")
          .select("id, nome, ordem")
          .eq("exercicio_id", exercicioId)
          .order("ordem"),
      ]);

      setEnunciado((exercicioRes.data as any)?.enunciado ?? "");
      const criteriosCarregados = criteriosRes.data ?? [];
      setCriterios(criteriosCarregados);

      // Carregar notas existentes
      if (criteriosCarregados.length > 0) {
        const { data: notasExistentes } = await supabase
          .from("producao_guiada_notas_criterios")
          .select("criterio_id, nota")
          .eq("resposta_id", submissao.id);

        if (notasExistentes && notasExistentes.length > 0) {
          const notasMap: Record<string, number> = {};
          notasExistentes.forEach(n => { notasMap[n.criterio_id] = n.nota; });
          setNotasPorCriterio(notasMap);
        }
      }

      // Carregar comentário existente
      const { data: redacaoData } = await supabase
        .from("redacoes_exercicio")
        .select("comentario_admin, status_corretor_1")
        .eq("id", submissao.id)
        .single();

      if (redacaoData?.comentario_admin) {
        setComentario(redacaoData.comentario_admin);
      }

      // Marcar como em_correcao se ainda pendente ou reenviado
      if (redacaoData?.status_corretor_1 === "pendente" || redacaoData?.status_corretor_1 === "reenviado") {
        await supabase
          .from("redacoes_exercicio")
          .update({ status_corretor_1: "em_correcao" })
          .eq("id", submissao.id);
      }
    } catch (err) {
      console.error("Erro ao carregar dados para correção:", err);
      toast.error("Erro ao carregar a atividade.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopiarDados = async () => {
    const linhas = [
      `Aluno: ${submissao?.nome_aluno ?? "—"}`,
      `Exercício: ${exercicioTitulo}`,
      "",
      "Enunciado:",
      enunciado || "—",
      "",
      "Resposta do aluno:",
      submissao?.redacao_texto || "—",
    ];
    try {
      await navigator.clipboard.writeText(linhas.join("\n"));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      toast.error("Não foi possível copiar. Tente manualmente.");
    }
  };

  const handleDevolver = async () => {
    if (!submissao || !motivoDevolucao.trim()) return;
    setSaving(true);
    try {
      await supabase
        .from("redacoes_exercicio")
        .update({
          status_corretor_1: "devolvida",
          motivo_devolucao: motivoDevolucao.trim(),
          corrigida: false,
          nota_total: null,
          data_correcao: null,
        })
        .eq("id", submissao.id);

      toast.success("Atividade devolvida ao aluno.");
      setShowDevolverModal(false);
      setMotivoDevolucao("");
      onSucesso();
      onClose();
    } catch (err) {
      console.error("Erro ao devolver atividade:", err);
      toast.error("Erro ao devolver a atividade.");
    } finally {
      setSaving(false);
    }
  };

  const handleSalvar = async (finalizar = true) => {
    if (!submissao) return;
    if (finalizar && !todosCriteriosPreenchidos) {
      toast.error("Selecione a nota de todos os critérios antes de finalizar.");
      return;
    }

    setSaving(true);
    try {
      // 1. Salvar notas por critério (DELETE + INSERT para idempotência)
      if (criterios.length > 0 && Object.keys(notasPorCriterio).length > 0) {
        await supabase
          .from("producao_guiada_notas_criterios")
          .delete()
          .eq("resposta_id", submissao.id);

        await supabase
          .from("producao_guiada_notas_criterios")
          .insert(
            Object.entries(notasPorCriterio).map(([criterio_id, nota]) => ({
              resposta_id: submissao.id,
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
          corretor_id_1: null,
        })
        .eq("id", submissao.id);

      // 3. Opção B: upsert em radar_dados ao finalizar
      if (finalizar) {
        const { data: redacaoInfo } = await supabase
          .from("redacoes_exercicio")
          .select("email_aluno, nome_aluno, turma, exercicio_id, data_envio, exercicios(titulo)")
          .eq("id", submissao.id)
          .single();

        if (redacaoInfo) {
          const emailAluno = redacaoInfo.email_aluno;
          const exId = redacaoInfo.exercicio_id;
          const dataRealizacao = redacaoInfo.data_envio
            ? redacaoInfo.data_envio.split("T")[0]
            : new Date().toISOString().split("T")[0];
          const tituloExercicio = (redacaoInfo.exercicios as any)?.titulo ?? exercicioTitulo;

          const { data: existente } = await supabase
            .from("radar_dados")
            .select("id")
            .eq("exercicio_id", exId)
            .eq("email_aluno", emailAluno)
            .maybeSingle();

          if (existente) {
            await supabase
              .from("radar_dados")
              .update({ nota: notaFinal, updated_at: new Date().toISOString() })
              .eq("id", existente.id);
          } else {
            await supabase.from("radar_dados").insert({
              email_aluno: emailAluno,
              nome_aluno: redacaoInfo.nome_aluno ?? submissao.nome_aluno,
              turma: redacaoInfo.turma ?? submissao.turma ?? "",
              titulo_exercicio: tituloExercicio,
              data_realizacao: dataRealizacao,
              nota: notaFinal,
              exercicio_id: exId,
            });
          }
        }
      }

      toast.success(finalizar ? "Correção finalizada!" : "Progresso salvo.");
      if (finalizar) {
        onSucesso();
        onClose();
      }
    } catch (err) {
      console.error("Erro ao salvar correção:", err);
      toast.error("Erro ao salvar a correção.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Corrigir atividade — {exercicioTitulo}
          </DialogTitle>
          {submissao && (
            <p className="text-sm mt-1">
              <span className="font-semibold text-purple-700">{submissao.nome_aluno}</span>
              {submissao.turma ? <span className="text-gray-500"> · Turma {submissao.turma}</span> : ""}
            </p>
          )}
        </DialogHeader>

        <div className="flex justify-end pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopiarDados}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs h-8"
          >
            {copiado ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-600" />
                <span className="text-green-700">Dados copiados!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copiar dados da resposta
              </>
            )}
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        ) : (
          <div className="space-y-5 pt-2">
            {/* Enunciado */}
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
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Resposta do aluno
              </div>
              <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap bg-white min-h-[100px]">
                {submissao?.redacao_texto || (
                  <span className="text-gray-400 italic">Sem resposta registrada.</span>
                )}
              </div>
            </div>

            {/* Critérios */}
            {criterios.length > 0 && (
              <div className="space-y-3">
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
            )}

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

            {/* Comentário */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Comentário para o aluno (opcional)
              </Label>
              <Textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Deixe um feedback para o aluno..."
                rows={4}
                className="text-sm resize-none"
              />
            </div>

            {/* Ações */}
            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                onClick={() => handleSalvar(false)}
                disabled={saving}
                className="flex-1"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Salvar progresso
              </Button>
              <Button
                onClick={() => handleSalvar(true)}
                disabled={saving || !todosCriteriosPreenchidos}
                className="flex-1 bg-[#3F0077] hover:bg-[#662F96] text-white"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Finalizar correção
              </Button>
            </div>

            {/* Botão Devolver */}
            <div className="pt-1 border-t border-gray-100">
              <Button
                variant="ghost"
                onClick={() => setShowDevolverModal(true)}
                disabled={saving}
                className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 text-sm"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Devolver ao aluno
              </Button>
            </div>

            {!todosCriteriosPreenchidos && criterios.length > 0 && (
              <p className="text-xs text-amber-600 text-center">
                Selecione a nota de todos os {criterios.length}{" "}
                {criterios.length === 1 ? "critério" : "critérios"} para finalizar.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Dialog de devolução */}
    <Dialog open={showDevolverModal} onOpenChange={(open) => { if (!open) { setShowDevolverModal(false); setMotivoDevolucao(""); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <RotateCcw className="w-5 h-5" />
            Devolver atividade ao aluno
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <p className="text-sm text-gray-600">
            A atividade será devolvida ao aluno para ajustes. Ele poderá reeditar e reenviar após confirmar ciência.
          </p>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Motivo da devolução <span className="text-red-500">*</span>
            </Label>
            <Textarea
              value={motivoDevolucao}
              onChange={(e) => setMotivoDevolucao(e.target.value)}
              placeholder="Explique ao aluno o que precisa ser ajustado..."
              rows={4}
              className="text-sm resize-none"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <Button
              variant="outline"
              onClick={() => { setShowDevolverModal(false); setMotivoDevolucao(""); }}
              disabled={saving}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDevolver}
              disabled={saving || !motivoDevolucao.trim()}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RotateCcw className="w-4 h-4 mr-2" />}
              Confirmar devolução
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};
