import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { toast } from "sonner";
import { Loader2, BookOpen, ClipboardList, Info } from "lucide-react";

interface Criterio {
  id: string;
  nome: string;
  ordem: number;
}

interface ProducaoGuiadaModalProps {
  isOpen: boolean;
  onClose: () => void;
  exercicioId: string;
  exercicioTitulo: string;
  onSubmitSuccess?: () => void;
}

export const ProducaoGuiadaModal = ({
  isOpen,
  onClose,
  exercicioId,
  exercicioTitulo,
  onSubmitSuccess,
}: ProducaoGuiadaModalProps) => {
  const { studentData } = useStudentAuth();
  const [enunciado, setEnunciado] = useState("");
  const [criterios, setCriterios] = useState<Criterio[]>([]);
  const [resposta, setResposta] = useState("");
  const [jaSubmeteu, setJaSubmeteu] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && exercicioId) {
      carregarDados();
    }
  }, [isOpen, exercicioId]);

  const carregarDados = async () => {
    setLoadingData(true);
    try {
      const [exercicioRes, criteriosRes, submissaoRes] = await Promise.all([
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

        supabase
          .from("redacoes_exercicio")
          .select("id", { count: "exact", head: true })
          .eq("exercicio_id", exercicioId)
          .ilike("email_aluno", studentData.email?.toLowerCase().trim() ?? ""),
      ]);

      setEnunciado(exercicioRes.data?.enunciado ?? "");
      setCriterios(criteriosRes.data ?? []);
      setJaSubmeteu((submissaoRes.count ?? 0) > 0);
    } catch (err) {
      console.error("Erro ao carregar dados da atividade:", err);
      toast.error("Erro ao carregar a atividade.");
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async () => {
    if (!resposta.trim()) {
      toast.error("Escreva sua resposta antes de enviar.");
      return;
    }
    if (!studentData.email || !studentData.nome) {
      toast.error("Dados do aluno não encontrados. Faça login novamente.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("redacoes_exercicio").insert({
        exercicio_id: exercicioId,
        user_id: studentData.id ?? null,
        nome_aluno: studentData.nome,
        email_aluno: studentData.email.toLowerCase().trim(),
        turma: studentData.turma ?? null,
        redacao_texto: resposta.trim(),
        corrigida: false,
        status_corretor_1: "pendente",
      });

      if (error) throw error;

      toast.success("Atividade enviada com sucesso!");
      setJaSubmeteu(true);
      onSubmitSuccess?.();
      onClose();
    } catch (err) {
      console.error("Erro ao enviar atividade:", err);
      toast.error("Erro ao enviar a atividade. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900">
            {exercicioTitulo}
          </DialogTitle>
        </DialogHeader>

        {loadingData ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        ) : jaSubmeteu ? (
          <div className="text-center py-10 space-y-2">
            <div className="text-4xl">✓</div>
            <p className="text-lg font-semibold text-green-700">Atividade já enviada</p>
            <p className="text-sm text-gray-500">
              Você já enviou sua resposta para esta atividade. Aguarde a correção.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Enunciado */}
            {enunciado && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  <BookOpen className="w-4 h-4 text-purple-600" />
                  Enunciado
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {enunciado}
                </div>
              </div>
            )}

            {/* Critérios */}
            {criterios.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  <ClipboardList className="w-4 h-4 text-purple-600" />
                  Critérios de avaliação
                </div>
                <ul className="space-y-1">
                  {criterios.map((c, i) => (
                    <li key={c.id} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="mt-0.5 w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-xs flex items-center justify-center font-semibold shrink-0">
                        {i + 1}
                      </span>
                      {c.nome}
                    </li>
                  ))}
                </ul>

                {/* Observação sobre escala */}
                <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Cada critério será avaliado em uma escala de <strong>0 a 200 pontos</strong> (com intervalos de 40: 0, 40, 80, 120, 160 ou 200).
                    A nota final será convertida automaticamente para a escala de <strong>0 a 1000</strong>.
                  </span>
                </div>
              </div>
            )}

            {/* Campo de resposta */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Sua resposta
              </div>
              <Textarea
                value={resposta}
                onChange={(e) => setResposta(e.target.value)}
                placeholder="Digite sua resposta aqui..."
                rows={8}
                className="text-sm resize-none leading-relaxed"
              />
              <p className="text-xs text-gray-400 text-right">
                {resposta.trim().split(/\s+/).filter(Boolean).length} palavras
              </p>
            </div>

            {/* Botão de envio */}
            <Button
              onClick={handleSubmit}
              disabled={submitting || !resposta.trim()}
              className="w-full bg-[#3F0077] hover:bg-[#662F96] text-white font-semibold"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>
              ) : (
                "Enviar atividade"
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
