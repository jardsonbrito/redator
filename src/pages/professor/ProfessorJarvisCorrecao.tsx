import { useState } from "react";
import { useProfessorAuth } from "@/hooks/useProfessorAuth";
import { useJarvisCorrecao } from "@/hooks/useJarvisCorrecao";
import { EnviarRedacaoForm } from "@/components/professor/correcao/EnviarRedacaoForm";
import { HistoricoCorrecoes } from "@/components/professor/correcao/HistoricoCorrecoes";

export const ProfessorJarvisCorrecao = () => {
  const { professor } = useProfessorAuth();
  const { creditos } = useJarvisCorrecao(professor?.email || "");
  const [activeTab, setActiveTab] = useState<"enviar" | "historico">("enviar");

  if (!professor) return <div className="p-6">Carregando...</div>;

  return (
    <div className="min-h-screen bg-white px-4 py-6 text-zinc-950 md:px-8">
      <div className="mx-auto max-w-5xl space-y-5">
        {/* Cabeçalho */}
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#d9c5f3] text-[#4B0082]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="6" y="8" width="12" height="10" rx="2.5" stroke="currentColor" strokeWidth="2" />
                <path d="M12 5v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <circle cx="9.5" cy="13" r="1" fill="currentColor" />
                <circle cx="14.5" cy="13" r="1" fill="currentColor" />
                <path d="M4 12h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M18 12h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M10 18v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M14 18v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-zinc-950 md:text-3xl">
              Jarvis — Correção por Inteligência Artificial
            </h1>
          </div>

          <div className="inline-flex flex-col rounded-2xl border border-[#dcc8f5] bg-[#fbf8ff] px-5 py-3 shadow-[0_8px_18px_rgba(75,0,130,0.06)]">
            <span className="text-xs font-bold text-[#4f3a68]">Créditos disponíveis</span>
            <span className="mt-0.5 text-2xl font-black leading-none text-[#4B0082]">
              {creditos !== undefined ? creditos : "–"}
            </span>
          </div>
        </header>

        {/* Navegação */}
        <nav className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setActiveTab("enviar")}
            className={
              activeTab === "enviar"
                ? "rounded-full bg-gradient-to-r from-[#4B0082] to-[#8a25d9] px-5 py-2.5 text-sm font-extrabold text-white shadow-[0_10px_22px_rgba(124,43,216,0.18)] transition"
                : "rounded-full border border-[#dcc8f5] bg-white px-5 py-2.5 text-sm font-extrabold text-[#4B0082] hover:bg-[#efe4ff] transition"
            }
          >
            Enviar nova redação
          </button>
          <button
            onClick={() => setActiveTab("historico")}
            className={
              activeTab === "historico"
                ? "rounded-full bg-gradient-to-r from-[#4B0082] to-[#8a25d9] px-5 py-2.5 text-sm font-extrabold text-white shadow-[0_10px_22px_rgba(124,43,216,0.18)] transition"
                : "rounded-full border border-[#dcc8f5] bg-white px-5 py-2.5 text-sm font-extrabold text-[#4B0082] hover:bg-[#efe4ff] transition"
            }
          >
            Histórico
          </button>
        </nav>

        {/* Conteúdo */}
        {activeTab === "enviar" ? (
          <EnviarRedacaoForm professorEmail={professor.email} />
        ) : (
          <HistoricoCorrecoes professorEmail={professor.email} />
        )}
      </div>
    </div>
  );
};
