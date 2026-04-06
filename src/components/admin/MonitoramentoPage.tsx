import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Users, CalendarDays, GraduationCap, X } from 'lucide-react';
import { TODAS_TURMAS, formatTurmaDisplay } from '@/utils/turmaUtils';
import { useMonitoramentoTurma, AlunoMonitoramento } from '@/hooks/useMonitoramentoTurma';
import { AlunoBoletimSheet } from '@/components/admin/AlunoBoletimSheet';
import { TurmaSummaryPanel } from '@/components/admin/radar/TurmaSummaryPanel';
import { AlunoMonitoramentoRow } from '@/components/admin/radar/AlunoMonitoramentoRow';

const TURMAS = TODAS_TURMAS.map(formatTurmaDisplay);

const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

function SkeletonList() {
  return (
    <div className="divide-y">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="h-7 w-7 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-44" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export const MonitoramentoPage = () => {
  const now = new Date();
  // Nos primeiros 10 dias do mês, o mês atual tem poucos dados — usar mês anterior como padrão
  const defaultMes = now.getDate() <= 10
    ? (now.getMonth() === 0 ? 12 : now.getMonth())
    : now.getMonth() + 1;
  const defaultAno = now.getDate() <= 10 && now.getMonth() === 0
    ? now.getFullYear() - 1
    : now.getFullYear();

  const [selectedTurma, setSelectedTurma] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(defaultMes);
  const [selectedYear,  setSelectedYear]  = useState(defaultAno);
  const [filtroAtivo,   setFiltroAtivo]   = useState<string | null>(null);
  const [selectedAluno, setSelectedAluno] = useState<AlunoMonitoramento | null>(null);
  const [boletimOpen,   setBoletimOpen]   = useState(false);

  const { data, isLoading } = useMonitoramentoTurma(
    selectedTurma || null,
    selectedMonth,
    selectedYear
  );

  // Filtrar lista de alunos
  const alunosFiltrados = useMemo(() => {
    if (!data?.alunos) return [];
    const list = data.alunos;
    if (filtroAtivo === 'bolsistas')  return list.filter(a => a.isBolsista);
    if (filtroAtivo === 'sem_dados')  return list.filter(a => !a.aptoParaAvaliar || a.scoreGeral === null);
    if (filtroAtivo)                  return list.filter(a => a.faixaGeral?.label === filtroAtivo);
    return list;
  }, [data?.alunos, filtroAtivo]);

  function handleAbrirBoletim(aluno: AlunoMonitoramento) {
    setSelectedAluno(aluno);
    setBoletimOpen(true);
  }

  const anos = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  return (
    <div className="space-y-5">
      {/* ── Filtro de período ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground font-medium">Período:</span>
        </div>
        <Select value={selectedMonth.toString()} onValueChange={v => { setSelectedMonth(Number(v)); setFiltroAtivo(null); }}>
          <SelectTrigger className="h-8 w-36 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MESES.map((m, i) => (
              <SelectItem key={i + 1} value={(i + 1).toString()}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedYear.toString()} onValueChange={v => { setSelectedYear(Number(v)); setFiltroAtivo(null); }}>
          <SelectTrigger className="h-8 w-24 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {anos.map(a => <SelectItem key={a} value={a.toString()}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* ── Seletor de turmas ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Selecione a turma
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {TURMAS.map(turma => (
              <button
                key={turma}
                onClick={() => { setSelectedTurma(selectedTurma === turma ? '' : turma); setFiltroAtivo(null); }}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedTurma === turma
                    ? 'bg-[#3F0077] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {turma}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Conteúdo da turma ── */}
      {selectedTurma && (
        <>
          {/* Painel de resumo */}
          {isLoading ? (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : data && data.alunos.length > 0 ? (
            <TurmaSummaryPanel
              resumo={data.resumo}
              total={data.alunos.length}
              filtroAtivo={filtroAtivo}
              onFiltroChange={setFiltroAtivo}
            />
          ) : null}

          {/* Lista de alunos */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <GraduationCap className="h-4 w-4" />
                  {selectedTurma} — {MESES[selectedMonth - 1]} {selectedYear}
                  {!isLoading && data && (
                    <span className="text-xs font-normal text-muted-foreground ml-1">
                      ({alunosFiltrados.length} de {data.alunos.length} aluno{data.alunos.length !== 1 ? 's' : ''})
                    </span>
                  )}
                </CardTitle>

                {filtroAtivo && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={() => setFiltroAtivo(null)}
                  >
                    <X className="h-3 w-3" />
                    Limpar filtro
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <SkeletonList />
              ) : !data || data.alunos.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  Nenhum aluno encontrado nesta turma
                </div>
              ) : alunosFiltrados.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  Nenhum aluno corresponde ao filtro selecionado
                </div>
              ) : (
                <div>
                  {alunosFiltrados.map((aluno, idx) => (
                    <AlunoMonitoramentoRow
                      key={aluno.id}
                      aluno={aluno}
                      index={idx}
                      onVerBoletim={handleAbrirBoletim}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ── Sheet de boletim ── */}
      <AlunoBoletimSheet
        open={boletimOpen}
        onOpenChange={setBoletimOpen}
        email={selectedAluno?.email ?? null}
        turma={selectedTurma || null}
        nomeAluno={selectedAluno?.nome ?? ''}
        isBolsista={selectedAluno?.isBolsista}
      />
    </div>
  );
};
