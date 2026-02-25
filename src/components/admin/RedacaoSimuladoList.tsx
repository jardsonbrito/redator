
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Eye, Trash2, MoreVertical, CheckCircle, AlertTriangle, BarChart2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import { TODAS_TURMAS, formatTurmaDisplay } from "@/utils/turmaUtils";
import {
  verificarDivergencia,
  calcularNotasFinais,
  ResultadoDivergencia
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
  // corretor 1
  corretor_id_1: string | null;
  status_corretor_1: string | null;
  c1_corretor_1: number | null;
  c2_corretor_1: number | null;
  c3_corretor_1: number | null;
  c4_corretor_1: number | null;
  c5_corretor_1: number | null;
  nota_final_corretor_1: number | null;
  // corretor 2
  corretor_id_2: string | null;
  status_corretor_2: string | null;
  c1_corretor_2: number | null;
  c2_corretor_2: number | null;
  c3_corretor_2: number | null;
  c4_corretor_2: number | null;
  c5_corretor_2: number | null;
  nota_final_corretor_2: number | null;
  // joins
  simulados: { titulo: string; frase_tematica: string };
  corretor_1: { nome_completo: string } | null;
  corretor_2: { nome_completo: string } | null;
}

// ── helpers de status ─────────────────────────────────────────────────────────

type StatusLabel = 'Concluída' | 'Pronto p/ Finalizar' | 'Divergência' | 'Parcial' | 'Pendente';

interface StatusInfo {
  label: StatusLabel;
  color: string;
  divergencia: ResultadoDivergencia | null;
}

function calcularStatus(r: RedacaoSimulado): StatusInfo {
  if (r.corrigida) {
    return { label: 'Concluída', color: 'bg-green-600', divergencia: null };
  }

  // Checa divergência assim que ambos tiverem notas (independente do status)
  const div = verificarDivergencia(r);

  if (div !== null) {
    if (div.temDivergencia) {
      return { label: 'Divergência', color: 'bg-red-500', divergencia: div };
    }
    return { label: 'Pronto p/ Finalizar', color: 'bg-blue-500', divergencia: div };
  }

  // Um dos dois tem notas, o outro ainda não
  const tem1 = (r.nota_final_corretor_1 ?? 0) > 0 && !!r.corretor_id_1;
  const tem2 = (r.nota_final_corretor_2 ?? 0) > 0 && !!r.corretor_id_2;
  if ((tem1 || tem2) && r.corretor_id_1 && r.corretor_id_2) {
    return { label: 'Parcial', color: 'bg-yellow-500', divergencia: null };
  }

  return { label: 'Pendente', color: 'bg-gray-400', divergencia: null };
}

// ── componente principal ──────────────────────────────────────────────────────

const RedacaoSimuladoList = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // filtros
  const [filtroTurma, setFiltroTurma] = useState("todas");
  const [filtroStatus, setFiltroStatus] = useState("todas");
  const [filtroSimulado, setFiltroSimulado] = useState("todos");
  const [filtroCorretor, setFiltroCorretor] = useState("todos");
  const [buscaNome, setBuscaNome] = useState("");

  // modais
  const [redacaoVisualizacao, setRedacaoVisualizacao] = useState<RedacaoSimulado | null>(null);
  const [redacaoNotas, setRedacaoNotas] = useState<RedacaoSimulado | null>(null);
  const [redacaoParaExcluir, setRedacaoParaExcluir] = useState<RedacaoSimulado | null>(null);
  const [redacaoParaFinalizar, setRedacaoParaFinalizar] = useState<RedacaoSimulado | null>(null);

  // ── queries ──

  const { data: redacoes, isLoading } = useQuery({
    queryKey: ['redacoes-simulado'],
    queryFn: async () => {
      const { data: redacoesData, error } = await supabase
        .from('redacoes_simulado')
        .select(`
          *,
          simulados!inner(titulo, frase_tematica),
          corretor_1:corretores!corretor_id_1(nome_completo),
          corretor_2:corretores!corretor_id_2(nome_completo)
        `)
        .order('data_envio', { ascending: false });

      if (error) throw error;

      // Enriquecer com nome/turma do profile
      const emails = [...new Set(redacoesData?.map(r => r.email_aluno) ?? [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('email, nome, turma')
        .in('email', emails);

      const profileMap = new Map((profiles ?? []).map(p => [p.email, p]));

      return (redacoesData ?? []).map(r => {
        const p = profileMap.get(r.email_aluno);
        return {
          ...r,
          nome_aluno: p?.nome ?? r.nome_aluno,
          turma: p?.turma ?? r.turma,
        } as RedacaoSimulado;
      });
    }
  });

  const { data: corretores } = useQuery({
    queryKey: ['corretores-ativos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('corretores')
        .select('*')
        .eq('ativo', true)
        .order('nome_completo');
      if (error) throw error;
      return data;
    }
  });

  const { data: simulados } = useQuery({
    queryKey: ['simulados-filtro'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('simulados')
        .select('id, titulo')
        .eq('ativo', true)
        .order('criado_em', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // ── mutations ──

  const finalizarMutation = useMutation({
    mutationFn: async (redacao: RedacaoSimulado) => {
      const notas = calcularNotasFinais(redacao);
      const { error } = await supabase
        .from('redacoes_simulado')
        .update({
          nota_c1: notas.nota_c1,
          nota_c2: notas.nota_c2,
          nota_c3: notas.nota_c3,
          nota_c4: notas.nota_c4,
          nota_c5: notas.nota_c5,
          nota_total: notas.nota_total,
          corrigida: true,
          data_correcao: new Date().toISOString(),
        })
        .eq('id', redacao.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Redação finalizada!", description: "Nota liberada para o aluno." });
      queryClient.invalidateQueries({ queryKey: ['redacoes-simulado'] });
      setRedacaoParaFinalizar(null);
    },
    onError: () => {
      toast({ title: "Erro ao finalizar", variant: "destructive" });
    }
  });

  const excluirMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('redacoes_simulado').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Redação excluída." });
      queryClient.invalidateQueries({ queryKey: ['redacoes-simulado'] });
      setRedacaoParaExcluir(null);
    },
    onError: () => {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  });

  // ── filtragem ──

  const redacoesFiltradas = (redacoes ?? []).filter(r => {
    const info = calcularStatus(r);
    const matchTurma = filtroTurma === 'todas' || r.turma === filtroTurma;
    const matchSimulado = filtroSimulado === 'todos' || r.id_simulado === filtroSimulado;
    const matchCorretor = filtroCorretor === 'todos' ||
      r.corretor_id_1 === filtroCorretor || r.corretor_id_2 === filtroCorretor;
    const matchNome = buscaNome === '' ||
      r.nome_aluno.toLowerCase().includes(buscaNome.toLowerCase()) ||
      r.email_aluno.toLowerCase().includes(buscaNome.toLowerCase());

    let matchStatus = true;
    if (filtroStatus === 'pendentes') matchStatus = info.label === 'Pendente' || info.label === 'Parcial';
    else if (filtroStatus === 'divergencia') matchStatus = info.label === 'Divergência';
    else if (filtroStatus === 'prontas') matchStatus = info.label === 'Pronto p/ Finalizar';
    else if (filtroStatus === 'concluidas') matchStatus = info.label === 'Concluída';

    return matchTurma && matchSimulado && matchCorretor && matchNome && matchStatus;
  });

  // ── render helpers ──

  const truncateName = (name: string, max = 3) => {
    const words = name.split(' ');
    return words.length <= max ? name : words.slice(0, max).join(' ');
  };

  const truncateText = (text: string, maxWords: number) => {
    const words = text.split(' ');
    return words.length <= maxWords ? text : words.slice(0, maxWords).join(' ') + '...';
  };

  if (isLoading) return <div className="text-center py-8">Carregando redações...</div>;

  return (
    <div className="space-y-6">
      {/* ── cabeçalho ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-redator-primary">Redações de Simulados</h2>
        <Badge variant="outline" className="text-sm">
          {redacoesFiltradas.length} redação(ões) encontrada(s)
        </Badge>
      </div>

      {/* ── filtros ── */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Filtros</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  {TODAS_TURMAS.map(t => (
                    <SelectItem key={t} value={t}>{formatTurmaDisplay(t)}</SelectItem>
                  ))}
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
                  <SelectItem value="divergencia">Com Divergência</SelectItem>
                  <SelectItem value="prontas">Prontas p/ Finalizar</SelectItem>
                  <SelectItem value="concluidas">Concluídas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Corretor</Label>
              <Select value={filtroCorretor} onValueChange={setFiltroCorretor}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os corretores</SelectItem>
                  {(corretores ?? []).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nome_completo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tags de simulados */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filtroSimulado === 'todos' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroSimulado('todos')}
            >
              Todos
            </Button>
            {(simulados ?? []).map(s => (
              <Button
                key={s.id}
                variant={filtroSimulado === s.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFiltroSimulado(s.id)}
              >
                {s.titulo}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── tabela principal ── */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">#</TableHead>
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
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    Nenhuma redação encontrada com os filtros aplicados.
                  </TableCell>
                </TableRow>
              ) : (
                redacoesFiltradas.map((r, idx) => {
                  const info = calcularStatus(r);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-bold text-center text-redator-primary">{idx + 1}</TableCell>

                      <TableCell>
                        <div className="font-medium">{truncateName(r.nome_aluno)}</div>
                        <div className="text-xs text-gray-500">{truncateText(r.simulados.frase_tematica, 5)}</div>
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
                              <span className={`text-[10px] px-1 rounded ${r.status_corretor_1 === 'corrigida' ? 'bg-green-100 text-green-700' : r.status_corretor_1 === 'incompleta' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
                                {r.status_corretor_1 === 'corrigida' ? 'ok' : r.status_corretor_1 === 'incompleta' ? 'incompl.' : 'pend.'}
                              </span>
                            </div>
                          )}
                          {r.corretor_2 && (
                            <div className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />
                              <span>{truncateName(r.corretor_2.nome_completo, 2)}</span>
                              <span className={`text-[10px] px-1 rounded ${r.status_corretor_2 === 'corrigida' ? 'bg-green-100 text-green-700' : r.status_corretor_2 === 'incompleta' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
                                {r.status_corretor_2 === 'corrigida' ? 'ok' : r.status_corretor_2 === 'incompleta' ? 'incompl.' : 'pend.'}
                              </span>
                            </div>
                          )}
                          {!r.corretor_id_1 && !r.corretor_id_2 && (
                            <span className="text-gray-400">Nenhum corretor</span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge className={`${info.color} text-white text-xs`}>
                          {info.label === 'Divergência' && <AlertTriangle className="w-3 h-3 mr-1 inline" />}
                          {info.label === 'Concluída' && <CheckCircle className="w-3 h-3 mr-1 inline" />}
                          {info.label}
                        </Badge>
                        {r.corrigida && r.nota_total != null && (
                          <div className="text-xs text-gray-500 mt-1">Nota: {r.nota_total}</div>
                        )}
                      </TableCell>

                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full bg-gray-100 hover:bg-gray-200">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setRedacaoVisualizacao(r)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Visualizar redação
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setRedacaoNotas(r)}>
                              <BarChart2 className="w-4 h-4 mr-2" />
                              Ver notas dos corretores
                            </DropdownMenuItem>
                            {info.label === 'Pronto p/ Finalizar' && (
                              <DropdownMenuItem
                                onClick={() => setRedacaoParaFinalizar(r)}
                                className="text-blue-600 focus:text-blue-600 font-medium"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Finalizar e liberar nota
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => setRedacaoParaExcluir(r)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
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

      {/* ── modal visualização ── */}
      <Dialog open={!!redacaoVisualizacao} onOpenChange={() => setRedacaoVisualizacao(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Redação – {redacaoVisualizacao?.nome_aluno}</DialogTitle>
          </DialogHeader>
          {redacaoVisualizacao && (
            <div className="mt-4 space-y-4">
              <div className="bg-gray-50 p-4 rounded">
                <p className="font-semibold text-redator-primary">{redacaoVisualizacao.simulados.frase_tematica}</p>
              </div>
              {redacaoVisualizacao.redacao_manuscrita_url ? (
                <div className="bg-white p-4 border rounded">
                  <img
                    src={redacaoVisualizacao.redacao_manuscrita_url}
                    alt="Redação manuscrita"
                    className="max-w-full h-auto border rounded shadow-sm"
                    style={{ maxHeight: '70vh' }}
                  />
                </div>
              ) : (
                <div className="bg-white p-4 border rounded whitespace-pre-wrap text-sm">
                  {redacaoVisualizacao.texto || 'Texto não disponível.'}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── modal notas dos corretores ── */}
      <Dialog open={!!redacaoNotas} onOpenChange={() => setRedacaoNotas(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Notas dos Corretores – {redacaoNotas?.nome_aluno}</DialogTitle>
          </DialogHeader>
          {redacaoNotas && (() => {
            const div = verificarDivergencia(redacaoNotas);
            const temAmbos = !!redacaoNotas.corretor_id_1 && !!redacaoNotas.corretor_id_2;
            return (
              <div className="mt-4 space-y-4">
                {div?.temDivergencia && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-red-700">Divergência detectada</p>
                      <p className="text-sm text-red-600">
                        Diferença total: <strong>{div.diferencaTotal} pts</strong> (limite: 100 pts).
                        Entre em contato com as corretoras para alinhamento antes de finalizar.
                      </p>
                    </div>
                  </div>
                )}

                {!div && !redacaoNotas.corrigida && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
                    Aguardando conclusão de {!temAmbos ? 'atribuição de corretores' : 'correção por ambos os corretores'}.
                  </div>
                )}

                {redacaoNotas.corrigida && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Redação finalizada. Nota total: <strong>{redacaoNotas.nota_total}</strong>
                  </div>
                )}

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Competência</TableHead>
                      <TableHead className="text-center">
                        {redacaoNotas.corretor_1?.nome_completo ?? 'Corretor 1'}
                      </TableHead>
                      <TableHead className="text-center">
                        {redacaoNotas.corretor_2?.nome_completo ?? 'Corretor 2'}
                      </TableHead>
                      {div && <TableHead className="text-center">Diferença</TableHead>}
                      {redacaoNotas.corrigida && <TableHead className="text-center">Nota Final</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[1, 2, 3, 4, 5].map(i => {
                      const n1 = (redacaoNotas as any)[`c${i}_corretor_1`];
                      const n2 = (redacaoNotas as any)[`c${i}_corretor_2`];
                      const notaFinal = (redacaoNotas as any)[`nota_c${i}`];
                      const divC = div?.competencias.find(c => c.competencia === i);
                      const ehDivergente = divC?.temDivergencia ?? false;
                      return (
                        <TableRow key={i} className={ehDivergente ? 'bg-red-50' : ''}>
                          <TableCell className="font-medium">
                            C{i}
                            {ehDivergente && <AlertTriangle className="w-3 h-3 text-red-500 inline ml-1" />}
                          </TableCell>
                          <TableCell className="text-center">{n1 ?? '–'}</TableCell>
                          <TableCell className="text-center">{n2 ?? '–'}</TableCell>
                          {div && (
                            <TableCell className={`text-center font-semibold ${ehDivergente ? 'text-red-600' : 'text-gray-600'}`}>
                              {divC ? divC.diferenca : '–'}
                            </TableCell>
                          )}
                          {redacaoNotas.corrigida && (
                            <TableCell className="text-center font-semibold">{notaFinal ?? '–'}</TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                    {/* linha totais */}
                    <TableRow className="font-bold border-t-2">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-center">{redacaoNotas.nota_final_corretor_1 ?? '–'}</TableCell>
                      <TableCell className="text-center">{redacaoNotas.nota_final_corretor_2 ?? '–'}</TableCell>
                      {div && (
                        <TableCell className={`text-center ${div.diferencaTotal > 100 ? 'text-red-600' : 'text-gray-700'}`}>
                          {div.diferencaTotal}
                        </TableCell>
                      )}
                      {redacaoNotas.corrigida && (
                        <TableCell className="text-center">{redacaoNotas.nota_total ?? '–'}</TableCell>
                      )}
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── confirmação finalizar ── */}
      <AlertDialog open={!!redacaoParaFinalizar} onOpenChange={() => setRedacaoParaFinalizar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-500" />
              Finalizar correção
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a finalizar a correção da redação de{' '}
              <strong>{redacaoParaFinalizar?.nome_aluno}</strong>.
              <br /><br />
              A nota final será calculada como a <strong>média das pontuações dos dois corretores</strong>{' '}
              por competência e ficará visível para o aluno.
              <br /><br />
              {redacaoParaFinalizar && (() => {
                const n = calcularNotasFinais(redacaoParaFinalizar);
                return (
                  <span className="block mt-2 text-sm font-medium text-gray-700">
                    Nota final calculada: {n.nota_total} / 1000
                    &nbsp;(C1:{n.nota_c1} C2:{n.nota_c2} C3:{n.nota_c3} C4:{n.nota_c4} C5:{n.nota_c5})
                  </span>
                );
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => redacaoParaFinalizar && finalizarMutation.mutate(redacaoParaFinalizar)}
              disabled={finalizarMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {finalizarMutation.isPending ? 'Finalizando...' : 'Confirmar e Liberar Nota'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── confirmação excluir ── */}
      <AlertDialog open={!!redacaoParaExcluir} onOpenChange={() => setRedacaoParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza de que deseja excluir a redação de{' '}
              <strong>{redacaoParaExcluir?.nome_aluno}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => redacaoParaExcluir && excluirMutation.mutate(redacaoParaExcluir.id)}
              disabled={excluirMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {excluirMutation.isPending ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RedacaoSimuladoList;
