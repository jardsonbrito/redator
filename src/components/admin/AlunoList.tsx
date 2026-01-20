import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Edit, Trash2, Search, UserX, UserCheck, Users, Info, MoreHorizontal, LogIn, CheckSquare } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { VisitanteInfoModal } from "./VisitanteInfoModal";
import { MigrarVisitanteModal } from "./MigrarVisitanteModal";
import { StudentLoginActivityModal } from "./StudentLoginActivityModal";
import { formatTurmaDisplay, getTurmaColorClasses } from "@/utils/turmaUtils";

interface Aluno {
  id: string;
  nome: string;
  email: string;
  turma: string;
  created_at: string;
  ativo: boolean;
  tipo?: 'aluno' | 'visitante';
  ultimo_acesso?: string;
  total_redacoes?: number;
  session_id?: string;
  whatsapp?: string;
  temPlanoAtivo?: boolean;
}

interface AlunoListProps {
  refresh: boolean;
  onEdit: (aluno: Aluno) => void;
}

export const AlunoList = ({ refresh, onEdit }: AlunoListProps) => {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTurma, setActiveTurma] = useState("todos");
  const [selectedVisitante, setSelectedVisitante] = useState<Aluno | null>(null);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [visitanteParaMigrar, setVisitanteParaMigrar] = useState<Aluno | null>(null);
  const [isMigrarModalOpen, setIsMigrarModalOpen] = useState(false);
  const [loginModalAluno, setLoginModalAluno] = useState<Aluno | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const fetchAlunos = async () => {
    setLoading(true);
    try {
      const todosUsuarios: Aluno[] = [];
      const hojeStr = new Date().toISOString().split('T')[0];

      // Buscar alunos tradicionais, visitantes e assinaturas em paralelo
      const [
        { data: alunosData, error: alunosError },
        { data: visitantesData, error: visitantesError },
        { data: todasRedacoes, error: redacoesError },
        { data: assinaturasAtivas, error: assinaturasError }
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, nome, email, turma, created_at, ativo")
          .eq("user_type", "aluno")
          .eq("is_authenticated_student", true)
          .order("nome", { ascending: true }),

        // Buscar visitantes da tabela visitante_sessoes
        supabase
          .from("visitante_sessoes")
          .select("id, email_visitante, nome_visitante, session_id, primeiro_acesso, ultimo_acesso, ativo, whatsapp")
          .order("ultimo_acesso", { ascending: false }),

        // Buscar TODAS as redações de uma vez
        supabase
          .from('redacoes_enviadas')
          .select('email_aluno, turma'),

        // Buscar assinaturas ativas (data_validade >= hoje)
        supabase
          .from('assinaturas')
          .select('aluno_id')
          .gte('data_validade', hojeStr)
      ]);

      if (alunosError) throw alunosError;
      if (redacoesError) throw redacoesError;
      if (assinaturasError) throw assinaturasError;

      // Criar Set de alunos com plano ativo
      const alunosComPlanoSet = new Set(assinaturasAtivas?.map(a => a.aluno_id) || []);

      // Criar mapa de contagem de redações por email (otimização)
      const redacoesPorEmail = new Map<string, number>();
      
      if (todasRedacoes) {
        todasRedacoes.forEach(redacao => {
          const email = redacao.email_aluno.toLowerCase();
          redacoesPorEmail.set(email, (redacoesPorEmail.get(email) || 0) + 1);
        });
      }

      // Processar alunos
      if (alunosData) {
        alunosData.forEach(aluno => {
          const emailLower = aluno.email.toLowerCase();
          const totalRedacoes = redacoesPorEmail.get(emailLower) || 0;
          const temPlanoAtivo = alunosComPlanoSet.has(aluno.id);

          todosUsuarios.push({
            ...aluno,
            tipo: 'aluno',
            total_redacoes: totalRedacoes,
            temPlanoAtivo
          });
        });
      }

      // Processar visitantes da tabela visitante_sessoes
      if (visitantesData) {
        visitantesData.forEach(visitante => {
          const emailLower = visitante.email_visitante.toLowerCase();
          const totalRedacoes = redacoesPorEmail.get(emailLower) || 0;

          todosUsuarios.push({
            id: visitante.id,
            nome: visitante.nome_visitante,
            email: visitante.email_visitante,
            turma: 'VISITANTE',
            created_at: visitante.primeiro_acesso,
            ativo: visitante.ativo,
            tipo: 'visitante',
            ultimo_acesso: visitante.ultimo_acesso,
            session_id: visitante.session_id,
            total_redacoes: totalRedacoes,
            whatsapp: visitante.whatsapp,
            temPlanoAtivo: false // Visitantes não têm plano
          });
        });
      }

      // Ordenar: visitantes engajados primeiro, depois alunos por nome
      todosUsuarios.sort((a, b) => {
        if (a.tipo === 'visitante' && b.tipo === 'aluno' && a.total_redacoes > 0) return -1;
        if (a.tipo === 'aluno' && b.tipo === 'visitante' && b.total_redacoes > 0) return 1;
        return a.nome.localeCompare(b.nome);
      });

      setAlunos(todosUsuarios);
    } catch (error: any) {
      console.error("Erro ao buscar usuários:", error);
      toast({
        title: "Erro ao carregar dados",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlunos();
  }, [refresh]);

  // Lista fixa de turmas do sistema + visitantes + aguardando reativação
  const turmasDisponiveis = useMemo(() => {
    // Usando formato normalizado: letras únicas + aba especial para aguardando reativação
    const turmasFixas = ['VISITANTE', 'A', 'B', 'C', 'D', 'E', 'AGUARDANDO'];
    return turmasFixas;
  }, []);

  // Turmas que requerem plano ativo para aparecer nas abas
  const turmasComPlano = ['A', 'B', 'C', 'D', 'E'];

  // Filtrar alunos baseado na turma ativa e termo de busca
  const filteredAlunos = useMemo(() => {
    let filtered = alunos;

    // Filtrar por turma
    if (activeTurma === "AGUARDANDO") {
      // Aba especial: alunos das turmas A-E SEM plano ativo
      filtered = filtered.filter(aluno =>
        turmasComPlano.includes(aluno.turma) && !aluno.temPlanoAtivo
      );
    } else if (activeTurma !== "todos") {
      if (turmasComPlano.includes(activeTurma)) {
        // Turmas A-E: mostrar apenas alunos COM plano ativo
        filtered = filtered.filter(aluno =>
          aluno.turma === activeTurma && aluno.temPlanoAtivo
        );
      } else {
        // VISITANTE ou outras turmas: filtro normal
        filtered = filtered.filter(aluno => aluno.turma === activeTurma);
      }
    }

    // Filtrar por termo de busca (apenas nome e email)
    if (searchTerm.trim()) {
      filtered = filtered.filter(aluno =>
        aluno.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        aluno.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [alunos, activeTurma, searchTerm]);

  // Contar alunos por turma (considerando plano ativo)
  const contadorPorTurma = useMemo(() => {
    const contador: { [key: string]: number } = {};

    alunos.forEach(aluno => {
      if (turmasComPlano.includes(aluno.turma)) {
        // Para turmas A-E: contar apenas se tem plano ativo
        if (aluno.temPlanoAtivo) {
          contador[aluno.turma] = (contador[aluno.turma] || 0) + 1;
        }
      } else {
        // VISITANTE e outras: contagem normal
        contador[aluno.turma] = (contador[aluno.turma] || 0) + 1;
      }
    });

    // Contar alunos aguardando reativação (turmas A-E sem plano)
    contador['AGUARDANDO'] = alunos.filter(aluno =>
      turmasComPlano.includes(aluno.turma) && !aluno.temPlanoAtivo
    ).length;

    return contador;
  }, [alunos]);


  const handleEdit = (aluno: Aluno) => {
    console.log("AlunoList - Clicou em editar aluno:", aluno);
    console.log("AlunoList - Dados do aluno:", {
      id: aluno.id,
      nome: aluno.nome,
      email: aluno.email,
      turma: aluno.turma,
      created_at: aluno.created_at
    });
    
    // Garantir que todos os dados necessários estão presentes
    const alunoParaEdicao = {
      id: aluno.id,
      nome: aluno.nome || '',
      email: aluno.email || '',
      turma: aluno.turma || '',
      created_at: aluno.created_at,
      ativo: aluno.ativo
    };
    
    console.log("AlunoList - Enviando para onEdit:", alunoParaEdicao);
    onEdit(alunoParaEdicao);
  };

  const handleDelete = async (aluno: Aluno) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", aluno.id);

      if (error) throw error;

      toast({
        title: "Aluno excluído",
        description: `${aluno.nome} foi removido do sistema.`
      });

      fetchAlunos();
    } catch (error: any) {
      console.error("Erro ao excluir aluno:", error);
      toast({
        title: "Erro ao excluir aluno",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    }
  };

  const handleToggleStatus = async (aluno: Aluno) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ ativo: !aluno.ativo })
        .eq("id", aluno.id);

      if (error) throw error;

      toast({
        title: aluno.ativo ? "Aluno desativado" : "Aluno ativado",
        description: `${aluno.nome} foi ${aluno.ativo ? 'desativado' : 'ativado'} com sucesso.`
      });

      fetchAlunos();
    } catch (error: any) {
      console.error("Erro ao alterar status do aluno:", error);
      toast({
        title: "Erro ao alterar status",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    }
  };

  const handleShowVisitanteInfo = (visitante: Aluno) => {
    setSelectedVisitante(visitante);
    setIsInfoModalOpen(true);
  };

  const handleShowMigrarModal = (visitante: Aluno) => {
    setVisitanteParaMigrar(visitante);
    setIsMigrarModalOpen(true);
  };

  const handleMigracaoSuccess = () => {
    // Recarregar a lista após migração bem-sucedida
    fetchAlunos();
  };

  const handleDeleteVisitante = async (visitante: Aluno) => {
    try {
      // 1. Excluir redações enviadas pelo visitante
      const { error: redacoesError } = await supabase
        .from('redacoes_enviadas')
        .delete()
        .eq('email_aluno', visitante.email);

      if (redacoesError) {
        console.error('Erro ao excluir redações:', redacoesError);
      }

      // 2. Excluir sessão do visitante
      const { error: sessaoError } = await supabase
        .from('visitante_sessoes')
        .delete()
        .eq('id', visitante.id);

      if (sessaoError) throw sessaoError;

      toast({
        title: "Visitante excluído",
        description: `${visitante.nome} e todos os seus dados foram removidos do sistema.`
      });

      fetchAlunos();
    } catch (error: any) {
      console.error("Erro ao excluir visitante:", error);
      toast({
        title: "Erro ao excluir visitante",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    }
  };

  // Funções de seleção múltipla
  const handleSelectItem = (id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredAlunos.map(a => a.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;

    const selectedItems = alunos.filter(a => selectedIds.has(a.id));
    const visitantes = selectedItems.filter(a => a.tipo === 'visitante');
    const alunosRegulares = selectedItems.filter(a => a.tipo === 'aluno');

    setIsDeleting(true);
    try {
      // Excluir visitantes e seus dados
      for (const visitante of visitantes) {
        // Excluir redações do visitante
        await supabase
          .from('redacoes_enviadas')
          .delete()
          .eq('email_aluno', visitante.email);

        // Excluir sessão do visitante
        await supabase
          .from('visitante_sessoes')
          .delete()
          .eq('id', visitante.id);
      }

      // Excluir alunos regulares
      if (alunosRegulares.length > 0) {
        const alunoIds = alunosRegulares.map(a => a.id);
        await supabase
          .from('profiles')
          .delete()
          .in('id', alunoIds);
      }

      toast({
        title: "Exclusão concluída",
        description: `${selectedIds.size} ${selectedIds.size === 1 ? 'item excluído' : 'itens excluídos'} com sucesso.`
      });

      setSelectedIds(new Set());
      fetchAlunos();
    } catch (error: any) {
      console.error("Erro ao excluir itens:", error);
      toast({
        title: "Erro ao excluir",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const getTurmaColor = (turma: string) => {
    // Usar função centralizada que normaliza automaticamente
    return getTurmaColorClasses(turma);
  };

  const getTipoBadge = (usuario: Aluno) => {
    if (usuario.tipo === 'visitante') {
      if (usuario.total_redacoes && usuario.total_redacoes > 0) {
        return <Badge className="bg-orange-100 text-orange-800 text-xs px-2">Engajado</Badge>;
      }
      return <Badge variant="outline" className="text-xs px-2">Visitante</Badge>;
    }
    return <Badge className="bg-blue-100 text-blue-800 text-xs px-2">Aluno</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Carregando alunos...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Lista de Alunos e Visitantes
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTurma} onValueChange={setActiveTurma} className="w-full">
          <TabsList className="flex w-full flex-wrap gap-1 h-auto p-1 bg-muted rounded-lg">
            <TabsTrigger value="todos" className="flex items-center gap-2">
              Todos ({alunos.length})
            </TabsTrigger>
            {turmasDisponiveis.map((turma) => (
              <TabsTrigger
                key={turma}
                value={turma}
                className="flex items-center gap-2"
              >
                {formatTurmaDisplay(turma)} ({contadorPorTurma[turma] || 0})
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="mt-4 mb-4 flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por nome ou e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {selectedIds.size > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={isDeleting}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir {selectedIds.size} {selectedIds.size === 1 ? 'selecionado' : 'selecionados'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar exclusão em lote</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir {selectedIds.size} {selectedIds.size === 1 ? 'item' : 'itens'}?
                      <br /><br />
                      <strong className="text-red-600">Atenção:</strong> Para visitantes, todas as redações enviadas também serão excluídas.
                      <br /><br />
                      Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteSelected}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          <TabsContent value="todos" className="mt-0">
            <AlunoTable
              alunos={filteredAlunos}
              loading={loading}
              searchTerm={searchTerm}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleStatus={handleToggleStatus}
              getTurmaColor={getTurmaColor}
              getTipoBadge={getTipoBadge}
              onShowVisitanteInfo={handleShowVisitanteInfo}
              onShowMigrarModal={handleShowMigrarModal}
              onShowLoginModal={setLoginModalAluno}
              onDeleteVisitante={handleDeleteVisitante}
              selectedIds={selectedIds}
              onSelectItem={handleSelectItem}
              onSelectAll={handleSelectAll}
            />
          </TabsContent>

          {turmasDisponiveis.map((turma) => (
            <TabsContent key={turma} value={turma} className="mt-0">
              <AlunoTable
                alunos={filteredAlunos}
                loading={loading}
                searchTerm={searchTerm}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleStatus={handleToggleStatus}
                getTurmaColor={getTurmaColor}
                getTipoBadge={getTipoBadge}
                onShowVisitanteInfo={handleShowVisitanteInfo}
                onShowMigrarModal={handleShowMigrarModal}
                onShowLoginModal={setLoginModalAluno}
                onDeleteVisitante={handleDeleteVisitante}
                selectedIds={selectedIds}
                onSelectItem={handleSelectItem}
                onSelectAll={handleSelectAll}
              />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>

      {/* Modal de Informações do Visitante */}
      <VisitanteInfoModal
        visitante={selectedVisitante && selectedVisitante.tipo === 'visitante' ? {
          id: selectedVisitante.id,
          nome: selectedVisitante.nome,
          email: selectedVisitante.email,
          turma: selectedVisitante.turma,
          created_at: selectedVisitante.created_at,
          ativo: selectedVisitante.ativo,
          tipo: 'visitante' as const,
          ultimo_acesso: selectedVisitante.ultimo_acesso,
          total_redacoes: selectedVisitante.total_redacoes,
          session_id: selectedVisitante.session_id,
          whatsapp: selectedVisitante.whatsapp
        } : null}
        isOpen={isInfoModalOpen}
        onClose={() => {
          setIsInfoModalOpen(false);
          setSelectedVisitante(null);
        }}
        onMigrar={handleShowMigrarModal}
      />

      {/* Modal de Migração do Visitante */}
      <MigrarVisitanteModal
        visitante={visitanteParaMigrar && visitanteParaMigrar.tipo === 'visitante' ? {
          id: visitanteParaMigrar.id,
          nome: visitanteParaMigrar.nome,
          email: visitanteParaMigrar.email,
          turma: visitanteParaMigrar.turma,
          created_at: visitanteParaMigrar.created_at,
          ativo: visitanteParaMigrar.ativo,
          tipo: 'visitante' as const,
          ultimo_acesso: visitanteParaMigrar.ultimo_acesso,
          total_redacoes: visitanteParaMigrar.total_redacoes,
          session_id: visitanteParaMigrar.session_id,
          whatsapp: visitanteParaMigrar.whatsapp
        } : null}
        isOpen={isMigrarModalOpen}
        onClose={() => {
          setIsMigrarModalOpen(false);
          setVisitanteParaMigrar(null);
        }}
        onSuccess={handleMigracaoSuccess}
      />

      {/* Modal de Histórico de Login */}
      {loginModalAluno && (
        <StudentLoginActivityModal
          studentEmail={loginModalAluno.email}
          studentName={loginModalAluno.nome}
          isOpen={!!loginModalAluno}
          onClose={() => setLoginModalAluno(null)}
        />
      )}
    </Card>
  );
};

// Componente separado para a tabela
interface AlunoTableProps {
  alunos: Aluno[];
  loading: boolean;
  searchTerm: string;
  onEdit: (aluno: Aluno) => void;
  onDelete: (aluno: Aluno) => void;
  onToggleStatus: (aluno: Aluno) => void;
  getTurmaColor: (turma: string) => string;
  getTipoBadge: (usuario: Aluno) => React.ReactNode;
  onShowVisitanteInfo: (visitante: Aluno) => void;
  onShowMigrarModal: (visitante: Aluno) => void;
  onShowLoginModal: (aluno: Aluno) => void;
  onDeleteVisitante: (visitante: Aluno) => void;
  selectedIds: Set<string>;
  onSelectItem: (id: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
}

const AlunoTable = ({
  alunos,
  loading,
  searchTerm,
  onEdit,
  onDelete,
  onToggleStatus,
  getTurmaColor,
  getTipoBadge,
  onShowVisitanteInfo,
  onShowMigrarModal,
  onShowLoginModal,
  onDeleteVisitante,
  selectedIds,
  onSelectItem,
  onSelectAll
}: AlunoTableProps) => {
  const allSelected = alunos.length > 0 && alunos.every(a => selectedIds.has(a.id));
  const someSelected = alunos.some(a => selectedIds.has(a.id)) && !allSelected;
  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-muted-foreground">Carregando alunos...</div>
      </div>
    );
  }

  if (alunos.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {searchTerm ? "Nenhum aluno encontrado com os critérios de busca." : "Nenhum aluno cadastrado nesta turma."}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px] p-2">
              <Checkbox
                checked={allSelected}
                onCheckedChange={onSelectAll}
                aria-label="Selecionar todos"
                className={someSelected ? "data-[state=checked]:bg-primary/50" : ""}
              />
            </TableHead>
            <TableHead className="w-[120px]">Nome</TableHead>
            <TableHead className="w-[160px]">E-mail</TableHead>
            <TableHead className="w-[80px]">Tipo</TableHead>
            <TableHead className="w-[60px]">Turma</TableHead>
            <TableHead className="w-[50px]">Red.</TableHead>
            <TableHead className="w-[50px]">Status</TableHead>
            <TableHead className="w-[70px]">Data</TableHead>
            <TableHead className="w-[100px] text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {alunos.map((aluno) => (
            <TableRow key={aluno.id} className={selectedIds.has(aluno.id) ? "bg-muted/50" : ""}>
              <TableCell className="p-2">
                <Checkbox
                  checked={selectedIds.has(aluno.id)}
                  onCheckedChange={(checked) => onSelectItem(aluno.id, checked as boolean)}
                  aria-label={`Selecionar ${aluno.nome}`}
                />
              </TableCell>
              <TableCell className="font-medium text-xs p-2 max-w-[120px] truncate" title={aluno.nome}>
                {aluno.nome}
              </TableCell>
              <TableCell className="text-xs p-2 max-w-[160px] truncate" title={aluno.email}>
                {aluno.email}
              </TableCell>
              <TableCell className="p-2">
                <div className={`text-xs px-2 py-1 rounded text-center font-medium ${aluno.tipo === 'visitante' ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-800'}`}>
                  {aluno.tipo === 'visitante' ? 'Visitante' : 'Aluno'}
                </div>
              </TableCell>
              <TableCell className="p-2">
                <div className={`text-xs px-1 py-0.5 rounded text-center font-medium ${getTurmaColor(aluno.turma)}`}>
                  {aluno.turma === 'VISITANTE' ? 'V' : aluno.turma || ''}
                </div>
              </TableCell>
              <TableCell className="text-center p-2">
                <div className="text-xs font-medium">
                  {aluno.total_redacoes || 0}
                </div>
              </TableCell>
              <TableCell className="text-center p-2">
                <div className={`text-xs ${aluno.ativo ? 'text-green-600' : 'text-gray-400'}`}>
                  {aluno.ativo ? "✓" : "✗"}
                </div>
              </TableCell>
              <TableCell className="p-2">
                <div className="text-xs">
                  <div className="font-medium">
                    {new Date(aluno.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </div>
                  {aluno.tipo === 'visitante' && aluno.ultimo_acesso && (
                    <div className="text-muted-foreground">
                      {new Date(aluno.ultimo_acesso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right p-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {aluno.tipo === 'visitante' ? (
                      // Ações para visitantes
                      <>
                        <DropdownMenuItem onClick={() => onShowVisitanteInfo(aluno)}>
                          <Info className="mr-2 h-4 w-4" />
                          Ver Informações
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onShowMigrarModal(aluno)}>
                          <UserCheck className="mr-2 h-4 w-4" />
                          Migrar para Aluno
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            if (window.confirm(`Tem certeza que deseja excluir ${aluno.nome} e TODOS os seus dados (incluindo redações enviadas)?`)) {
                              onDeleteVisitante(aluno);
                            }
                          }}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir Visitante
                        </DropdownMenuItem>
                      </>
                    ) : (
                      // Ações para alunos regulares
                      <>
                        <DropdownMenuItem onClick={() => onShowLoginModal(aluno)}>
                          <LogIn className="mr-2 h-4 w-4" />
                          Ver Login
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onEdit(aluno);
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onToggleStatus(aluno)}>
                          {aluno.ativo ? (
                            <>
                              <UserX className="mr-2 h-4 w-4" />
                              Desativar
                            </>
                          ) : (
                            <>
                              <UserCheck className="mr-2 h-4 w-4" />
                              Ativar
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            if (window.confirm(`Tem certeza que deseja excluir ${aluno.nome}?`)) {
                              onDelete(aluno);
                            }
                          }}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
