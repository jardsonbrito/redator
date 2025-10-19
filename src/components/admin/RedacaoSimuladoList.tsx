
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, Edit, CheckCircle, Calendar, User, Mail, RotateCcw, Copy, Trash2, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import { TURMAS_VALIDAS, TODAS_TURMAS, formatTurmaDisplay } from "@/utils/turmaUtils";

const RedacaoSimuladoList = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filtroTurma, setFiltroTurma] = useState<string>("todas");
  const [filtroStatus, setFiltroStatus] = useState<string>("todas");
  const [filtroSimulado, setFiltroSimulado] = useState<string>("todos");
  const [filtroCorretor, setFiltroCorretor] = useState<string>("todos");
  const [buscaNome, setBuscaNome] = useState("");
  const [redacaoSelecionada, setRedacaoSelecionada] = useState<any>(null);
  const [redacaoVisualizacao, setRedacaoVisualizacao] = useState<any>(null);
  const [duplicandoRedacao, setDuplicandoRedacao] = useState<any>(null);
  const [redacaoParaExcluir, setRedacaoParaExcluir] = useState<any>(null);
  const [novoCorretor, setNovoCorretor] = useState("");
  const [notas, setNotas] = useState({
    nota_c1: 0,
    nota_c2: 0,
    nota_c3: 0,
    nota_c4: 0,
    nota_c5: 0
  });
  const [comentarioPedagogico, setComentarioPedagogico] = useState("");

  const { data: redacoes, isLoading } = useQuery({
    queryKey: ['redacoes-simulado'],
    queryFn: async () => {
      // Buscar redações
      const { data: redacoesData, error: redacoesError } = await supabase
        .from('redacoes_simulado')
        .select(`
          *,
          simulados!inner(titulo, frase_tematica),
          corretor_1:corretores!corretor_id_1(nome_completo),
          corretor_2:corretores!corretor_id_2(nome_completo)
        `)
        .order('data_envio', { ascending: false });

      if (redacoesError) throw redacoesError;

      // Buscar emails únicos dos alunos
      const emailsUnicos = [...new Set(redacoesData?.map(r => r.email_aluno))];

      // Buscar profiles dos alunos
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('email, nome, turma')
        .in('email', emailsUnicos);

      if (profilesError) {
        console.error('Erro ao buscar profiles:', profilesError);
        // Continuar sem os profiles
      }

      // Criar mapa de email -> profile para lookup rápido
      const profilesMap = new Map(
        profilesData?.map(p => [p.email, p]) || []
      );

      // Processar dados para usar o nome real do aluno e turma do profile
      const processedData = redacoesData?.map(redacao => {
        const profile = profilesMap.get(redacao.email_aluno);
        return {
          ...redacao,
          nome_aluno: profile?.nome || redacao.nome_aluno,
          turma: profile?.turma || redacao.turma
        };
      });

      return processedData;
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

  const duplicarRedacao = useMutation({
    mutationFn: async ({ redacaoId, novoCorretorId }: { redacaoId: string, novoCorretorId: string }) => {
      // Buscar dados da redação original
      const { data: redacaoOriginal, error: fetchError } = await supabase
        .from('redacoes_simulado')
        .select('*')
        .eq('id', redacaoId)
        .single();

      if (fetchError) throw fetchError;

      // Criar nova entrada duplicada
      const { data, error } = await supabase
        .from('redacoes_simulado')
        .insert([{
          id_simulado: redacaoOriginal.id_simulado,
          nome_aluno: redacaoOriginal.nome_aluno,
          email_aluno: redacaoOriginal.email_aluno,
          texto: redacaoOriginal.texto,
          turma: redacaoOriginal.turma,
          data_envio: redacaoOriginal.data_envio,
          user_id: redacaoOriginal.user_id,
          corretor_id_1: novoCorretorId,
          status_corretor_1: 'pendente'
        }]);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Redação duplicada com sucesso!",
        description: "Uma nova entrada foi criada para o corretor selecionado.",
      });
      queryClient.invalidateQueries({ queryKey: ['redacoes-simulado'] });
      setDuplicandoRedacao(null);
      setNovoCorretor("");
    },
    onError: (error) => {
      toast({
        title: "Erro ao duplicar redação",
        description: "Não foi possível criar a duplicata.",
        variant: "destructive",
      });
      console.error("Erro ao duplicar redação:", error);
    }
  });

  const corrigirRedacao = useMutation({
    mutationFn: async ({ id, dadosCorrecao }: { id: string, dadosCorrecao: any }) => {
      const notaTotal = [
        dadosCorrecao.nota_c1,
        dadosCorrecao.nota_c2,
        dadosCorrecao.nota_c3,
        dadosCorrecao.nota_c4,
        dadosCorrecao.nota_c5
      ].reduce((acc: number, nota: any) => {
        const notaNum = typeof nota === 'number' ? nota : parseInt(nota) || 0;
        return acc + notaNum;
      }, 0);
      
      const { data, error } = await supabase
        .from('redacoes_simulado')
        .update({
          nota_c1: dadosCorrecao.nota_c1,
          nota_c2: dadosCorrecao.nota_c2,
          nota_c3: dadosCorrecao.nota_c3,
          nota_c4: dadosCorrecao.nota_c4,
          nota_c5: dadosCorrecao.nota_c5,
          comentario_pedagogico: dadosCorrecao.comentario_pedagogico,
          nota_total: notaTotal,
          corrigida: true,
          data_correcao: new Date().toISOString()
        })
        .eq('id', id)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Redação corrigida com sucesso!",
        description: "A correção foi salva e está disponível para o aluno.",
      });
      queryClient.invalidateQueries({ queryKey: ['redacoes-simulado'] });
      setRedacaoSelecionada(null);
    },
    onError: (error) => {
      toast({
        title: "Erro ao corrigir redação",
        description: "Não foi possível salvar a correção.",
        variant: "destructive",
      });
      console.error("Erro ao corrigir redação:", error);
    }
  });

  const excluirRedacao = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('redacoes_simulado')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Redação excluída com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ['redacoes-simulado'] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir redação",
        description: "Não foi possível excluir a redação.",
        variant: "destructive",
      });
      console.error("Erro ao excluir redação:", error);
    }
  });

  const handleCorrigir = () => {
    if (!redacaoSelecionada) return;
    
    corrigirRedacao.mutate({
      id: redacaoSelecionada.id,
      dadosCorrecao: {
        ...notas,
        comentario_pedagogico: comentarioPedagogico
      }
    });
  };

  const handleDuplicar = () => {
    if (!duplicandoRedacao || !novoCorretor) return;
    
    duplicarRedacao.mutate({
      redacaoId: duplicandoRedacao.id,
      novoCorretorId: novoCorretor
    });
  };

  const abrirCorrecao = (redacao: any) => {
    setRedacaoSelecionada(redacao);
    setNotas({
      nota_c1: redacao.nota_c1 || 0,
      nota_c2: redacao.nota_c2 || 0,
      nota_c3: redacao.nota_c3 || 0,
      nota_c4: redacao.nota_c4 || 0,
      nota_c5: redacao.nota_c5 || 0
    });
    setComentarioPedagogico(redacao.comentario_pedagogico || "");
  };

  const abrirVisualizacao = (redacao: any) => {
    setRedacaoVisualizacao(redacao);
  };

  const abrirDuplicacao = (redacao: any) => {
    setDuplicandoRedacao(redacao);
    setNovoCorretor("");
  };

  const confirmarExclusao = (redacao: any) => {
    setRedacaoParaExcluir(redacao);
  };

  const handleExcluir = () => {
    if (redacaoParaExcluir) {
      excluirRedacao.mutate(redacaoParaExcluir.id);
      setRedacaoParaExcluir(null);
    }
  };

  const truncateText = (text: string, maxWords: number) => {
    const words = text.split(' ');
    if (words.length <= maxWords) return text;
    return words.slice(0, maxWords).join(' ') + '...';
  };

  const truncateName = (name: string, maxWords: number = 3) => {
    const words = name.split(' ');
    if (words.length <= maxWords) return name;
    return words.slice(0, maxWords).join(' ');
  };

  // Expandir redações para múltiplas entradas (corretor 1 e corretor 2)
  const redacoesExpandidas = redacoes?.flatMap(redacao => {
    const entradas = [];
    
    // Entrada para corretor 1
    if (redacao.corretor_id_1) {
      entradas.push({
        ...redacao,
        corretor_atual: redacao.corretor_1?.nome_completo || 'Não atribuído',
        corretor_id_atual: redacao.corretor_id_1,
        status_atual: redacao.status_corretor_1 || 'pendente',
        tipo_corretor: 'corretor_1'
      });
    }
    
    // Entrada para corretor 2
    if (redacao.corretor_id_2) {
      entradas.push({
        ...redacao,
        corretor_atual: redacao.corretor_2?.nome_completo || 'Não atribuído',
        corretor_id_atual: redacao.corretor_id_2,
        status_atual: redacao.status_corretor_2 || 'pendente',
        tipo_corretor: 'corretor_2'
      });
    }
    
    // Se não tem nenhum corretor, mostrar como pendente
    if (!redacao.corretor_id_1 && !redacao.corretor_id_2) {
      entradas.push({
        ...redacao,
        corretor_atual: 'Não atribuído',
        corretor_id_atual: null,
        status_atual: 'pendente',
        tipo_corretor: null
      });
    }
    
    return entradas;
  }) || [];

  // Filtrar redações expandidas
  const redacoesFiltradas = redacoesExpandidas?.filter(redacao => {
    const matchTurma = filtroTurma === "todas" || redacao.turma === filtroTurma;
    const matchStatus = filtroStatus === "todas" ||
      (filtroStatus === "corrigidas" && redacao.status_atual === 'corrigida') ||
      (filtroStatus === "pendentes" && redacao.status_atual === 'pendente') ||
      (filtroStatus === "incompleta" && redacao.status_atual === 'incompleta');
    const matchSimulado = filtroSimulado === "todos" || redacao.id_simulado === filtroSimulado;
    const matchCorretor = filtroCorretor === "todos" || redacao.corretor_id_atual === filtroCorretor;
    const matchNome = buscaNome === "" ||
      redacao.nome_aluno.toLowerCase().includes(buscaNome.toLowerCase()) ||
      redacao.email_aluno.toLowerCase().includes(buscaNome.toLowerCase());

    return matchTurma && matchStatus && matchSimulado && matchCorretor && matchNome;
  });

  // Criar mapeamento de números únicos por aluno
  const alunosUnicos = [...new Set(redacoesFiltradas?.map(redacao =>
    `${redacao.nome_aluno}|${redacao.email_aluno}`
  ))];

  const numerosPorAluno = new Map<string, number>();
  alunosUnicos.forEach((chaveAluno, index) => {
    numerosPorAluno.set(chaveAluno, index + 1);
  });

  // Adicionar número do aluno às redações filtradas
  const redacoesComNumero = redacoesFiltradas?.map(redacao => ({
    ...redacao,
    numero_aluno: numerosPorAluno.get(`${redacao.nome_aluno}|${redacao.email_aluno}`) || 0
  }));

  const turmasDisponiveis = TODAS_TURMAS; // ['A', 'B', 'C', 'D', 'E', 'VISITANTE']

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'corrigida':
        return <Badge className="bg-green-500 text-white">Corrigida</Badge>;
      case 'incompleta':
        return <Badge className="bg-orange-500 text-white">Incompleta</Badge>;
      case 'pendente':
        return <Badge className="bg-yellow-500 text-white">Pendente</Badge>;
      default:
        return <Badge variant="secondary">Aguardando</Badge>;
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Carregando redações...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-redator-primary">Redações de Simulados</h2>
        <Badge variant="outline" className="text-sm">
          {redacoesComNumero?.length || 0} entrada(s) encontrada(s)
        </Badge>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label>Buscar por nome/email</Label>
              <Input
                placeholder="Digite nome ou email..."
                value={buscaNome}
                onChange={(e) => setBuscaNome(e.target.value)}
              />
            </div>
            
            <div>
              <Label>Turma</Label>
              <Select value={filtroTurma} onValueChange={setFiltroTurma}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as turmas</SelectItem>
                  {turmasDisponiveis.map(turma => (
                    <SelectItem key={turma} value={turma}>
                      {formatTurmaDisplay(turma)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Status</Label>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="pendentes">Pendentes</SelectItem>
                  <SelectItem value="incompleta">Incompletas</SelectItem>
                  <SelectItem value="corrigidas">Corrigidas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Corretor</Label>
              <Select value={filtroCorretor} onValueChange={setFiltroCorretor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os corretores</SelectItem>
                  {corretores?.map(corretor => (
                    <SelectItem key={corretor.id} value={corretor.id}>
                      {corretor.nome_completo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tags de simulados */}
          <div className="flex flex-wrap gap-2 mt-4">
            <Button
              variant={filtroSimulado === "todos" ? "default" : "outline"}
              size="sm"
              onClick={() => setFiltroSimulado("todos")}
            >
              Todos
            </Button>
            {simulados?.map(simulado => (
              <Button
                key={simulado.id}
                variant={filtroSimulado === simulado.id ? "default" : "outline"}
                size="sm"
                onClick={() => setFiltroSimulado(simulado.id)}
              >
                {simulado.titulo}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabela de redações */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">#</TableHead>
                <TableHead>Aluno</TableHead>
                <TableHead>Turma</TableHead>
                <TableHead>Tema</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Corretor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!redacoesComNumero || redacoesComNumero.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <p className="text-gray-500">Nenhuma redação encontrada com os filtros aplicados.</p>
                  </TableCell>
                </TableRow>
              ) : (
                redacoesComNumero.map((redacao) => (
                  <TableRow key={`${redacao.id}-${redacao.tipo_corretor || 'single'}`}>
                    <TableCell className="text-center">
                      <div className="font-bold text-lg text-redator-primary">
                        {redacao.numero_aluno}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {truncateName(redacao.nome_aluno, 3)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {redacao.email_aluno}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge variant="outline">
                        {formatTurmaDisplay(redacao.turma)}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      <div className="max-w-[200px]">
                        {truncateText(redacao.simulados.frase_tematica, 4)}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {format(new Date(redacao.data_envio), "dd/MM/yy", { locale: ptBR })}
                    </TableCell>
                    
                    <TableCell>
                      <div className="font-medium text-sm">
                        {redacao.corretor_atual}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {getStatusBadge(redacao.status_atual)}
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex justify-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 rounded-full bg-gray-100 hover:bg-gray-200"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => abrirVisualizacao(redacao)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Visualizar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => abrirDuplicacao(redacao)}>
                              <Copy className="w-4 h-4 mr-2" />
                              Duplicar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => abrirCorrecao(redacao)}>
                              <Edit className="w-4 h-4 mr-2" />
                              {redacao.status_atual === 'corrigida' ? "Editar" : "Corrigir"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => confirmarExclusao(redacao)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal de Visualização */}
      <Dialog open={!!redacaoVisualizacao} onOpenChange={() => setRedacaoVisualizacao(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Redação - {redacaoVisualizacao?.nome_aluno}</DialogTitle>
          </DialogHeader>
          {redacaoVisualizacao && (
            <div className="mt-4">
              <div className="bg-gray-50 p-4 rounded mb-4">
                <h3 className="font-bold text-redator-primary mb-2">
                  {redacaoVisualizacao.simulados.frase_tematica}
                </h3>
              </div>

              {/* Renderizar redação manuscrita ou digitada */}
              {redacaoVisualizacao.redacao_manuscrita_url ? (
                <div className="bg-white p-4 border rounded">
                  <p className="text-sm text-gray-600 mb-4">Redação manuscrita enviada em foto:</p>
                  <img
                    src={redacaoVisualizacao.redacao_manuscrita_url}
                    alt="Redação manuscrita"
                    className="max-w-full h-auto border rounded shadow-sm"
                    style={{ maxHeight: '70vh' }}
                  />
                </div>
              ) : (
                <div className="bg-white p-4 border rounded whitespace-pre-wrap">
                  {redacaoVisualizacao.texto || "Texto da redação não disponível."}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Duplicação */}
      <Dialog open={!!duplicandoRedacao} onOpenChange={() => setDuplicandoRedacao(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Duplicar Redação para Novo Corretor</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Corretor atual (não editável)</Label>
              <Input 
                value={duplicandoRedacao?.corretor_atual || 'Não atribuído'} 
                disabled
                className="bg-gray-100"
              />
            </div>

            <div>
              <Label>Novo corretor</Label>
              <Select value={novoCorretor} onValueChange={setNovoCorretor}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um corretor..." />
                </SelectTrigger>
                <SelectContent>
                  {corretores?.filter(c => c.id !== duplicandoRedacao?.corretor_id_atual).map(corretor => (
                    <SelectItem key={corretor.id} value={corretor.id}>
                      {corretor.nome_completo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDuplicandoRedacao(null)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleDuplicar}
                disabled={!novoCorretor || duplicarRedacao.isPending}
                className="bg-redator-primary"
              >
                {duplicarRedacao.isPending ? "Duplicando..." : "Confirmar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={!!redacaoParaExcluir} onOpenChange={() => setRedacaoParaExcluir(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Tem certeza de que deseja excluir a redação de <strong>{redacaoParaExcluir?.nome_aluno}</strong>?
            </p>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">
                <strong>Atenção:</strong> Esta ação não pode ser desfeita. A redação será permanentemente removida do sistema.
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setRedacaoParaExcluir(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleExcluir}
                disabled={excluirRedacao.isPending}
              >
                {excluirRedacao.isPending ? "Excluindo..." : "Confirmar Exclusão"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Correção */}
      <Dialog open={!!redacaoSelecionada} onOpenChange={() => setRedacaoSelecionada(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Correção - {redacaoSelecionada?.nome_aluno}</DialogTitle>
          </DialogHeader>
          
          {redacaoSelecionada && (
            <Tabs defaultValue="redacao" className="mt-4">
              <TabsList>
                <TabsTrigger value="redacao">Redação</TabsTrigger>
                <TabsTrigger value="correcao">Correção</TabsTrigger>
              </TabsList>
              
              <TabsContent value="redacao">
                <div className="bg-gray-50 p-4 rounded mb-4">
                  <h3 className="font-bold text-redator-primary">{redacaoSelecionada.simulados.frase_tematica}</h3>
                </div>
                <div className="bg-white p-4 border rounded whitespace-pre-wrap max-h-96 overflow-y-auto">
                  {redacaoSelecionada.texto}
                </div>
              </TabsContent>
              
              <TabsContent value="correcao" className="space-y-4">
                <div className="grid grid-cols-5 gap-4">
                  {[1, 2, 3, 4, 5].map(num => (
                    <div key={num}>
                      <Label>Competência {num}</Label>
                      <Input
                        type="number"
                        min="0"
                        max="200"
                        step="20"
                        value={notas[`nota_c${num}` as keyof typeof notas]}
                        onChange={(e) => setNotas({
                          ...notas,
                          [`nota_c${num}`]: parseInt(e.target.value) || 0
                        })}
                      />
                    </div>
                  ))}
                </div>
                
                <div>
                  <Label>Comentário Pedagógico</Label>
                  <Textarea
                    value={comentarioPedagogico}
                    onChange={(e) => setComentarioPedagogico(e.target.value)}
                    placeholder="Digite sua correção pedagógica detalhada..."
                    className="min-h-[200px]"
                  />
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="text-lg font-bold">
                    Nota Total: {Object.values(notas).reduce((acc: number, nota: any) => acc + parseInt(nota), 0)}
                  </div>
                  <Button 
                    onClick={handleCorrigir}
                    disabled={corrigirRedacao.isPending}
                    className="bg-redator-primary"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {corrigirRedacao.isPending ? "Salvando..." : "Salvar Correção"}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RedacaoSimuladoList;
