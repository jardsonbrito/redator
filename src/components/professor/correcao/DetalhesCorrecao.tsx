import { useState } from "react";
import { JarvisCorrecao } from "@/hooks/useJarvisCorrecao";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, XCircle, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  correcao: JarvisCorrecao;
}

const COMPETENCIAS = [
  { key: "c1", num: "1" },
  { key: "c2", num: "2" },
  { key: "c3", num: "3" },
  { key: "c4", num: "4" },
  { key: "c5", num: "5" },
];

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

// Compatibilidade retroativa: se os erros não têm competencia_relacionada (correções v1),
// infere a competência pelo tipo do erro para manter o comportamento anterior.
function inferirCompetencia(tipo: string): string {
  if (["coesão", "coerência"].includes(tipo)) return "c4";
  return "c1";
}

export const DetalhesCorrecao = ({ correcao }: Props) => {
  const correcaoIA = correcao.correcao_ia;
  const [secaoAtiva, setSecaoAtiva] = useState<string | null>("c1");
  const [showTexto, setShowTexto] = useState(false);

  const textoOriginal = correcao.transcricao_confirmada || correcao.transcricao_ocr_original;

  const competenciaAtiva = secaoAtiva && secaoAtiva !== "nota_final" ? secaoAtiva : null;

  if (correcao.status !== "corrigida" || !correcaoIA) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {correcao.status === "erro"
            ? `Erro ao processar: ${correcao.erro_mensagem}`
            : "Esta redação ainda não foi corrigida."}
        </AlertDescription>
      </Alert>
    );
  }

  const notasComp: Record<string, number> = {
    c1: correcao.nota_c1 ?? correcaoIA.competencias?.c1?.nota ?? 0,
    c2: correcao.nota_c2 ?? correcaoIA.competencias?.c2?.nota ?? 0,
    c3: correcao.nota_c3 ?? correcaoIA.competencias?.c3?.nota ?? 0,
    c4: correcao.nota_c4 ?? correcaoIA.competencias?.c4?.nota ?? 0,
    c5: correcao.nota_c5 ?? correcaoIA.competencias?.c5?.nota ?? 0,
  };

  const compIA = competenciaAtiva ? correcaoIA.competencias?.[competenciaAtiva] : null;
  const estrutura = correcaoIA.estrutura;
  const erros: any[] = correcaoIA.erros || [];

  // Detecta se a correção usa o novo campo competencia_relacionada (v2+)
  const errosComClassificacao = erros.filter((e: any) => !!e.competencia_relacionada);
  const usaClassificacaoPorComp = errosComClassificacao.length === erros.length && erros.length > 0;

  // Retorna os erros relevantes para a competência ativa.
  // Se a correção for v2+ (todos têm competencia_relacionada), filtra pelo campo.
  // Se for v1 (sem o campo), aplica fallback por tipo.
  const getErrosDaComp = (comp: string): any[] => {
    if (usaClassificacaoPorComp) {
      return erros.filter((e: any) => e.competencia_relacionada === comp);
    }
    // Fallback para correções v1: usa tipo para inferir a competência
    return erros.filter((e: any) => inferirCompetencia(e.tipo ?? "") === comp);
  };

  const COMP_LABELS_ORIENTACOES: Record<string, string> = {
    geral: "Orientações Gerais",
    c1: "Competência 1",
    c2: "Competência 2",
    c3: "Competência 3",
    c4: "Competência 4",
    c5: "Competência 5",
  };
  const COMP_ORDER = ["geral", "c1", "c2", "c3", "c4", "c5"];

  const orientacoesAgrupadas: Array<{ label: string; items: string[] }> =
    correcaoIA.orientacoes_selecionadas
      ? COMP_ORDER
          .filter((k) => (correcaoIA.orientacoes_selecionadas[k] ?? []).length > 0)
          .map((k) => ({ label: COMP_LABELS_ORIENTACOES[k], items: correcaoIA.orientacoes_selecionadas[k] }))
      : [];

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-0.5">
          <h3 className="text-xl font-black text-zinc-900">{correcao.autor_nome}</h3>
          <p className="text-sm font-medium text-zinc-600">{correcao.tema}</p>
          {correcao.corrigida_em && (
            <p className="text-xs text-zinc-400">
              Corrigida em{" "}
              {format(new Date(correcao.corrigida_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          )}
        </div>
        {textoOriginal && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTexto((v) => !v)}
            className="shrink-0 gap-1.5 text-xs"
          >
            <FileText className="h-3.5 w-3.5" />
            Texto da redação
            {showTexto ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        )}
      </div>

      {/* Texto original da redação */}
      {textoOriginal && showTexto && (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Texto da redação</p>
          <p className="text-sm leading-relaxed text-zinc-800 whitespace-pre-wrap">{textoOriginal}</p>
        </div>
      )}

      {/* Nota final + Cards de competência — grid de 6 colunas iguais */}
      <div className="grid grid-cols-6 gap-2">
        {/* Nota final — clicável */}
        <button
          type="button"
          onClick={() => setSecaoAtiva(secaoAtiva === "nota_final" ? null : "nota_final")}
          className={`flex flex-col items-center justify-center rounded-2xl py-3 transition ${
            secaoAtiva === "nota_final"
              ? "bg-gradient-to-b from-[#4B0082] to-[#7c2fd9] text-white shadow-[0_4px_14px_rgba(75,0,130,0.30)]"
              : "bg-gradient-to-b from-[#6B3294] to-[#9a3fe8] text-white opacity-80 hover:opacity-100"
          }`}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-75">Nota Final</p>
          <p className="mt-0.5 text-3xl font-black leading-none">{correcao.nota_total}</p>
          <p className="mt-1 text-[10px] opacity-60">/1000</p>
        </button>

        {/* Cards de competência */}
        {COMPETENCIAS.map((comp) => {
          const nota = notasComp[comp.key] ?? 0;
          const isAtiva = secaoAtiva === comp.key;
          return (
            <button
              key={comp.key}
              type="button"
              onClick={() => setSecaoAtiva(isAtiva ? null : comp.key)}
              className={`flex flex-col items-center gap-1 rounded-2xl border py-3 transition ${
                isAtiva
                  ? "border-[#4B0082] bg-[#efe4ff] shadow-[0_4px_14px_rgba(75,0,130,0.14)]"
                  : `${NOTA_BG(nota)} hover:shadow-sm`
              }`}
            >
              <span className="text-[10px] font-extrabold uppercase tracking-wide text-zinc-500">
                C{comp.num}
              </span>
              <span
                className={`text-2xl font-black leading-none ${
                  isAtiva ? "text-[#4B0082]" : NOTA_COLOR(nota)
                }`}
              >
                {nota}
              </span>
              <span className="text-[10px] font-medium text-zinc-400">/200</span>
            </button>
          );
        })}
      </div>

      {/* Detalhe da competência selecionada */}
      {competenciaAtiva && compIA && (
        <div className="rounded-2xl border border-[#dcc8f5] bg-[#fbf8ff] p-5 space-y-4">

          {/* Justificativa da competência */}
          {compIA.justificativa && (
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-zinc-500">
                Comentário
              </p>
              <p className="text-sm leading-relaxed text-zinc-700">{compIA.justificativa}</p>
            </div>
          )}

          {/* C1 — Norma padrão: erros gramaticais, ortográficos etc. */}
          {competenciaAtiva === "c1" && (() => {
            const errosDaComp = getErrosDaComp("c1");
            if (!errosDaComp.length) return null;
            return (
              <ErrosBlock erros={errosDaComp} />
            );
          })()}

          {/* C2 — Tema, tese e repertório */}
          {competenciaAtiva === "c2" && (
            <div className="space-y-3">
              {estrutura?.tese_identificada && (
                <div className="rounded-xl bg-white border border-[#e8d8f9] p-4">
                  <div className="flex items-center gap-2 mb-1">
                    {estrutura.possui_tese ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <p className="text-xs font-bold text-zinc-500">Tese identificada</p>
                  </div>
                  <p className="text-sm italic text-zinc-700">
                    "{estrutura.tese_identificada}"
                  </p>
                </div>
              )}
              {estrutura?.uso_repertorio && (
                <div className="rounded-xl bg-white border border-[#e8d8f9] p-4">
                  <p className="mb-1 text-xs font-bold text-zinc-500">Uso de Repertório</p>
                  <p className="text-sm text-zinc-700">{estrutura.uso_repertorio}</p>
                </div>
              )}
              {(() => {
                const errosDaComp = getErrosDaComp("c2");
                if (!errosDaComp.length) return null;
                return <ErrosBlock erros={errosDaComp} />;
              })()}
            </div>
          )}

          {/* C3 — Desenvolvimento argumentativo */}
          {competenciaAtiva === "c3" && (
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
              {(() => {
                const errosDaComp = getErrosDaComp("c3");
                if (!errosDaComp.length) return null;
                return <ErrosBlock erros={errosDaComp} />;
              })()}
            </div>
          )}

          {/* C4 — Coesão e coerência */}
          {competenciaAtiva === "c4" && (() => {
            const errosDaComp = getErrosDaComp("c4");
            if (!errosDaComp.length) return null;
            return <ErrosBlock erros={errosDaComp} />;
          })()}

          {/* C5 — Proposta de intervenção */}
          {competenciaAtiva === "c5" && estrutura?.proposta_intervencao && (
            <div className="rounded-xl bg-white border border-[#e8d8f9] p-4">
              <p className="mb-1 text-xs font-bold text-zinc-500">Elementos da Proposta</p>
              <p className="text-sm text-zinc-700">{estrutura.proposta_intervencao}</p>
            </div>
          )}

          {/* Sugestões da competência (campo opcional) */}
          {compIA.sugestoes && compIA.sugestoes.length > 0 && (
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
      )}

      {/* Seção Nota Final — orientações pedagógicas + comentário final */}
      {secaoAtiva === "nota_final" && (
        <div className="rounded-2xl border border-[#dcc8f5] bg-[#fbf8ff] p-5 space-y-4">
          {/* Orientações do banco (campo orientacoes_selecionadas) */}
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

          {/* Fallback: sugestoes_objetivas para correções sem banco de comentários ativo */}
          {orientacoesAgrupadas.length === 0 && correcaoIA.sugestoes_objetivas?.length > 0 && (
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-zinc-500">
                Orientações gerais de melhoria
              </p>
              <ul className="space-y-2">
                {correcaoIA.sugestoes_objetivas.map((s: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-zinc-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {correcaoIA.resumo_geral && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#4B0082]">
                Comentário pedagógico final
              </p>
              <p className="text-sm leading-relaxed text-zinc-700">{correcaoIA.resumo_geral}</p>
            </div>
          )}

          {orientacoesAgrupadas.length === 0 && !correcaoIA.sugestoes_objetivas?.length && !correcaoIA.resumo_geral && (
            <p className="text-sm text-zinc-500">Nenhum comentário geral disponível.</p>
          )}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Componente reutilizável para bloco de erros (usado em todas as abas)
// ─────────────────────────────────────────────────────────────────
function ErrosBlock({ erros }: { erros: any[] }) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
        Erros identificados ({erros.length})
      </p>
      <div className="space-y-2">
        {erros.map((erro: any, i: number) => (
          <div
            key={i}
            className="rounded-xl border-l-4 border-red-400 bg-white pl-4 pr-3 py-3"
          >
            <p className="text-xs font-bold text-red-700">
              {erro.tipo || `Erro ${i + 1}`}
            </p>
            {erro.trecho_original && (
              <p className="mt-1 text-xs italic text-zinc-500">
                "{erro.trecho_original}"
              </p>
            )}
            {erro.descricao && (
              <p className="mt-1 text-sm text-zinc-700">{erro.descricao}</p>
            )}
            {erro.sugestao && (
              <p className="mt-1.5 text-xs font-medium text-emerald-700">
                ✓ {erro.sugestao}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
