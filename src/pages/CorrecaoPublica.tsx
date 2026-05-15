import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

const TIPO_ERRO_LABELS: Record<string, string> = {
  ortografia: "Ortografia", acentuacao: "Acentuação", pontuacao: "Pontuação",
  concordancia: "Concordância", regencia: "Regência", crase: "Crase",
  pronome: "Pronome", verbal: "Verbal", sintatico: "Sintático", vocabulario: "Vocabulário",
  conectivo_inadequado: "Conectivo inadequado", ausencia_de_conectivo: "Ausência de conectivo",
  ausencia_de_elo: "Ausência de elo interparagrafal", repeticao: "Repetição de conectivos",
  ambiguidade_referencial: "Ambiguidade referencial", retomada_incorreta: "Retomada incorreta",
  articulacao_fragil: "Articulação frágil",
};

function formatarTipoErro(tipo: string): string {
  if (!tipo) return tipo;
  const sep = tipo.indexOf(" — ");
  if (sep === -1) return TIPO_ERRO_LABELS[tipo] ?? tipo;
  const prefix = tipo.slice(0, sep);
  const rawSuffix = tipo.slice(sep + 3);
  return `${prefix} — ${TIPO_ERRO_LABELS[rawSuffix] ?? rawSuffix}`;
}

const NOTA_COLOR = (nota: number, max = 200) => {
  const pct = nota / max;
  if (pct >= 0.8) return "text-emerald-700";
  if (pct >= 0.5) return "text-amber-600";
  return "text-red-600";
};

const NOTA_BG = (nota: number, max = 200) => {
  const pct = nota / max;
  if (pct >= 0.8) return "bg-emerald-50 border-emerald-200";
  if (pct >= 0.5) return "bg-amber-50 border-amber-200";
  return "bg-red-50 border-red-200";
};

// ─── Sub-componentes ──────────────────────────────────────────────────────────

const TextoParagrafado = ({ texto }: { texto: string }) => {
  const paras = texto.split(/\n\n+/).map(p => p.replace(/\n/g, " ").trim()).filter(Boolean);
  if (paras.length > 1) {
    return <div className="space-y-2">{paras.map((p, i) => <p key={i} className="text-sm leading-relaxed text-zinc-700">{p}</p>)}</div>;
  }
  return <p className="text-sm leading-relaxed text-zinc-700">{texto}</p>;
};

function ErrosBlock({ erros }: { erros: any[] }) {
  if (!erros.length) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
        Erros identificados ({erros.length})
      </p>
      <div className="space-y-2">
        {erros.map((erro: any, i: number) => (
          <div key={i} className="rounded-xl border-l-4 border-red-400 bg-white pl-4 pr-3 py-3">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-bold text-red-700">{formatarTipoErro(erro.tipo) || `Erro ${i + 1}`}</p>
              {erro.paragrafo && (
                <span className="text-[10px] font-semibold uppercase tracking-wide bg-zinc-100 text-zinc-500 rounded px-1.5 py-0.5">
                  {erro.paragrafo}
                </span>
              )}
            </div>
            {erro.trecho_original && <p className="mt-1 text-xs italic text-zinc-500">"{erro.trecho_original}"</p>}
            {erro.descricao && <p className="mt-1 text-sm text-zinc-700">{erro.descricao}</p>}
            {erro.sugestao && <p className="mt-1.5 text-xs font-medium text-emerald-700">✓ {erro.sugestao}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function CorrecaoPublica() {
  const { token } = useParams<{ token: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ["correcao-publica", token],
    queryFn: async () => {
      if (!token) throw new Error("Token inválido");

      const { data: link, error: linkError } = await supabase
        .from("jarvis_correcao_links" as any)
        .select("*, correcao:jarvis_correcoes(*)")
        .eq("token", token)
        .single();

      if (linkError || !link) throw new Error("Link não encontrado");
      if (!link.ativo) throw new Error("DESATIVADO");
      if (link.expira_em && new Date(link.expira_em) < new Date()) throw new Error("EXPIRADO");

      // Incrementa contagem de acessos sem bloquear a renderização
      supabase
        .from("jarvis_correcao_links" as any)
        .update({ acessos: (link.acessos || 0) + 1, ultimo_acesso_em: new Date().toISOString() })
        .eq("id", link.id)
        .then(() => {});

      return link;
    },
    enabled: !!token,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f4f0fb] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#4B0082]" />
          <p className="text-sm text-zinc-500">Carregando correção...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    const msg = (error as Error)?.message;
    const isDesativado = msg === "DESATIVADO";
    const isExpirado = msg === "EXPIRADO";
    return (
      <div className="min-h-screen bg-[#f4f0fb] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-[#dcc8f5] p-8 text-center shadow-md">
          <div className="flex justify-center mb-4">
            <div className="h-14 w-14 rounded-full bg-zinc-100 flex items-center justify-center">
              <AlertCircle className="h-7 w-7 text-zinc-400" />
            </div>
          </div>
          <h1 className="text-xl font-black text-zinc-800 mb-2">
            {isDesativado ? "Link desativado" : isExpirado ? "Link expirado" : "Link não encontrado"}
          </h1>
          <p className="text-sm text-zinc-500">
            {isDesativado
              ? "Este link foi desativado pelo professor. Entre em contato para solicitar um novo link."
              : isExpirado
              ? "Este link de compartilhamento expirou. Solicite ao professor um novo link."
              : "Este link não existe ou foi removido."}
          </p>
          <div className="mt-6 pt-6 border-t border-zinc-100">
            <p className="text-[10px] text-zinc-400">Laboratório do Professor de Redação</p>
          </div>
        </div>
      </div>
    );
  }

  const correcao = data.correcao;

  // Título da aba/share sheet: nome do aluno + tema (deve vir antes de qualquer return)
  useEffect(() => {
    if (!correcao) return;
    const prev = document.title;
    document.title = `${correcao.autor_nome} — ${correcao.tema}`;
    return () => { document.title = prev; };
  }, [correcao?.autor_nome, correcao?.tema]);

  if (!correcao) return null;

  // Normaliza correcao_ia
  let ia: any = correcao.correcao_ia;
  if (ia?.resposta_bruta && typeof ia.resposta_bruta === "string") {
    try {
      let text = ia.resposta_bruta.trim();
      if (text.startsWith("```")) {
        const nl = text.indexOf("\n");
        if (nl !== -1) {
          text = text.slice(nl + 1).trim();
          const lf = text.lastIndexOf("```");
          if (lf !== -1) text = text.slice(0, lf).trim();
        }
      }
      if (text.startsWith("{")) {
        const p = JSON.parse(text);
        if (p && typeof p === "object" && !Array.isArray(p)) ia = p;
      }
    } catch {}
  }

  const erros: any[] = ia?.erros || [];
  const estrutura = ia?.estrutura;
  const errosComComp = erros.filter((e: any) => !!e.competencia_relacionada);
  const usaClassPorComp = errosComComp.length === erros.length && erros.length > 0;

  const getErrosDaComp = (comp: string): any[] => {
    if (usaClassPorComp) return erros.filter((e: any) => e.competencia_relacionada === comp);
    const inferir = (tipo: string) => ["coesão", "coerência"].includes(tipo) ? "c4" : "c1";
    return erros.filter((e: any) => inferir(e.tipo ?? "") === comp);
  };

  const textoOriginal = correcao.transcricao_confirmada || correcao.transcricao_ocr_original;
  const notasComp: Record<string, number> = {
    c1: correcao.nota_c1 ?? ia?.competencias?.c1?.nota ?? 0,
    c2: correcao.nota_c2 ?? ia?.competencias?.c2?.nota ?? 0,
    c3: correcao.nota_c3 ?? ia?.competencias?.c3?.nota ?? 0,
    c4: correcao.nota_c4 ?? ia?.competencias?.c4?.nota ?? 0,
    c5: correcao.nota_c5 ?? ia?.competencias?.c5?.nota ?? 0,
  };

  const COMP_LABELS_ORIENTACOES: Record<string, string> = {
    geral: "Orientações Gerais", c1: "Competência 1", c2: "Competência 2",
    c3: "Competência 3", c4: "Competência 4", c5: "Competência 5",
  };
  const COMP_ORDER = ["geral", "c1", "c2", "c3", "c4", "c5"];
  const orientacoesAgrupadas: Array<{ label: string; items: string[] }> =
    ia?.orientacoes_selecionadas
      ? COMP_ORDER
          .filter(k => (ia.orientacoes_selecionadas[k] ?? []).length > 0)
          .map(k => ({ label: COMP_LABELS_ORIENTACOES[k], items: ia.orientacoes_selecionadas[k] }))
      : [];

  const COMPETENCIAS = [
    { key: "c1", num: "1" }, { key: "c2", num: "2" }, { key: "c3", num: "3" },
    { key: "c4", num: "4" }, { key: "c5", num: "5" },
  ];

  return (
    <div className="min-h-screen bg-[#f4f0fb]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3f0776] to-[#7630b8] text-white">
        <div className="max-w-2xl mx-auto px-4 py-5 flex items-center gap-4">
          <img
            src="/lovable-uploads/f86e5092-80dc-4e06-bb6a-f4cec6ee1b5b.png"
            alt="Logo"
            className="h-10 w-10 object-contain bg-white/10 rounded-xl p-1.5"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <div>
            <h1 className="text-xl font-black leading-tight tracking-tight">Laboratório do Professor de Redação</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Identificação */}
        <div className="rounded-2xl border border-[#dcc8f5] bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-[#4B0082]">{correcao.autor_nome}</h2>
          <p className="text-sm font-medium text-zinc-600 mt-0.5">{correcao.tema}</p>
          <div className="flex flex-wrap gap-3 mt-2">
            {correcao.corrigida_em && (
              <span className="text-xs text-zinc-400">
                Corrigida em{" "}
                {format(new Date(correcao.corrigida_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
            )}
            {correcao.tipo_correcao === "recorrecao" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                Revisão #{correcao.numero_versao}
              </span>
            )}
          </div>
        </div>

        {/* Notas */}
        <div className="grid grid-cols-6 gap-2">
          <div className="flex flex-col items-center justify-center rounded-2xl py-3 bg-gradient-to-b from-[#4B0082] to-[#7c2fd9] text-white shadow">
            <p className="text-[9px] font-bold uppercase tracking-wider opacity-75">Nota Final</p>
            <p className="mt-0.5 text-2xl font-black leading-none">{correcao.nota_total ?? "—"}</p>
            <p className="mt-1 text-[9px] opacity-60">/1000</p>
          </div>
          {COMPETENCIAS.map(comp => {
            const nota = notasComp[comp.key] ?? 0;
            return (
              <div key={comp.key} className={`flex flex-col items-center gap-1 rounded-2xl border py-3 ${NOTA_BG(nota)}`}>
                <span className="text-[9px] font-extrabold uppercase tracking-wide text-zinc-500">C{comp.num}</span>
                <span className={`text-xl font-black leading-none ${NOTA_COLOR(nota)}`}>{nota}</span>
                <span className="text-[9px] font-medium text-zinc-400">/200</span>
              </div>
            );
          })}
        </div>

        {/* Texto original */}
        {textoOriginal && (
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Texto da redação</p>
            <p className="text-sm leading-relaxed text-zinc-800 whitespace-pre-wrap">{textoOriginal}</p>
          </div>
        )}

        {/* Competências */}
        {ia?.competencias && COMPETENCIAS.map(comp => {
          const compIA = ia.competencias[comp.key];
          if (!compIA) return null;
          return (
            <div key={comp.key} className="rounded-2xl border border-[#dcc8f5] bg-[#fbf8ff] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#4B0082] px-3 py-1 text-xs font-extrabold text-white">
                  Competência {comp.num}
                </span>
                <span className={`text-2xl font-black ${NOTA_COLOR(notasComp[comp.key] ?? 0)}`}>
                  {notasComp[comp.key] ?? 0}
                  <span className="text-sm font-normal text-zinc-400">/200</span>
                </span>
              </div>

              {compIA.justificativa && (
                <div>
                  <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-zinc-500">Comentário</p>
                  <TextoParagrafado texto={compIA.justificativa} />
                </div>
              )}

              {comp.key === "c1" && <ErrosBlock erros={getErrosDaComp("c1")} />}

              {comp.key === "c2" && (
                <div className="space-y-3">
                  {estrutura?.estrutura_dissertativo_argumentativa && (
                    <div className="rounded-xl bg-white border border-[#e8d8f9] p-4">
                      <div className="flex items-center gap-2 mb-1">
                        {estrutura.estrutura_dissertativo_argumentativa.status === "completa"
                          ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          : <XCircle className="h-4 w-4 text-red-500" />}
                        <p className="text-xs font-bold text-zinc-500">
                          Estrutura ({estrutura.estrutura_dissertativo_argumentativa.status})
                        </p>
                      </div>
                      <TextoParagrafado texto={estrutura.estrutura_dissertativo_argumentativa.descricao} />
                    </div>
                  )}
                  {estrutura?.tese_identificada && (
                    <div className="rounded-xl bg-white border border-[#e8d8f9] p-4">
                      <p className="text-xs font-bold text-zinc-500 mb-1">Tese identificada</p>
                      <p className="text-sm italic text-zinc-700">"{estrutura.tese_identificada}"</p>
                    </div>
                  )}
                  {estrutura?.uso_repertorio && (
                    <div className="rounded-xl bg-white border border-[#e8d8f9] p-4">
                      <p className="mb-1 text-xs font-bold text-zinc-500">Uso de Repertório</p>
                      <TextoParagrafado texto={estrutura.uso_repertorio} />
                    </div>
                  )}
                  <ErrosBlock erros={getErrosDaComp("c2")} />
                </div>
              )}

              {comp.key === "c3" && (
                <div className="space-y-3">
                  {estrutura?.argumentos?.length > 0 && (
                    <div className="rounded-xl bg-white border border-[#e8d8f9] p-4">
                      <p className="mb-2 text-xs font-bold text-zinc-500">Argumentos identificados</p>
                      <ul className="space-y-1.5">
                        {estrutura.argumentos.map((arg: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-zinc-700">
                            <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[#4B0082] opacity-60" />
                            {arg}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <ErrosBlock erros={getErrosDaComp("c3")} />
                </div>
              )}

              {comp.key === "c4" && <ErrosBlock erros={getErrosDaComp("c4")} />}

              {comp.key === "c5" && estrutura?.proposta_intervencao && (
                <div className="rounded-xl bg-white border border-[#e8d8f9] p-4">
                  <p className="mb-1 text-xs font-bold text-zinc-500">Elementos da Proposta</p>
                  <TextoParagrafado texto={estrutura.proposta_intervencao} />
                </div>
              )}

              {compIA.sugestoes?.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
                    Orientações para melhoria
                  </p>
                  <ul className="space-y-1.5">
                    {compIA.sugestoes.map((s: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-zinc-700">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}

        {/* Análise Global */}
        {(orientacoesAgrupadas.length > 0 || ia?.sugestoes_objetivas?.length > 0 || ia?.resumo_geral) && (
          <div className="rounded-2xl border border-[#dcc8f5] bg-[#fbf8ff] p-5 space-y-4">
            <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Análise Global</p>

            {orientacoesAgrupadas.length > 0 && (
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-zinc-500">
                  Orientações pedagógicas
                </p>
                <div className="space-y-3">
                  {orientacoesAgrupadas.map(({ label, items }) => (
                    <div key={label}>
                      <p className="mb-1.5 text-xs font-semibold text-[#4B0082]">{label}</p>
                      <ul className="space-y-1.5">
                        {items.map((s: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-zinc-700">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {orientacoesAgrupadas.length === 0 && ia?.sugestoes_objetivas?.length > 0 && (
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-zinc-500">
                  Orientações gerais de melhoria
                </p>
                <ul className="space-y-2">
                  {ia.sugestoes_objetivas.map((s: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-zinc-700">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {ia?.resumo_geral && (
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#4B0082]">
                  Comentário pedagógico final
                </p>
                <p className="text-sm leading-relaxed text-zinc-700">{ia.resumo_geral}</p>
              </div>
            )}
          </div>
        )}

        {/* Resposta bruta (fallback) */}
        {ia?.resposta_bruta && !ia?.competencias && (
          <div className="rounded-2xl border border-[#dcc8f5] bg-[#fbf8ff] p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-zinc-500 mb-3">Correção</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">
              {String(ia.resposta_bruta)}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between py-4 border-t border-[#dcc8f5]">
          <p className="text-[10px] text-zinc-400">Laboratório do Professor de Redação</p>
          <p className="text-[10px] text-zinc-400">Corrigido por Jarvis IA</p>
        </div>
      </div>
    </div>
  );
}
