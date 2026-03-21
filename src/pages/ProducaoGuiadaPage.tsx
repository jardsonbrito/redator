import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StudentHeader } from "@/components/StudentHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TooltipProvider } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { useVisualizacaoRedacao } from "@/hooks/useVisualizacaoRedacao";
import { toast } from "sonner";
import {
  Loader2, ArrowLeft, BookOpen, ClipboardList, Info,
  CheckCircle, Hourglass, RotateCcw, AlertCircle, CheckCircle2,
} from "lucide-react";
import { usePageTitle } from "@/hooks/useBreadcrumbs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";

interface Criterio {
  id: string;
  nome: string;
  ordem: number;
}

interface ExercicioInfo {
  titulo: string;
  enunciado: string | null;
}

interface SubmissaoInfo {
  id: string;
  redacao_texto: string | null;
  status_corretor_1: string | null;
  corrigida: boolean;
  nota_total: number | null;
  data_envio: string | null;
  data_correcao: string | null;
  comentario_admin: string | null;
  motivo_devolucao: string | null;
}

const ProducaoGuiadaPage = () => {
  const { id: exercicioId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { studentData } = useStudentAuth();
  const { registrarVisualizacao, isRegistrando } = useVisualizacaoRedacao();

  const [exercicio, setExercicio] = useState<ExercicioInfo | null>(null);
  const [criterios, setCriterios] = useState<Criterio[]>([]);
  const [resposta, setResposta] = useState("");
  const [submissao, setSubmissao] = useState<SubmissaoInfo | null>(null);
  const [ciente, setCiente] = useState(false);
  const [jaVisualizouDB, setJaVisualizouDB] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [entendiSucesso, setEntendiSucesso] = useState(false);

  usePageTitle("Produção Guiada");

  useEffect(() => {
    if (exercicioId) carregarDados();
  }, [exercicioId]);

  const carregarDados = async () => {
    if (!exercicioId) return;
    setLoadingData(true);
    try {
      const email = studentData.email?.toLowerCase().trim() ?? "";

      const [exercicioRes, criteriosRes, submissaoRes] = await Promise.all([
        supabase
          .from("exercicios")
          .select("titulo, enunciado")
          .eq("id", exercicioId)
          .single(),

        supabase
          .from("producao_guiada_criterios")
          .select("id, nome, ordem")
          .eq("exercicio_id", exercicioId)
          .order("ordem"),

        email
          ? supabase
              .from("redacoes_exercicio")
              .select("id, redacao_texto, status_corretor_1, corrigida, nota_total, data_envio, data_correcao, comentario_admin, motivo_devolucao")
              .eq("exercicio_id", exercicioId)
              .ilike("email_aluno", email)
              .limit(1)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (exercicioRes.error || !exercicioRes.data) {
        toast.error("Exercício não encontrado.");
        navigate("/exercicios");
        return;
      }

      setExercicio(exercicioRes.data);
      setCriterios(criteriosRes.data ?? []);

      if (submissaoRes.data) {
        const sub = submissaoRes.data as SubmissaoInfo;
        setSubmissao(sub);

        // Se devolvida, verificar se o aluno já viu a devolução
        if (sub.status_corretor_1 === "devolvida" && email) {
          const { data: viz } = await supabase
            .from("redacao_devolucao_visualizacoes")
            .select("id")
            .eq("redacao_id", sub.id)
            .ilike("email_aluno", email)
            .maybeSingle();

          const visualizou = !!viz;
          setJaVisualizouDB(visualizou);
          setCiente(visualizou);
          if (visualizou) {
            // Pré-preencher com o texto anterior para edição
            setResposta(sub.redacao_texto ?? "");
          }
        }
      }
    } catch (err) {
      console.error("Erro ao carregar atividade:", err);
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

    const nomeAluno = studentData.nomeUsuario?.trim();
    const emailAluno = studentData.email?.toLowerCase().trim();

    if (!nomeAluno || !emailAluno) {
      toast.error("Sessão expirada. Faça login novamente.");
      navigate("/aluno-login");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("redacoes_exercicio").insert({
        exercicio_id: exercicioId,
        user_id: null,
        nome_aluno: nomeAluno,
        email_aluno: emailAluno,
        turma: studentData.turma ?? null,
        redacao_texto: resposta.trim(),
        corrigida: false,
        status_corretor_1: "pendente",
      });

      if (error) throw error;

      toast.success("Atividade enviada com sucesso!");
      await carregarDados();
    } catch (err) {
      console.error("Erro ao enviar atividade:", err);
      toast.error("Erro ao enviar a atividade. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReenviar = async () => {
    if (!resposta.trim() || !submissao) {
      toast.error("Escreva sua resposta antes de reenviar.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("redacoes_exercicio")
        .update({
          redacao_texto: resposta.trim(),
          status_corretor_1: "reenviado",
          corrigida: false,
          nota_total: null,
          data_correcao: null,
          motivo_devolucao: null,
          data_envio: new Date().toISOString(),
        })
        .eq("id", submissao.id);

      if (error) throw error;

      toast.success("Atividade reenviada com sucesso!");
      setResposta("");
      setCiente(false);
      setJaVisualizouDB(false);
      setEntendiSucesso(false);
      await carregarDados();
    } catch (err) {
      console.error("Erro ao reenviar atividade:", err);
      toast.error("Erro ao reenviar a atividade. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEntendi = async () => {
    if (!submissao) return;
    const emailAluno = studentData.email?.toLowerCase().trim() ?? "";

    const resultado = await registrarVisualizacao({
      redacao_id: submissao.id,
      tabela_origem: "redacoes_exercicio",
      email_aluno: emailAluno,
    });

    if (resultado.success) {
      setEntendiSucesso(true);
      // Após breve confirmação, mostrar modo de edição
      setTimeout(() => {
        setCiente(true);
        setJaVisualizouDB(true);
        setEntendiSucesso(false);
        setResposta(submissao.redacao_texto ?? "");
      }, 1800);
    }
  };

  const formatarData = (iso: string | null) => {
    if (!iso) return "—";
    try {
      return format(new Date(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return iso;
    }
  };

  const isDevolvida = submissao?.status_corretor_1 === "devolvida";
  const isDevolvida_semCiencia = isDevolvida && !ciente;
  const isDevolvida_comCiencia = isDevolvida && ciente;

  return (
    <ProtectedRoute>
      <TooltipProvider>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
          <StudentHeader pageTitle="Produção Guiada" />

          <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <button
              onClick={() => navigate("/exercicios")}
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para Exercícios
            </button>

            {loadingData ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
              </div>

            ) : isDevolvida_semCiencia ? (
              /* ── Modo devolução — aguardando ciência do aluno ── */
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-6">
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">{exercicio?.titulo}</h1>
                  <p className="text-xs text-purple-600 font-medium uppercase tracking-wide">Produção Guiada</p>
                </div>

                {/* Banner de devolução */}
                <div className="bg-red-50 border border-red-200 rounded-2xl shadow-md p-6 space-y-4">
                  <div className="flex items-center gap-2 text-red-700 font-semibold">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    Atividade devolvida para ajustes
                  </div>
                  <p className="text-sm text-gray-700">
                    Sua atividade foi devolvida pelo professor para ajustes.
                    Veja o motivo abaixo e envie novamente após corrigir.
                  </p>
                  <div className="bg-white border-l-4 border-red-400 rounded-lg p-4 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {submissao?.motivo_devolucao || "Motivo não especificado."}
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700 flex items-start gap-2">
                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      <strong>Próximos passos:</strong> Corrija os pontos indicados e reenvie sua atividade para nova avaliação.
                    </span>
                  </div>

                  {entendiSucesso ? (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center space-y-1">
                      <div className="flex items-center justify-center gap-2 text-green-700 font-semibold">
                        <CheckCircle2 className="w-5 h-5" />
                        Marcado como ciente!
                      </div>
                      <p className="text-xs text-green-600">Preparando o modo de edição...</p>
                    </div>
                  ) : (
                    <div className="flex justify-center pt-2">
                      <Button
                        onClick={handleEntendi}
                        disabled={isRegistrando}
                        className="px-8 bg-[#3F0077] hover:bg-[#662F96] text-white font-semibold"
                      >
                        {isRegistrando ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Registrando...</>
                        ) : (
                          <>👍 Entendi</>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>

            ) : isDevolvida_comCiencia ? (
              /* ── Modo reenvio — aluno ciente, pode editar e reenviar ── */
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-6">
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">{exercicio?.titulo}</h1>
                  <p className="text-xs text-purple-600 font-medium uppercase tracking-wide">Produção Guiada</p>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-2 text-amber-700 text-sm font-medium">
                  <RotateCcw className="w-4 h-4 shrink-0" />
                  Você confirmou ciência. Edite sua resposta e reenvie abaixo.
                </div>

                {exercicio?.enunciado && (
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-6 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase tracking-wide">
                      <BookOpen className="w-4 h-4 text-purple-600" />
                      Enunciado
                    </div>
                    <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{exercicio.enunciado}</p>
                  </div>
                )}

                {criterios.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-6 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase tracking-wide">
                      <ClipboardList className="w-4 h-4 text-purple-600" />
                      Critérios de avaliação
                    </div>
                    <ul className="space-y-2">
                      {criterios.map((c, i) => (
                        <li key={c.id} className="flex items-start gap-3 text-sm text-gray-800">
                          <span className="mt-0.5 w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs flex items-center justify-center font-bold shrink-0">
                            {i + 1}
                          </span>
                          {c.nome}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-6 space-y-3">
                  <div className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    Sua resposta
                  </div>
                  <Textarea
                    value={resposta}
                    onChange={(e) => setResposta(e.target.value)}
                    placeholder="Edite sua resposta aqui..."
                    rows={10}
                    className="text-sm resize-none leading-relaxed"
                  />
                  <p className="text-xs text-gray-400 text-right">
                    {resposta.trim().split(/\s+/).filter(Boolean).length} palavras
                  </p>
                </div>

                <Button
                  onClick={handleReenviar}
                  disabled={submitting || !resposta.trim()}
                  className="w-full bg-[#3F0077] hover:bg-[#662F96] text-white font-semibold h-12 text-base"
                >
                  {submitting ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Reenviando...</>
                  ) : (
                    "Reenviar atividade"
                  )}
                </Button>
              </div>

            ) : submissao ? (
              /* ── Modo visualização pós-envio (aguardando ou corrigida) ── */
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-6">
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">{exercicio?.titulo}</h1>
                  <p className="text-xs text-purple-600 font-medium uppercase tracking-wide">Produção Guiada</p>
                </div>

                {exercicio?.enunciado && (
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-6 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase tracking-wide">
                      <BookOpen className="w-4 h-4 text-purple-600" />
                      Enunciado
                    </div>
                    <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{exercicio.enunciado}</p>
                  </div>
                )}

                {criterios.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-6 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase tracking-wide">
                      <ClipboardList className="w-4 h-4 text-purple-600" />
                      Critérios de avaliação
                    </div>
                    <ul className="space-y-2">
                      {criterios.map((c, i) => (
                        <li key={c.id} className="flex items-start gap-3 text-sm text-gray-800">
                          <span className="mt-0.5 w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs flex items-center justify-center font-bold shrink-0">
                            {i + 1}
                          </span>
                          {c.nome}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-6 space-y-3">
                  <div className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Sua resposta</div>
                  <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap min-h-[80px]">
                    {submissao.redacao_texto || <span className="text-gray-400 italic">Sem texto registrado.</span>}
                  </p>
                  <p className="text-xs text-gray-400">Enviado em: {formatarData(submissao.data_envio)}</p>
                </div>

                {submissao.corrigida ? (
                  <div className="bg-white rounded-2xl border border-green-200 shadow-md p-6 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-green-700 uppercase tracking-wide">
                      <CheckCircle className="w-4 h-4" />
                      Atividade corrigida
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">Corrigida em: {formatarData(submissao.data_correcao)}</p>
                      <span className="text-3xl font-bold text-green-700">
                        {submissao.nota_total ?? "—"}
                        <span className="text-base font-normal text-green-500">/1000</span>
                      </span>
                    </div>
                    {submissao.comentario_admin && (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-800">
                        <p className="font-medium mb-1">Comentário do corretor:</p>
                        <p className="leading-relaxed whitespace-pre-wrap">{submissao.comentario_admin}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-amber-200 shadow-md p-6">
                    <div className="flex items-center gap-2 text-sm font-semibold text-amber-600">
                      <Hourglass className="w-4 h-4" />
                      Aguardando correção
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Sua atividade foi recebida e será corrigida em breve.</p>
                  </div>
                )}
              </div>

            ) : (
              /* ── Modo de envio inicial ── */
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-6">
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">{exercicio?.titulo}</h1>
                  <p className="text-xs text-purple-600 font-medium uppercase tracking-wide">Produção Guiada</p>
                </div>

                {exercicio?.enunciado && (
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-6 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase tracking-wide">
                      <BookOpen className="w-4 h-4 text-purple-600" />
                      Enunciado
                    </div>
                    <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{exercicio.enunciado}</p>
                  </div>
                )}

                {criterios.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-6 space-y-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase tracking-wide">
                      <ClipboardList className="w-4 h-4 text-purple-600" />
                      Critérios de avaliação
                    </div>
                    <ul className="space-y-2">
                      {criterios.map((c, i) => (
                        <li key={c.id} className="flex items-start gap-3 text-sm text-gray-800">
                          <span className="mt-0.5 w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs flex items-center justify-center font-bold shrink-0">
                            {i + 1}
                          </span>
                          {c.nome}
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
                      <Info className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>
                        Cada critério será avaliado em uma escala de{" "}
                        <strong>0 a 200 pontos</strong> com intervalos de 40 (0, 40, 80, 120, 160 ou 200). A nota final será convertida para a escala de <strong>0 a 1000</strong>.
                      </span>
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-6 space-y-3">
                  <div className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Sua resposta</div>
                  <Textarea
                    value={resposta}
                    onChange={(e) => setResposta(e.target.value)}
                    placeholder="Digite sua resposta aqui..."
                    rows={10}
                    className="text-sm resize-none leading-relaxed"
                  />
                  <p className="text-xs text-gray-400 text-right">
                    {resposta.trim().split(/\s+/).filter(Boolean).length} palavras
                  </p>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !resposta.trim()}
                  className="w-full bg-[#3F0077] hover:bg-[#662F96] text-white font-semibold h-12 text-base"
                >
                  {submitting ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Enviando...</>
                  ) : (
                    "Enviar atividade"
                  )}
                </Button>
              </div>
            )}
          </main>
        </div>
      </TooltipProvider>
    </ProtectedRoute>
  );
};

export default ProducaoGuiadaPage;
