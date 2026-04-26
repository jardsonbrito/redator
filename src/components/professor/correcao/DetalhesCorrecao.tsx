import { useState } from "react";
import { JarvisCorrecao } from "@/hooks/useJarvisCorrecao";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";
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

export const DetalhesCorrecao = ({ correcao }: Props) => {
  const correcaoIA = correcao.correcao_ia;
  // "nota_final" | "c1" | "c2" | "c3" | "c4" | "c5" | null
  const [secaoAtiva, setSecaoAtiva] = useState<string | null>("c1");

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

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
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
          {/* Justificativa */}
          {compIA.justificativa && (
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-zinc-500">
                Comentário
              </p>
              <p className="text-sm leading-relaxed text-zinc-700">{compIA.justificativa}</p>
            </div>
          )}

          {/* C1 — Erros identificados (todos) */}
          {competenciaAtiva === "c1" && erros.length > 0 && (
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
          )}

          {/* C2 — Repertório */}
          {competenciaAtiva === "c2" && estrutura?.uso_repertorio && (
            <div className="rounded-xl bg-white border border-[#e8d8f9] p-4">
              <p className="mb-1 text-xs font-bold text-zinc-500">Uso de Repertório</p>
              <p className="text-sm text-zinc-700">{estrutura.uso_repertorio}</p>
            </div>
          )}

          {/* C3 — Tese e argumentos */}
          {competenciaAtiva === "c3" && (
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
              {estrutura?.argumentos?.length > 0 && (
                <div className="rounded-xl bg-white border border-[#e8d8f9] p-4">
                  <p className="mb-2 text-xs font-bold text-zinc-500">Argumentos</p>
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
            </div>
          )}

          {/* C5 — Proposta de intervenção */}
          {competenciaAtiva === "c5" && estrutura?.proposta_intervencao && (
            <div className="rounded-xl bg-white border border-[#e8d8f9] p-4">
              <p className="mb-1 text-xs font-bold text-zinc-500">Proposta de Intervenção</p>
              <p className="text-sm text-zinc-700">{estrutura.proposta_intervencao}</p>
            </div>
          )}

          {/* Sugestões da competência */}
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

      {/* Seção Nota Final — orientações gerais + comentário final */}
      {secaoAtiva === "nota_final" && (
        <div className="rounded-2xl border border-[#dcc8f5] bg-[#fbf8ff] p-5 space-y-4">
          {correcaoIA.sugestoes_objetivas?.length > 0 && (
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
          {!correcaoIA.sugestoes_objetivas?.length && !correcaoIA.resumo_geral && (
            <p className="text-sm text-zinc-500">Nenhum comentário geral disponível.</p>
          )}
        </div>
      )}
    </div>
  );
};
