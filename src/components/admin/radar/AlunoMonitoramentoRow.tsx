import { ChevronRight } from 'lucide-react';
import type { AlunoMonitoramento } from '@/hooks/useMonitoramentoTurma';
import { BadgeStatus, BadgeScore } from './BadgeStatus';
import { BadgeBolsista } from './BadgeBolsista';

interface AlunoMonitoramentoRowProps {
  aluno:        AlunoMonitoramento;
  index:        number;
  onVerBoletim: (aluno: AlunoMonitoramento) => void;
}

export function AlunoMonitoramentoRow({ aluno, index, onVerBoletim }: AlunoMonitoramentoRowProps) {
  const borderColor = aluno.faixaGeral?.cor ?? '#e5e7eb';
  const semDados    = !aluno.aptoParaAvaliar || aluno.scoreGeral === null;

  // Valores das métricas para exibição
  const totalRedacoes = aluno.redacoes.valorAtual;
  const taxaPresenca = aluno.presenca.taxa;
  const totalExercicios = aluno.exercicios.valorAtual;
  const totalMicro = aluno.micro.valorAtual;

  return (
    <button
      className="w-full text-left flex items-stretch hover:bg-muted/30 transition-colors group border-b last:border-b-0"
      onClick={() => onVerBoletim(aluno)}
    >
      {/* Barra de cor lateral */}
      <div
        className="w-1 shrink-0 rounded-l-sm"
        style={{ backgroundColor: semDados ? '#e5e7eb' : borderColor }}
      />

      <div className="flex-1 flex items-center gap-3 px-4 py-3 min-w-0">
        {/* Número */}
        <div
          className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
          style={{
            backgroundColor: semDados ? '#f3f4f6' : `${borderColor}22`,
            color:            semDados ? '#9ca3af' : borderColor,
          }}
        >
          {index + 1}
        </div>

        {/* Info principal */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
            <span className="text-sm font-semibold leading-tight truncate">{aluno.nome}</span>
            {aluno.isBolsista && <BadgeBolsista status={aluno.statusBolsista} />}
          </div>
          <div className="text-xs text-muted-foreground truncate mb-1">{aluno.email}</div>

          {/* Mini-métricas de engajamento */}
          {!semDados && (
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
              <span>📝 {totalRedacoes} red.</span>
              <span>📅 {taxaPresenca !== null ? `${Math.round(taxaPresenca)}%` : '—'}</span>
              <span>📚 {totalExercicios} ex.</span>
              <span>🧠 {totalMicro} micro</span>
            </div>
          )}

          {/* Badge de desempenho por nota */}
          {aluno.notaDesempenho !== null && (
            <div className="mt-0.5">
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={
                  aluno.grupoDesempenho === 'consolidado'
                    ? { backgroundColor: '#d1fae5', color: '#065f46' }
                    : { backgroundColor: '#ffedd5', color: '#9a3412' }
                }
              >
                {aluno.notaDesempenho} pts
                <span className="font-normal opacity-75">
                  {aluno.grupoDesempenho === 'consolidado' ? '· consolidado' : '· acompanhamento'}
                </span>
              </span>
            </div>
          )}
        </div>

        {/* Score + badge + tendência */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          {semDados ? (
            <span className="text-xs text-muted-foreground italic">Sem dados</span>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <BadgeScore score={aluno.scoreGeral} cor={aluno.faixaGeral?.cor ?? '#6b7280'} />
                {aluno.evolucaoGeral && aluno.evolucaoGeral.delta !== null && (
                  <span className="text-xs font-semibold" style={{ color: aluno.evolucaoGeral.cor }}>
                    {aluno.evolucaoGeral.icone}
                    {Math.abs(aluno.evolucaoGeral.delta).toFixed(1)}
                  </span>
                )}
              </div>
              <BadgeStatus
                faixa={aluno.faixaGeral}
                tendencia={aluno.evolucaoGeral as any}
                score={aluno.scoreGeral}
              />
            </>
          )}
        </div>

        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />
      </div>
    </button>
  );
}
