import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Users,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Play,
  Trophy,
  Trash2,
  MoreVertical
} from 'lucide-react';
import { useProcessoSeletivoAdminComContexto } from '@/contexts/ProcessoSeletivoAdminContext';
import { useAuth } from '@/hooks/useAuth';
import { Candidato, CandidatoStatus, Resposta } from '@/hooks/useProcessoSeletivo';
import { PSRespostasViewer } from './PSRespostasViewer';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<CandidatoStatus, { label: string; color: string; icon: React.ReactNode }> = {
  nao_inscrito: { label: 'Não inscrito', color: 'bg-gray-500', icon: <Clock className="h-3 w-3" /> },
  formulario_enviado: { label: 'Aguardando análise', color: 'bg-yellow-500', icon: <Clock className="h-3 w-3" /> },
  aprovado_etapa2: { label: 'Aprovado Etapa 2', color: 'bg-green-500', icon: <CheckCircle className="h-3 w-3" /> },
  reprovado: { label: 'Reprovado', color: 'bg-red-500', icon: <XCircle className="h-3 w-3" /> },
  etapa_final_liberada: { label: 'Etapa Final', color: 'bg-blue-500', icon: <Play className="h-3 w-3" /> },
  concluido: { label: 'Concluído', color: 'bg-purple-500', icon: <Trophy className="h-3 w-3" /> }
};

export const PSCandidatosManager: React.FC = () => {
  const { user } = useAuth();
  const {
    candidatos,
    formularioAtivo,
    estatisticas,
    isLoadingCandidatos,
    aprovarCandidato,
    reprovarCandidato,
    liberarEtapaFinalCandidato,
    liberarEtapaFinalTodos,
    excluirCandidato,
    buscarRespostasCandidato
  } = useProcessoSeletivoAdminComContexto();

  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<CandidatoStatus | 'todos'>('todos');
  const [candidatoSelecionado, setCandidatoSelecionado] = useState<Candidato | null>(null);
  const [respostasCandidato, setRespostasCandidato] = useState<Resposta[]>([]);
  const [showRespostas, setShowRespostas] = useState(false);
  const [showReprovar, setShowReprovar] = useState(false);
  const [motivoReprovacao, setMotivoReprovacao] = useState('');
  const [loadingRespostas, setLoadingRespostas] = useState(false);
  const [showExcluir, setShowExcluir] = useState(false);

  const candidatosFiltrados = (candidatos || []).filter(c => {
    const matchBusca = busca === '' ||
      c.nome_aluno.toLowerCase().includes(busca.toLowerCase()) ||
      c.email_aluno.toLowerCase().includes(busca.toLowerCase());
    const matchStatus = filtroStatus === 'todos' || c.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  const handleVerRespostas = async (candidato: Candidato) => {
    setCandidatoSelecionado(candidato);
    setLoadingRespostas(true);
    try {
      const respostas = await buscarRespostasCandidato(candidato.id);
      setRespostasCandidato(respostas);
      setShowRespostas(true);
    } finally {
      setLoadingRespostas(false);
    }
  };

  const handleAprovar = (candidato: Candidato) => {
    if (!user?.id) {
      toast.error('Sessão de administrador não encontrada. Faça login novamente.');
      console.error('handleAprovar: user.id não disponível', { user });
      return;
    }
    console.log('Aprovando candidato:', candidato.id, 'Admin:', user.id);
    aprovarCandidato({ candidatoId: candidato.id, adminId: user.id });
  };

  const handleReprovar = () => {
    if (!candidatoSelecionado) return;
    reprovarCandidato({
      candidatoId: candidatoSelecionado.id,
      motivo: motivoReprovacao || undefined
    });
    setShowReprovar(false);
    setMotivoReprovacao('');
    setCandidatoSelecionado(null);
  };

  const handleLiberarEtapaFinal = (candidato: Candidato) => {
    liberarEtapaFinalCandidato(candidato.id);
  };

  const handleExcluir = () => {
    if (!candidatoSelecionado) return;
    excluirCandidato(candidatoSelecionado.id);
    setShowExcluir(false);
    setCandidatoSelecionado(null);
  };

  if (isLoadingCandidatos) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="p-4">
          <div className="text-2xl font-bold">{estatisticas.total}</div>
          <div className="text-sm text-muted-foreground">Total</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-yellow-600">{estatisticas.aguardandoAnalise}</div>
          <div className="text-sm text-muted-foreground">Aguardando</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-green-600">{estatisticas.aprovados}</div>
          <div className="text-sm text-muted-foreground">Aprovados</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-red-600">{estatisticas.reprovados}</div>
          <div className="text-sm text-muted-foreground">Reprovados</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-blue-600">{estatisticas.etapaFinalLiberada}</div>
          <div className="text-sm text-muted-foreground">Etapa Final</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-purple-600">{estatisticas.concluidos}</div>
          <div className="text-sm text-muted-foreground">Concluídos</div>
        </Card>
      </div>

      {/* Filtros e Ações em Massa */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Candidatos
            </div>
            {estatisticas.aprovados > 0 && estatisticas.etapaFinalLiberada === 0 && (
              <Button
                variant="outline"
                onClick={() => {
                  if (confirm('Liberar etapa final para todos os aprovados?')) {
                    liberarEtapaFinalTodos();
                  }
                }}
              >
                <Play className="h-4 w-4 mr-2" />
                Liberar Etapa Final para Todos
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filtroStatus === 'todos' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFiltroStatus('todos')}
              >
                Todos
              </Button>
              <Button
                variant={filtroStatus === 'formulario_enviado' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFiltroStatus('formulario_enviado')}
              >
                Aguardando
              </Button>
              <Button
                variant={filtroStatus === 'aprovado_etapa2' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFiltroStatus('aprovado_etapa2')}
              >
                Aprovados
              </Button>
            </div>
          </div>

          {/* Tabela de Candidatos */}
          <div className="border rounded-lg overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead>Candidato</TableHead>
                  <TableHead>Turma</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data Inscrição</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidatosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhum candidato encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  candidatosFiltrados.map((candidato) => {
                    const statusConfig = STATUS_CONFIG[candidato.status];
                    return (
                      <TableRow key={candidato.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{candidato.nome_aluno}</div>
                            <div className="text-sm text-muted-foreground">{candidato.email_aluno}</div>
                          </div>
                        </TableCell>
                        <TableCell>{candidato.turma || '-'}</TableCell>
                        <TableCell>
                          <Badge className={`${statusConfig.color} text-white`}>
                            {statusConfig.icon}
                            <span className="ml-1">{statusConfig.label}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {candidato.data_inscricao
                            ? new Date(candidato.data_inscricao).toLocaleDateString('pt-BR')
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 rounded-full bg-gray-100 hover:bg-gray-200"
                              >
                                <MoreVertical className="h-4 w-4 text-gray-600" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleVerRespostas(candidato)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Ver Respostas
                              </DropdownMenuItem>

                              {candidato.status === 'formulario_enviado' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleAprovar(candidato)}
                                    className="text-green-600 focus:text-green-600"
                                  >
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Aprovar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setCandidatoSelecionado(candidato);
                                      setShowReprovar(true);
                                    }}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Reprovar
                                  </DropdownMenuItem>
                                </>
                              )}

                              {candidato.status === 'aprovado_etapa2' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleLiberarEtapaFinal(candidato)}
                                    className="text-blue-600 focus:text-blue-600"
                                  >
                                    <Play className="mr-2 h-4 w-4" />
                                    Liberar Etapa Final
                                  </DropdownMenuItem>
                                </>
                              )}

                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setCandidatoSelecionado(candidato);
                                  setShowExcluir(true);
                                }}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir Candidato
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
          </div>
        </CardContent>
      </Card>

      {/* Modal de Respostas */}
      <Dialog open={showRespostas} onOpenChange={setShowRespostas}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Respostas de {candidatoSelecionado?.nome_aluno}
            </DialogTitle>
          </DialogHeader>
          {candidatoSelecionado && formularioAtivo && (
            <PSRespostasViewer
              formulario={formularioAtivo}
              respostas={respostasCandidato}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Reprovação */}
      <Dialog open={showReprovar} onOpenChange={setShowReprovar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reprovar Candidato</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              Você está reprovando o candidato{' '}
              <strong>{candidatoSelecionado?.nome_aluno}</strong>.
            </p>
            <div>
              <Label htmlFor="motivo">Motivo da Reprovação (opcional)</Label>
              <Textarea
                id="motivo"
                value={motivoReprovacao}
                onChange={(e) => setMotivoReprovacao(e.target.value)}
                placeholder="Digite o motivo..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReprovar(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleReprovar}>
              Confirmar Reprovação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Exclusão */}
      <Dialog open={showExcluir} onOpenChange={setShowExcluir}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Candidato</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              Você está prestes a excluir permanentemente o candidato{' '}
              <strong>{candidatoSelecionado?.nome_aluno}</strong>.
            </p>
            <p className="text-sm text-muted-foreground">
              Esta ação não pode ser desfeita. Todas as respostas e dados do candidato serão removidos.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExcluir(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleExcluir}>
              Excluir Candidato
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PSCandidatosManager;
