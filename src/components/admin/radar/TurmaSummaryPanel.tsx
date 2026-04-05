import { GraduationCap, AlertTriangle, TrendingDown } from 'lucide-react';
import { RADAR_CONFIG } from '@/config/radarConfig';
import type { ResumoTurma } from '@/hooks/useMonitoramentoTurma';

interface TurmaSummaryPanelProps {
  resumo:         ResumoTurma;
  total:          number;
  filtroAtivo:    string | null;
  onFiltroChange: (f: string | null) => void;
}

export function TurmaSummaryPanel({
  resumo, total, filtroAtivo, onFiltroChange,
}: TurmaSummaryPanelProps) {
  const { faixas } = RADAR_CONFIG;

  function toggleFiltro(label: string) {
    onFiltroChange(filtroAtivo === label ? null : label);
  }

  const avaliados = total - resumo.semDados;

  return (
    <div className="space-y-3">
      {/* Cards por faixa */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {faixas.map(f => {
          const qtd     = resumo.porFaixa[f.label] ?? 0;
          const pct     = avaliados > 0 ? Math.round((qtd / avaliados) * 100) : 0;
          const ativo   = filtroAtivo === f.label;

          return (
            <button
              key={f.label}
              onClick={() => toggleFiltro(f.label)}
              className={`rounded-xl p-3 text-left transition-all border-2 ${
                ativo ? 'shadow-md scale-[1.02]' : 'hover:shadow-sm'
              }`}
              style={{
                backgroundColor: ativo ? f.bg : '#fafafa',
                borderColor:     ativo ? f.cor : '#e5e7eb',
              }}
            >
              <div className="text-lg font-bold" style={{ color: f.cor }}>{qtd}</div>
              <div className="text-[10px] font-semibold leading-tight mt-0.5"
                style={{ color: f.corTexto }}>{f.label}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{pct}%</div>
            </button>
          );
        })}

        {/* Sem dados */}
        {resumo.semDados > 0 && (() => {
          const ativo = filtroAtivo === 'sem_dados';
          return (
            <button
              onClick={() => toggleFiltro('sem_dados')}
              className={`rounded-xl p-3 text-left transition-all border-2 ${
                ativo ? 'shadow-md scale-[1.02] bg-gray-100 border-gray-400'
                      : 'hover:shadow-sm bg-gray-50 border-gray-200'
              }`}
            >
              <div className="text-lg font-bold text-gray-400">{resumo.semDados}</div>
              <div className="text-[10px] font-semibold leading-tight mt-0.5 text-gray-500">Sem dados</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {total > 0 ? Math.round((resumo.semDados / total) * 100) : 0}%
              </div>
            </button>
          );
        })()}
      </div>

      {/* Linha de bolsistas */}
      {resumo.totalBolsistas > 0 && (
        <div className="flex flex-wrap items-center gap-3 px-1 py-2 rounded-lg bg-amber-50 border border-amber-200">
          <button
            onClick={() => toggleFiltro('bolsistas')}
            className={`flex items-center gap-1.5 text-xs font-semibold text-amber-700 transition-opacity ${
              filtroAtivo === 'bolsistas' ? 'opacity-100 underline' : 'opacity-80 hover:opacity-100'
            }`}
          >
            <GraduationCap className="h-3.5 w-3.5" />
            {resumo.totalBolsistas} bolsista{resumo.totalBolsistas !== 1 ? 's' : ''}
          </button>

          <span className="text-amber-300">|</span>

          {resumo.bolsistasAtencao > 0 && (
            <span className="flex items-center gap-1 text-xs text-amber-600">
              <AlertTriangle className="h-3 w-3" />
              {resumo.bolsistasAtencao} atenção
            </span>
          )}
          {resumo.bolsistasRisco > 0 && (
            <span className="flex items-center gap-1 text-xs text-red-600 font-semibold">
              <AlertTriangle className="h-3 w-3" />
              {resumo.bolsistasRisco} em risco
            </span>
          )}
          {resumo.bolsistasAlerta > 0 && (
            <span className="flex items-center gap-1 text-xs text-violet-700 font-bold">
              <TrendingDown className="h-3 w-3" />
              {resumo.bolsistasAlerta} alerta pedagógico
            </span>
          )}
          {resumo.bolsistasOk > 0 && (
            <span className="text-xs text-green-600">
              {resumo.bolsistasOk} em dia
            </span>
          )}
        </div>
      )}
    </div>
  );
}
