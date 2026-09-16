import { useState, useMemo, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CorretorLayout } from "@/components/corretor/CorretorLayout";
import { useCorretorAuth } from "@/hooks/useCorretorAuth";
import { useCorretorPermissoes } from "@/hooks/useCorretorPermissoes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Eye, MoreVertical, CheckCircle, AlertTriangle, BarChart2, Calendar, ClipboardEdit,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import { formatTurmaDisplay } from "@/utils/turmaUtils";
import {
  verificarDivergencia, calcularNotasFinais, calcularParMaisProximo,
  calcularNotasFinaisPorPar, ResultadoDivergencia,
} from "@/utils/simuladoDivergencia";

// ── tipos ─────────────────────────────────────────────────────────────────────

interface RedacaoSimulado {
  id: string;
  id_simulado: string;
  nome_aluno: string;
  email_aluno: string;
  turma: string;
  texto: string;
  redacao_manuscrita_url?: string | null;
  data_envio: string;
  corrigida: boolean | null;
  nota_total: number | null;
  nota_c1: number | null;
  nota_c2: number | null;
  nota_c3: number | null;
  nota_c4: number | null;
  nota_c5: number | null;
  corretor_id_1: string | null;
  status_corretor_1: string | null;
  c1_corretor_1: number | null; c2_corretor_1: number | null;
  c3_corretor_1: number | null; c4_corretor_1: number | null;
  c5_corretor_1: number | null; nota_final_corretor_1: number | null;
  corretor_id_2: string | null;
  status_corretor_2: string | null;
  c1_corretor_2: number | null; c2_corretor_2: number | null;
  c3_corretor_2: number | null; c4_corretor_2: number | null;
  c5_corretor_2: number | null; nota_final_corretor_2: number | null;
  c1_admin: number | null; c2_admin: number | null;
  c3_admin: number | null; c4_admin: number | null;
  c5_admin: number | null; nota_final_admin: number | null;
  status_terceira_correcao: string | null;
  data_terceira_correcao: string | null;
  par_utilizado: string | null;
  simulados: { titulo: string; frase_tematica: string };
  corretor_1: { nome_completo: string } | null;
  corretor_2: { nome_completo: string } | null;
}

type StatusLabel = 'Concluída' | 'Pronto p/ Finalizar' | 'Discrepância Pendente' | 'Terceira Salva' | 'Parcial' | 'Pendente';

interface StatusInfo {
  label: StatusLabel;
  color: string;
  divergencia: ResultadoDivergencia | null;
}

function calcularStatus(r: RedacaoSimulado): StatusInfo {
  if (r.corrigida) return { label: 'Concluída', color: 'bg-green-600', divergencia: null };
  if (r.status_terceira_correcao === 'salva') return { label: 'Terceira Salva', color: 'bg-orange-500', divergencia: null };
  if (r.status_terceira_correcao === 'pendente') return { label: 'Discrepância Pendente', color: 'bg-red-500', divergencia: verificarDivergencia(r) };
  const div = verificarDivergencia(r);
  if (div !== null) {
    if (div.temDivergencia) return { label: 'Discrepância Pendente', color: 'bg-red-500', divergencia: div };
    return { label: 'Pronto p/ Finalizar', color: 'bg-blue-500', divergencia: div };
  }
  const tem1 = r.nota_final_corretor_1 != null && !!r.corretor_id_1;
  const tem2 = r.nota_final_corretor_2 != null && !!r.corretor_id_2;
  if ((tem1 || tem2) && r.corretor_id_1 && r.corretor_id_2) return { label: 'Parcial', color: 'bg-yellow-500', divergencia: null };
  return { label: 'Pendente', color: 'bg-gray-400', divergencia: null };
}

// ── componente principal ──────────────────────────────────────────────────────

const CorretorGestaoSimulados = () => {
  const { corretor, loading } = useCorretorAuth();
  const { podeGerenciar, nomesTurmasGerenciadas, loading: loadingPerm } = useCorretorPermissoes();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [filtroTurma, setFiltroTurma] = useState("todas");
  const [filtroStatus, setFiltroStatus] = useState("todas");
  const [filtroSimulado, setFiltroSimulado] = useState("todos");
  const [buscaNome, setBuscaNome] = useState("");
  const [filtroMes, setFiltroMes] = useState<string>("");
  const anoAtual = new Date().getFullYear();
  const [apenasAnoAtual, setApenasAnoAtual] = useState(true);

  const [redacaoVisualizacao, setRedacaoVisualizacao] = useState<RedacaoSimulado | null>(null);
  const [redacaoParaFinalizar, setRedacaoParaFinalizar] = useState<RedacaoSimulado | null>(null);
  const [redacaoTerceiraCorrecao, setRedacaoTerceiraCorrecao] = useState<RedacaoSimulado | null>(null);
  const [notasAdmin, setNotasAdmin] = useState({ c1: 0, c2: 0, c3: 0, c4: 0, c5: 0 });
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // ── queries ────────────────────────────────────────────────────────────────

  const { data: redacoes, isLoading } = useQuery({
    queryKey: ['gestor-redacoes-simulado', nomesTurmasGerenciadas, apenasAnoAtual],
    queryFn: async () => {
      if (nomesTurmasGerenciadas.length === 0) return [];
      let query = supabase
        .from('redacoes_simulado')
        .select(`
          *,
          simulados!inner(titulo, frase_tematica),
          corretor_1:corretores!corretor_id_1(nome_completo),
          corretor_2:corretores!corretor_id_2(nome_completo)
        `)
        .in('turma', nomesTurmasGerenciadas)
        .is('deleted_at', null)
        .order('data_envio', { ascending: false });

      if (apenasAnoAtual) {
        query = query.gte('data_envio', `${anoAtual}-01-01`).lt('data_envio', `${anoAtual + 1}-01-01`);
      }

      const { data: raw, error } = await query;
      if (error) throw error;

      const emails = [...new Set((raw ?? []).map(r => r.email_aluno))];
      const { data: profiles } = await supabase
        .from('profiles').select('email, nome, turma').in('email', emails);
      const profileMap = new Map((profiles ?? []).map(p => [p.email, p]));

      return (raw ?? []).map(r => {
        const p = profileMap.get(r.email_aluno);
        return { ...r, nome_aluno: p?.nome ?? r.nome_aluno, turma: p?.turma ?? r.turma } as RedacaoSimulado;
      });
    },
    enabled: nomesTurmasGerenciadas.length > 0,
  });

  const { data: simulados } = useQuery({
    queryKey: ['gestor-simulados-filtro', nomesTurmasGerenciadas],
    queryFn: async () => {
      if (nomesTurmasGerenciadas.length === 0) return [];
      const { data, error } = await supabase
        .from('simulados').select('id, titulo, criado_em')
        .contains('turmas_autorizadas', nomesTurmasGerenciadas.slice(0, 1))
        .eq('ativo', true).order('criado_em', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: nomesTurmasGerenciadas.length > 0,
  });

  // ── mutations ──────────────────────────────────────────────────────────────

  const finalizarMutation = useMutation({
    mutationFn: async (redacao: RedacaoSimulado) => {
      // Segurança: verifica que a turma pertence às gerenciadas
      if (!nomesTurmasGerenciadas.includes(redacao.turma)) {
        throw new Error('Sem permissão para finalizar redações desta turma.');
      }
      if (redacao.status_terceira_correcao === 'salva') {
        const { error } = await supabase.from('redacoes_simulado').update({
          corrigida: true,
          data_correcao: new Date().toISOString(),
          status_corretor_1: 'corrigida',
          status_corretor_2: 'corrigida',
          status_terceira_correcao: 'concluida',
        }).eq('id', redacao.id);
        if (error) throw error;
        return;
      }
      const notas = calcularNotasFinais(redacao);
      const { error } = await supabase.from('redacoes_simulado').update({
        ...notas,
        par_utilizado: '1_2',
        corrigida: true,
        data_correcao: new Date().toISOString(),
        status_corretor_1: 'corrigida',
        status_corretor_2: 'corrigida',
      }).eq('id', redacao.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Redação finalizada!", description: "Nota liberada para o aluno." });
      queryClient.invalidateQueries({ queryKey: ['gestor-redacoes-simulado'] });
      queryClient.invalidateQueries({ queryKey: ['gestor-discrepancias-count'] });
      queryClient.invalidateQueries({ queryKey: ['gestor-prontas-count'] });
      setRedacaoParaFinalizar(null);
    },
    onError: (err: any) => toast({ title: "Erro ao finalizar", description: err?.message, variant: "destructive" }),
  });

  const terceiraCorrecaoMutation = useMutation({
    mutationFn: async ({ redacao, notas }: { redacao: RedacaoSimulado; notas: typeof notasAdmin }) => {
      // Segurança: verifica que a turma pertence às gerenciadas
      if (!nomesTurmasGerenciadas.includes(redacao.turma)) {
        throw new Error('Sem permissão para realizar terceira correção nesta turma.');
      }
      if (redacao.status_corretor_1 !== 'corrigida' || redacao.status_corretor_2 !== 'corrigida') {
        throw new Error('Terceira correção bloqueada: ambos os corretores precisam ter finalizado.');
      }
      if (redacao.status_terceira_correcao === 'salva' || redacao.status_terceira_correcao === 'concluida' || redacao.corrigida) {
        throw new Error('Terceira correção bloqueada: estado inválido.');
      }
      const notaFinalAdmin = notas.c1 + notas.c2 + notas.c3 + notas.c4 + notas.c5;
      const N1 = redacao.nota_final_corretor_1 ?? 0;
      const N2 = redacao.nota_final_corretor_2 ?? 0;
      const par = calcularParMaisProximo(N1, N2, notaFinalAdmin);
      const redacaoComAdmin = { ...redacao, c1_admin: notas.c1, c2_admin: notas.c2, c3_admin: notas.c3, c4_admin: notas.c4, c5_admin: notas.c5, nota_final_admin: notaFinalAdmin };
      const notasFinais = calcularNotasFinaisPorPar(redacaoComAdmin, par);
      const { error } = await supabase.from('redacoes_simulado').update({
        c1_admin: notas.c1, c2_admin: notas.c2, c3_admin: notas.c3, c4_admin: notas.c4, c5_admin: notas.c5,
        nota_final_admin: notaFinalAdmin, par_utilizado: par,
        ...notasFinais,
        status_terceira_correcao: 'salva',
        data_terceira_correcao: new Date().toISOString(),
      }).eq('id', redacao.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Terceira correção salva!", description: "Use 'Finalizar e liberar nota' para publicar." });
      queryClient.invalidateQueries({ queryKey: ['gestor-redacoes-simulado'] });
      queryClient.invalidateQueries({ queryKey: ['gestor-discrepancias-count'] });
      setRedacaoTerceiraCorrecao(null);
      setNotasAdmin({ c1: 0, c2: 0, c3: 0, c4: 0, c5: 0 });
    },
    onError: (err: any) => toast({ title: "Erro na terceira correção", description: err?.message, variant: "destructive" }),
  });

  // ── filtros derivados ──────────────────────────────────────────────────────

  const turmasUnicas = useMemo(() =>
    [...new Set((redacoes ?? []).map(r => r.turma).filter(Boolean))].sort(), [redacoes]);

  const mesesDisponiveis = useMemo(() => {
    if (!(redacoes ?? []).length) return [];
    return Array.from(new Set(
      (redacoes ?? []).filter(r => r.data_envio).map(r => {
        const d = new Date(r.data_envio);
        if (isNaN(d.getTime())) return null;
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      }).filter(Boolean) as string[]
    )).sort((a, b) => a.localeCompare(b));
  }, [redacoes]);

  const mesAtual = format(new Date(), 'yyyy-MM');
  const mesDefault = mesesDisponiveis.includes(mesAtual) ? mesAtual : (mesesDisponiveis.at(-1) ?? mesAtual);
  const mesesFiltrados = apenasAnoAtual ? mesesDisponiveis.filter(m => m.startsWith(`${anoAtual}-`)) : mesesDisponiveis;

  useEffect(() => {
    if (filtroMes === '' && mesesDisponiveis.length > 0) setFiltroMes(mesDefault);
  }, [filtroMes, mesesDisponiveis, mesDefault]);

  const simuladosVisiveis = useMemo(() => {
    const todos = simulados ?? [];
    if (!apenasAnoAtual) return todos;
    const idsComRedacoes = new Set((redacoes ?? []).map(r => r.id_simulado));
    return todos.filter(s => {
      const ano = s.criado_em ? new Date(s.criado_em).getFullYear() : null;
      return ano === anoAtual || idsComRedacoes.has(s.id);
    });
  }, [simulados, redacoes, apenasAnoAtual, anoAtual]);

  const redacoesFiltradas = (redacoes ?? []).filter(r => {
    const info = calcularStatus(r);
    const matchTurma = filtroTurma === 'todas' || r.turma === filtroTurma;
    const matchSimulado = filtroSimulado === 'todos' || r.id_simulado === filtroSimulado;
    const matchNome = buscaNome === '' || r.nome_aluno.toLowerCase().includes(buscaNome.toLowerCase()) || r.email_aluno.toLowerCase().includes(buscaNome.toLowerCase());
    let matchStatus = true;
    if (filtroStatus === 'pendentes') matchStatus = info.label === 'Pendente' || info.label === 'Parcial';
    else if (filtroStatus === 'divergencia') matchStatus = info.label === 'Discrepância Pendente' || info.label === 'Terceira Salva';
    else if (filtroStatus === 'prontas') matchStatus = info.label === 'Pronto p/ Finalizar';
    else if (filtroStatus === 'concluidas') matchStatus = info.label === 'Concluída';
    const matchMes = filtroMes === 'todos' || (() => {
      const d = new Date(r.data_envio);
      if (isNaN(d.getTime())) return false;
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === filtroMes;
    })();
    return matchTurma && matchSimulado && matchNome && matchStatus && matchMes;
  });

  // ── guards (após todos os hooks) ───────────────────────────────────────────

  if (loading || loadingPerm) return null;
  if (!corretor) return <Navigate to="/corretor/login" replace />;
  if (!podeGerenciar) return <Navigate to="/corretor" replace />;

  // ── helpers ────────────────────────────────────────────────────────────────

  const truncateName = (name: string, max = 3) => {
    const w = name.split(' ');
    return w.length <= max ? name : w.slice(0, max).join(' ');
  };

  if (isLoading) {
    return (
      <CorretorLayout>
        <div className="text-center py-16 text-slate-500">Carregando redações das turmas...</div>
      </CorretorLayout>
    );
  }

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <CorretorLayout>
      <div className="space-y-6">

        {/* Hero */}
        <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-violet-900 via-violet-700 to-fuchsia-700 p-6 text-white shadow-lg">
          <div className="flex items-center gap-4">
            <BarChart2 className="w-8 h-8 text-violet-300 shrink-0" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-200">Gestão</p>
              <h1 className="text-2xl sm:text-3xl font-black mt-0.5">Notas e Discrepâncias</h1>
              <p className="text-violet-300 text-sm mt-1">
                Turmas: {nomesTurmasGerenciadas.join(', ')}
              </p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Filtros</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Buscar por nome/email</Label>
                <Input placeholder="Nome ou email..." value={buscaNome} onChange={e => setBuscaNome(e.target.value)} />
              </div>
              <div>
                <Label>Turma</Label>
                <Select value={filtroTurma} onValueChange={setFiltroTurma}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as turmas</SelectItem>
                    {turmasUnicas.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todos</SelectItem>
                    <SelectItem value="pendentes">Pendentes / Parciais</SelectItem>
                    <SelectItem value="divergencia">Com Discrepância / Terceira Correção</SelectItem>
                    <SelectItem value="prontas">Prontas p/ Finalizar</SelectItem>
                    <SelectItem value="concluidas">Concluídas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Meses */}
            <div className="flex flex-wrap gap-2">
              <Button variant={apenasAnoAtual ? 'default' : 'outline'} size="sm" onClick={() => {
                const novo = !apenasAnoAtual;
                setApenasAnoAtual(novo);
                if (novo && filtroMes !== 'todos' && !filtroMes.startsWith(`${anoAtual}-`)) setFiltroMes(mesDefault);
              }}>
                <Calendar className="w-3 h-3 mr-1" />
                {apenasAnoAtual ? `Ano atual (${anoAtual})` : 'Todos os anos'}
              </Button>
              <Button variant={filtroMes === 'todos' ? 'default' : 'outline'} size="sm"
                onClick={() => { setFiltroMes('todos'); setFiltroSimulado('todos'); }}>
                Todos os meses
              </Button>
              {mesesFiltrados.map(mes => {
                const [ano, m] = mes.split('-');
                const nomeDoMes = format(new Date(parseInt(ano), parseInt(m) - 1, 1), 'LLLL yyyy', { locale: ptBR });
                return (
                  <Button key={mes} variant={filtroMes === mes ? 'default' : 'outline'} size="sm"
                    onClick={() => { setFiltroMes(mes); setFiltroSimulado('todos'); }}>
                    {nomeDoMes}
                  </Button>
                );
              })}
            </div>

            {/* Simulados */}
            {simuladosVisiveis.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <Button variant={filtroSimulado === 'todos' ? 'default' : 'outline'} size="sm"
                  onClick={() => setFiltroSimulado('todos')}>
                  Todos
                </Button>
                {simuladosVisiveis.map(s => (
                  <Button key={s.id} variant={filtroSimulado === s.id ? 'default' : 'outline'} size="sm"
                    onClick={() => setFiltroSimulado(s.id)}>
                    {s.titulo}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Redações de Simulados</CardTitle>
              <Badge variant="outline">{redacoesFiltradas.length} encontrada(s)</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Aluno / Tema</TableHead>
                  <TableHead>Turma</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Corretores</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {redacoesFiltradas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                      Nenhuma redação encontrada com os filtros aplicados.
                    </TableCell>
                  </TableRow>
                ) : (
                  redacoesFiltradas.map((r, idx) => {
                    const info = calcularStatus(r);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-bold text-center text-violet-600">{idx + 1}</TableCell>
                        <TableCell>
                          <div className="font-medium">{truncateName(r.nome_aluno)}</div>
                          <div className="text-xs text-slate-500">{r.simulados.frase_tematica.split(' ').slice(0, 5).join(' ')}...</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{formatTurmaDisplay(r.turma)}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(r.data_envio), 'dd/MM/yy', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs space-y-0.5">
                            {r.corretor_1 && (
                              <div className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                                <span>{truncateName(r.corretor_1.nome_completo, 2)}</span>
                                <span className={`text-[10px] px-1 rounded ${r.status_corretor_1 === 'corrigida' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                  {r.status_corretor_1 === 'corrigida' ? 'ok' : 'pend.'}
                                </span>
                              </div>
                            )}
                            {r.corretor_2 && (
                              <div className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />
                                <span>{truncateName(r.corretor_2.nome_completo, 2)}</span>
                                <span className={`text-[10px] px-1 rounded ${r.status_corretor_2 === 'corrigida' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                  {r.status_corretor_2 === 'corrigida' ? 'ok' : 'pend.'}
                                </span>
                              </div>
                            )}
                            {(r.par_utilizado === '1_admin' || r.par_utilizado === '2_admin') && (
                              <div className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
                                <span>Coordenação</span>
                                <span className="text-[10px] px-1 rounded bg-green-100 text-green-700">ok</span>
                              </div>
                            )}
                            {!r.corretor_id_1 && !r.corretor_id_2 && <span className="text-slate-400">Nenhum corretor</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${info.color} text-white text-xs`}>
                            {info.label === 'Discrepância Pendente' && <AlertTriangle className="w-3 h-3 mr-1 inline" />}
                            {info.label === 'Concluída' && <CheckCircle className="w-3 h-3 mr-1 inline" />}
                            {info.label}
                          </Badge>
                          {r.corrigida && r.nota_total != null && (
                            <div className="text-xs text-slate-500 mt-1">Nota: {r.nota_total}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <DropdownMenu
                            open={openDropdownId === r.id}
                            onOpenChange={(open) => setOpenDropdownId(open ? r.id : null)}
                          >
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full bg-slate-100 hover:bg-slate-200">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
                              <DropdownMenuItem onClick={() => {
                                setOpenDropdownId(null);
                                setTimeout(() => navigate(`/corretor/simulados/redacao/${r.id}`), 100);
                              }}>
                                <Eye className="w-4 h-4 mr-2" />
                                Visualizar redação
                              </DropdownMenuItem>

                              {/* Terceira correção — só quando há discrepância pendente */}
                              {(info.label === 'Discrepância Pendente') && (
                                <DropdownMenuItem onClick={() => {
                                  setOpenDropdownId(null);
                                  setTimeout(() => {
                                    setNotasAdmin({ c1: 0, c2: 0, c3: 0, c4: 0, c5: 0 });
                                    setRedacaoTerceiraCorrecao(r);
                                  }, 100);
                                }}>
                                  <ClipboardEdit className="w-4 h-4 mr-2" />
                                  Fazer terceira correção
                                </DropdownMenuItem>
                              )}

                              {/* Finalizar — quando pronto ou terceira salva */}
                              {(info.label === 'Pronto p/ Finalizar' || info.label === 'Terceira Salva') && (
                                <DropdownMenuItem onClick={() => {
                                  setOpenDropdownId(null);
                                  setTimeout(() => setRedacaoParaFinalizar(r), 100);
                                }}>
                                  <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                                  Finalizar e liberar nota
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Modal visualização */}
      <Dialog open={!!redacaoVisualizacao} onOpenChange={(o) => { if (!o) setRedacaoVisualizacao(null); }}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{redacaoVisualizacao?.nome_aluno}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs text-slate-500 font-semibold mb-1 uppercase tracking-wide">Tema</p>
              <p className="text-sm">{redacaoVisualizacao?.simulados?.frase_tematica}</p>
            </div>
            {redacaoVisualizacao?.texto && (
              <div>
                <p className="text-xs text-slate-500 font-semibold mb-1 uppercase tracking-wide">Redação</p>
                <div className="rounded-lg border p-4 text-sm whitespace-pre-wrap leading-relaxed">
                  {redacaoVisualizacao.texto}
                </div>
              </div>
            )}
            {redacaoVisualizacao?.redacao_manuscrita_url && (
              <div>
                <p className="text-xs text-slate-500 font-semibold mb-1 uppercase tracking-wide">Manuscrita</p>
                <img src={redacaoVisualizacao.redacao_manuscrita_url} alt="Redação manuscrita" className="rounded-lg border max-w-full" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal terceira correção */}
      <Dialog open={!!redacaoTerceiraCorrecao} onOpenChange={(o) => { if (!o) setRedacaoTerceiraCorrecao(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardEdit className="w-4 h-4 text-orange-600" />
              Terceira Correção — {redacaoTerceiraCorrecao?.nome_aluno}
            </DialogTitle>
          </DialogHeader>
          {redacaoTerceiraCorrecao && (() => {
            const div = calcularStatus(redacaoTerceiraCorrecao).divergencia;
            return (
              <div className="space-y-4">
                {div && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm">
                    <p className="font-semibold text-red-700 mb-1">Discrepância detectada</p>
                    <div className="grid grid-cols-3 gap-1 text-xs">
                      <span className="font-medium">Competência</span>
                      <span className="text-center">C1</span>
                      <span className="text-center">C2</span>
                      {div.competencias.map(c => (
                        <>
                          <span key={`c-${c.competencia}`} className={c.temDivergencia ? 'text-red-700 font-semibold' : ''}>
                            C{c.competencia} {c.temDivergencia ? '⚠' : ''}
                          </span>
                          <span className="text-center">{c.nota_c1}</span>
                          <span className="text-center">{c.nota_c2}</span>
                        </>
                      ))}
                      <span className="font-bold border-t pt-1">Total</span>
                      <span className="text-center border-t pt-1 font-bold">{div.nota_final_1}</span>
                      <span className="text-center border-t pt-1 font-bold">{div.nota_final_2}</span>
                    </div>
                  </div>
                )}
                <p className="text-sm text-slate-600">
                  Insira as notas por competência para a terceira correção de coordenação:
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {([1, 2, 3, 4, 5] as const).map(i => {
                    const key = `c${i}` as keyof typeof notasAdmin;
                    return (
                      <div key={i} className="space-y-1">
                        <Label className="text-xs">C{i}</Label>
                        <Input
                          type="number" min={0} max={200} step={40}
                          value={notasAdmin[key]}
                          onChange={e => setNotasAdmin(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                          className="text-center h-9 text-sm"
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="rounded-lg bg-slate-50 p-2 text-sm text-center">
                  Total: <strong>{notasAdmin.c1 + notasAdmin.c2 + notasAdmin.c3 + notasAdmin.c4 + notasAdmin.c5}</strong>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setRedacaoTerceiraCorrecao(null)}>Cancelar</Button>
                  <Button
                    onClick={() => terceiraCorrecaoMutation.mutate({ redacao: redacaoTerceiraCorrecao, notas: notasAdmin })}
                    disabled={terceiraCorrecaoMutation.isPending}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    {terceiraCorrecaoMutation.isPending ? 'Salvando...' : 'Salvar terceira correção'}
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Confirmar finalização */}
      <AlertDialog open={!!redacaoParaFinalizar} onOpenChange={(o) => { if (!o) setRedacaoParaFinalizar(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar e liberar nota?</AlertDialogTitle>
            <AlertDialogDescription>
              A nota será publicada para o aluno <strong>{redacaoParaFinalizar?.nome_aluno}</strong>.
              {redacaoParaFinalizar?.status_terceira_correcao === 'salva'
                ? ' A nota já foi calculada com base na terceira correção.'
                : ' A nota será a média dos dois corretores.'}
              {' '}Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => redacaoParaFinalizar && finalizarMutation.mutate(redacaoParaFinalizar)}
              className="bg-green-600 hover:bg-green-700"
            >
              Confirmar e liberar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CorretorLayout>
  );
};

export default CorretorGestaoSimulados;
