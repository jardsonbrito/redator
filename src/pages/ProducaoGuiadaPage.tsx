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
  CheckCircle, Hourglass, RotateCcw, AlertCircle, CheckCircle2, ChevronDown,
} from "lucide-react";
import { usePageTitle } from "@/hooks/useBreadcrumbs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";

interface Criterio {
  id: string;
  nome: string;
  ordem: number;
}

const MAX_POR_CRITERIO = 200;

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
  const [notasCriterios, setNotasCriterios] = useState<Record<string, number>>({});
  const [detalheAberto, setDetalheAberto] = useState(false);

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

        // Se corrigida, buscar notas por critério para a Vista pedagógica
        if (sub.corrigida) {
          const { data: notasData } = await supabase
            .from("producao_guiada_notas_criterios")
            .select("criterio_id, nota")
            .eq("resposta_id", sub.id);

          if (notasData && notasData.length > 0) {
            const notasMap: Record<string, number> = {};
            notasData.forEach(n => { notasMap[n.criterio_id] = n.nota; });
            setNotasCriterios(notasMap);
          }
        }

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

      toast.success("Atividade enviada com sucesso!", { duration: 1500 });
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

    const emailAluno = studentData.email?.toLowerCase().trim() ?? "";
    if (!emailAluno) {
      toast.error("Sessão expirada. Faça login novamente.");
      navigate("/aluno-login");
      return;
    }

    setSubmitting(true);
    try {
      const { data: sucesso, error } = await supabase.rpc(
        "reenviar_atividade_producao_guiada",
        {
          p_redacao_id: submissao.id,
          p_email_aluno: emailAluno,
          p_novo_texto: resposta.trim(),
        }
      );

      if (error) throw error;

      if (!sucesso) {
        toast.error("Não foi possível reenviar. A atividade pode já ter sido processada. Atualize a página.");
        await carregarDados();
        return;
      }

      toast.success("Atividade reenviada com sucesso!", { duration: 1500 });
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

            ) : submissao && submissao.corrigida ? (
              /* ── Modo correção — Vista pedagógica em primeiro plano ── */
              <div className="space-y-5">

                {/* BLOCO 1: Vista pedagógica */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-6 space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Vista pedagógica</h2>
                    <p className="text-xs text-gray-400 mt-1">Corrigida em: {formatarData(submissao.data_correcao)}</p>
                  </div>

                  <div className="border-t border-gray-100" />

                  {/* Nota final */}
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">Nota final</p>
                    <div className="flex items-end gap-3 mb-3">
                      <span className="text-5xl font-bold text-gray-900 leading-none tabular-nums">
                        {submissao.nota_total ?? "—"}
                      </span>
                      <span className="text-lg text-gray-400 mb-1">/ 1000</span>
                    </div>
                    {submissao.nota_total !== null && (
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            (submissao.nota_total / 1000) >= 0.8 ? "bg-green-500" :
                            (submissao.nota_total / 1000) >= 0.5 ? "bg-amber-400" : "bg-red-400"
                          }`}
                          style={{ width: `${Math.round((submissao.nota_total / 1000) * 100)}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Avaliação por critério — dinâmica */}
                  {criterios.length > 0 && Object.keys(notasCriterios).length > 0 && (
                    <>
                      <div className="border-t border-gray-100" />
                      <div>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-4">
                          Avaliação por critério
                        </p>
                        <div className="space-y-4">
                          {criterios.map((c, i) => {
                            const nota = notasCriterios[c.id];
                            const temNota = nota !== undefined;
                            const pct = temNota ? Math.round((nota / MAX_POR_CRITERIO) * 100) : 0;
                            return (
                              <div key={c.id} className="space-y-1.5">
                                <div className="flex items-baseline justify-between gap-4">
                                  <p className="text-sm text-gray-800 leading-snug">
                                    <span className="text-gray-400 text-xs font-medium mr-1.5">{i + 1}.</span>
                                    {c.nome}
                                  </p>
                                  <span className="text-sm font-semibold text-gray-700 shrink-0 tabular-nums">
                                    {temNota ? nota : "—"}
                                    <span className="text-xs font-normal text-gray-400"> / {MAX_POR_CRITERIO}</span>
                                  </span>
                                </div>
                                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  {temNota && (
                                    <div
                                      className={`h-full rounded-full ${
                                        pct >= 80 ? "bg-green-400" :
                                        pct >= 50 ? "bg-amber-400" : "bg-red-400"
                                      }`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Devolutiva do professor */}
                  {submissao.comentario_admin && (
                    <>
                      <div className="border-t border-gray-100" />
                      <div>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-2">
                          Devolutiva do professor
                        </p>
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {submissao.comentario_admin}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* BLOCO 2: Sua produção textual */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-6 space-y-3">
                  <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Sua produção textual</p>
                  <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap min-h-[80px]">
                    {submissao.redacao_texto || <span className="text-gray-400 italic">Sem texto registrado.</span>}
                  </p>
                  <p className="text-xs text-gray-400">Enviado em: {formatarData(submissao.data_envio)}</p>
                </div>

                {/* BLOCO 3: Detalhes da atividade (secundário, expansível) */}
                {(exercicio?.enunciado || criterios.length > 0) && (
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <button
                      onClick={() => setDetalheAberto(v => !v)}
                      className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-700">{exercicio?.titulo}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Produção Guiada · detalhes da atividade</p>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${detalheAberto ? "rotate-180" : ""}`}
                      />
                    </button>

                    {detalheAberto && (
                      <div className="px-6 pb-6 space-y-4 border-t border-gray-100">
                        {exercicio?.enunciado && (
                          <div className="pt-4 space-y-2">
                            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                              <BookOpen className="w-3.5 h-3.5 text-purple-500" />
                              Enunciado
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{exercicio.enunciado}</p>
                          </div>
                        )}

                        {criterios.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                              <ClipboardList className="w-3.5 h-3.5 text-purple-500" />
                              Critérios de avaliação
                            </div>
                            <ul className="space-y-1.5">
                              {criterios.map((c, i) => (
                                <li key={c.id} className="flex items-start gap-2.5 text-sm text-gray-600">
                                  <span className="mt-0.5 w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-xs flex items-center justify-center font-semibold shrink-0">
                                    {i + 1}
                                  </span>
                                  {c.nome}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

            ) : submissao ? (
              /* ── Modo visualização pós-envio (aguardando correção) ── */
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
                  <div className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Sua produção textual</div>
                  <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap min-h-[80px]">
                    {submissao.redacao_texto || <span className="text-gray-400 italic">Sem texto registrado.</span>}
                  </p>
                  <p className="text-xs text-gray-400">Enviado em: {formatarData(submissao.data_envio)}</p>
                </div>

                <div className="bg-white rounded-2xl border border-amber-200 shadow-md p-6">
                  <div className="flex items-center gap-2 text-sm font-semibold text-amber-600">
                    <Hourglass className="w-4 h-4" />
                    Aguardando correção
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Sua atividade foi recebida e será corrigida em breve.</p>
                </div>
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
