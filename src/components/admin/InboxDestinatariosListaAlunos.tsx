import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Search, Users, User, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AlunoSelecionado {
  id: string;
  email: string;
  nome: string;
  sobrenome?: string;
  turma?: string;
  turmaCodigo?: string;
}

interface InboxDestinatariosListaAlunosProps {
  onDestinatariosChange: (destinatarios: AlunoSelecionado[]) => void;
  destinatariosSelecionados?: AlunoSelecionado[];
}

export function InboxDestinatariosListaAlunos({
  onDestinatariosChange,
  destinatariosSelecionados = []
}: InboxDestinatariosListaAlunosProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTurma, setSelectedTurma] = useState<string>("todas");
  const [selectedAlunos, setSelectedAlunos] = useState<AlunoSelecionado[]>(destinatariosSelecionados);
  const [turmasSelecionadas, setTurmasSelecionadas] = useState<string[]>([]);

  // Buscar todos os alunos ativos
  const { data: alunos = [], isLoading: loadingAlunos } = useQuery({
    queryKey: ['alunos-lista-inbox', searchTerm, selectedTurma],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('id, email, nome, sobrenome, turma, turma_codigo')
        .eq('user_type', 'aluno')
        .eq('ativo', true)
        .order('nome');

      // Filtrar por turma se selecionada
      if (selectedTurma && selectedTurma !== 'todas') {
        // Buscar primeiro uma turma pelo código
        const turmaSelecionada = turmas.find(t => t.codigo === selectedTurma);

        if (turmaSelecionada) {
          // Tentar filtrar por turma_codigo primeiro, depois por turma
          query = query.or(`turma_codigo.eq.${selectedTurma},turma.eq.${turmaSelecionada.nome}`);
        } else {
          // Fallback: usar diretamente o valor como turma_codigo
          query = query.eq('turma_codigo', selectedTurma);
        }
      }

      // Filtrar por termo de busca
      if (searchTerm.trim()) {
        const termo = searchTerm.trim();
        query = query.or(`nome.ilike.%${termo}%,sobrenome.ilike.%${termo}%,email.ilike.%${termo}%`);
      }

      const { data, error } = await query.limit(200);

      if (error) {
        console.error('Erro ao buscar alunos:', error);
        throw error;
      }

      return data || [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
  });

  // Buscar turmas únicas
  const { data: turmas = [], error: turmasError } = useQuery({
    queryKey: ['turmas-lista-inbox'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('turma, turma_codigo')
        .eq('user_type', 'aluno')
        .eq('ativo', true)
        .not('turma', 'is', null);

      if (error) {
        console.error('Erro ao buscar turmas:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        // Fallback: usar turmas fixas como no AlunoList
        return [
          { codigo: 'turma-a', nome: 'Turma A' },
          { codigo: 'turma-b', nome: 'Turma B' },
          { codigo: 'turma-c', nome: 'Turma C' },
          { codigo: 'turma-d', nome: 'Turma D' },
          { codigo: 'turma-e', nome: 'Turma E' }
        ];
      }

      // Extrair turmas únicas
      const turmasUnicas = new Map();
      data.forEach(item => {
        if (item.turma) {
          // Como turma_codigo está null, usar o próprio nome da turma como código
          // Isso garante que o código usado nos checkboxes corresponda ao valor real no banco
          turmasUnicas.set(item.turma, {
            codigo: item.turma, // Usar o nome real da turma como código
            nome: item.turma
          });
        }
      });

      const turmasArray = Array.from(turmasUnicas.values()).sort((a, b) => a.nome.localeCompare(b.nome));
      return turmasArray;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Notificar mudanças na seleção
  useEffect(() => {
    onDestinatariosChange(selectedAlunos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAlunos]);

  const handleSelectAluno = (aluno: any, isSelected: boolean) => {
    if (isSelected) {
      const alunoSelecionado: AlunoSelecionado = {
        id: aluno.id,
        email: aluno.email,
        nome: aluno.nome,
        sobrenome: aluno.sobrenome,
        turma: aluno.turma,
        turmaCodigo: aluno.turma_codigo,
      };
      setSelectedAlunos(prev => [...prev, alunoSelecionado]);
    } else {
      setSelectedAlunos(prev => prev.filter(a => a.id !== aluno.id));
    }
  };

  const handleSelectAllFromTurma = async () => {
    if (selectedTurma === 'todas') {
      // Selecionar todos os alunos visíveis
      const novosAlunos = alunos.filter(aluno =>
        !selectedAlunos.some(s => s.id === aluno.id)
      ).map(aluno => ({
        id: aluno.id,
        email: aluno.email,
        nome: aluno.nome,
        sobrenome: aluno.sobrenome,
        turma: aluno.turma,
        turmaCodigo: aluno.turma_codigo,
      }));

      setSelectedAlunos(prev => [...prev, ...novosAlunos]);
      toast.success(`${novosAlunos.length} alunos adicionados`);
    } else {
      try {
        // Buscar TODOS os alunos da turma, IGNORANDO filtro de busca
        const { data: todosAlunosDaTurma, error } = await supabase
          .from('profiles')
          .select('id, email, nome, sobrenome, turma, turma_codigo')
          .eq('user_type', 'aluno')
          .eq('ativo', true)
          .eq('turma_codigo', selectedTurma)
          .order('nome');

        if (error) throw error;

        if (!todosAlunosDaTurma || todosAlunosDaTurma.length === 0) {
          toast.warning("Esta turma não possui alunos ativos");
          return;
        }

        // Filtrar apenas os que não estão selecionados
        const alunosDaTurma = todosAlunosDaTurma
          .filter(aluno => !selectedAlunos.some(s => s.id === aluno.id))
          .map(aluno => ({
            id: aluno.id,
            email: aluno.email,
            nome: aluno.nome,
            sobrenome: aluno.sobrenome,
            turma: aluno.turma,
            turmaCodigo: aluno.turma_codigo,
          }));

        setSelectedAlunos(prev => [...prev, ...alunosDaTurma]);

        const turma = turmas.find(t => t.codigo === selectedTurma);
        toast.success(`${alunosDaTurma.length} alunos da turma "${turma?.nome}" adicionados`);
      } catch (error) {
        console.error('Erro ao selecionar todos os alunos da turma:', error);
        toast.error("Erro ao selecionar alunos da turma");
      }
    }
  };

  const handleAdicionarTurmasSelecionadas = async () => {
    if (turmasSelecionadas.length === 0) {
      toast.error("Selecione pelo menos uma turma");
      return;
    }

    try {

      // Buscar todos os alunos das turmas selecionadas
      // Como turma_codigo está null, usar o campo 'turma' diretamente
      const { data: todosAlunosDasTurmas, error } = await supabase
        .from('profiles')
        .select('id, email, nome, sobrenome, turma, turma_codigo')
        .eq('user_type', 'aluno')
        .eq('ativo', true)
        .in('turma', turmasSelecionadas) // Usar 'turma' ao invés de 'turma_codigo'
        .order('nome');

      if (error) throw error;

      if (!todosAlunosDasTurmas || todosAlunosDasTurmas.length === 0) {
        toast.warning("As turmas selecionadas não possuem alunos ativos");
        return;
      }

      // Filtrar apenas os que não estão selecionados
      const novosAlunos = todosAlunosDasTurmas
        .filter(aluno => !selectedAlunos.some(s => s.id === aluno.id))
        .map(aluno => ({
          id: aluno.id,
          email: aluno.email,
          nome: aluno.nome,
          sobrenome: aluno.sobrenome,
          turma: aluno.turma,
          turmaCodigo: aluno.turma_codigo,
        }));

      setSelectedAlunos(prev => [...prev, ...novosAlunos]);

      const turmasNomes = turmas
        .filter(t => turmasSelecionadas.includes(t.codigo))
        .map(t => t.nome)
        .join(', ');

      toast.success(`${novosAlunos.length} alunos das turmas ${turmasNomes} adicionados`);
      setTurmasSelecionadas([]); // Limpar seleção de turmas
    } catch (error) {
      console.error('Erro ao adicionar turmas:', error);
      toast.error("Erro ao adicionar alunos das turmas");
    }
  };

  const handleToggleTurma = (turmaCodigo: string) => {
    setTurmasSelecionadas(prev => {
      const novaLista = prev.includes(turmaCodigo)
        ? prev.filter(t => t !== turmaCodigo)
        : [...prev, turmaCodigo];
      return novaLista;
    });
  };

  const handleRemoveAluno = (alunoId: string) => {
    setSelectedAlunos(prev => prev.filter(a => a.id !== alunoId));
  };

  const handleClearAll = () => {
    setSelectedAlunos([]);
    toast.info("Seleção limpa");
  };

  const isAlunoSelected = (alunoId: string) => {
    return selectedAlunos.some(a => a.id === alunoId);
  };

  const formatNomeCompleto = (aluno: any) => {
    const nome = aluno.nome || '';
    const sobrenome = aluno.sobrenome || '';
    return `${nome} ${sobrenome}`.trim();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Selecionar Destinatários
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Seleção múltipla de turmas */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <Label className="text-base font-semibold mb-3 block">Adicionar turmas completas:</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              {turmas.map((turma) => (
                <div key={turma.codigo} className="flex items-center space-x-2">
                  <Checkbox
                    id={`turma-${turma.codigo}`}
                    checked={turmasSelecionadas.includes(turma.codigo)}
                    onCheckedChange={() => handleToggleTurma(turma.codigo)}
                  />
                  <label
                    htmlFor={`turma-${turma.codigo}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {turma.nome}
                  </label>
                </div>
              ))}
            </div>
            <div className="text-xs text-muted-foreground mb-2">
              Turmas selecionadas: {turmasSelecionadas.length} | {turmasSelecionadas.join(', ') || 'nenhuma'}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleAdicionarTurmasSelecionadas();
              }}
              disabled={turmasSelecionadas.length === 0}
              className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background h-9 px-4 py-2 ${
                turmasSelecionadas.length > 0
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <GraduationCap className="h-4 w-4 mr-2" />
              {turmasSelecionadas.length === 0
                ? 'Selecione turmas acima'
                : `Adicionar ${turmasSelecionadas.length !== 1 ? `${turmasSelecionadas.length} turmas` : '1 turma'}`
              }
            </button>
          </div>

          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Filtro por turma */}
            <div>
              <Label htmlFor="turma-filter">Filtrar visualização por turma:</Label>
              <select
                id="turma-filter"
                value={selectedTurma}
                onChange={(e) => setSelectedTurma(e.target.value)}
                className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="todas">Todas as turmas</option>
                {turmas.map((turma) => (
                  <option key={turma.codigo} value={turma.codigo}>
                    {turma.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Campo de busca */}
            <div>
              <Label htmlFor="search-alunos">Buscar alunos:</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-alunos"
                  placeholder="Nome, sobrenome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Ações de seleção */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleSelectAllFromTurma}
              variant="outline"
              size="sm"
              disabled={alunos.length === 0}
            >
              <Users className="h-4 w-4 mr-1" />
              Selecionar todos ({alunos.length})
            </Button>

            {selectedAlunos.length > 0 && (
              <Button
                onClick={handleClearAll}
                variant="outline"
                size="sm"
              >
                <X className="h-4 w-4 mr-1" />
                Limpar seleção
              </Button>
            )}
          </div>

          {/* Lista de alunos */}
          <div>
            <Label className="text-sm font-medium">
              Alunos encontrados ({alunos.length})
              {searchTerm && ` para "${searchTerm}"`}
              {selectedTurma !== 'todas' && ` na turma selecionada`}
            </Label>

            <ScrollArea className="h-64 mt-2 border rounded-lg">
              <div className="p-3 space-y-2">
                {loadingAlunos ? (
                  <div className="text-center py-4 text-muted-foreground">
                    Carregando alunos...
                  </div>
                ) : alunos.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    {searchTerm ? 'Nenhum aluno encontrado para a busca' : 'Nenhum aluno encontrado'}
                  </div>
                ) : (
                  alunos.map((aluno) => (
                    <div
                      key={aluno.id}
                      className={`flex items-center space-x-3 p-2 rounded-lg border transition-colors ${
                        isAlunoSelected(aluno.id)
                          ? 'bg-primary/5 border-primary/20'
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <Checkbox
                        id={`aluno-${aluno.id}`}
                        checked={isAlunoSelected(aluno.id)}
                        onCheckedChange={(checked) => handleSelectAluno(aluno, checked as boolean)}
                      />
                      <label
                        htmlFor={`aluno-${aluno.id}`}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm">
                              {formatNomeCompleto(aluno)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {aluno.email}
                            </div>
                          </div>
                          {aluno.turma && (
                            <Badge variant="outline" className="text-xs">
                              <GraduationCap className="h-3 w-3 mr-1" />
                              {aluno.turma}
                            </Badge>
                          )}
                        </div>
                      </label>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Destinatários selecionados */}
          {selectedAlunos.length > 0 && (
            <div>
              <Label className="text-sm font-medium">
                Destinatários selecionados ({selectedAlunos.length})
              </Label>
              <div className="flex flex-wrap gap-2 mt-2 p-3 bg-muted/30 rounded-lg">
                {selectedAlunos.map((aluno) => (
                  <Badge
                    key={aluno.id}
                    variant="secondary"
                    className="pl-2 pr-1 py-1"
                  >
                    <User className="h-3 w-3 mr-1" />
                    {formatNomeCompleto(aluno)}
                    {aluno.turma && ` (${aluno.turma})`}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveAluno(aluno.id)}
                      className="ml-1 h-auto p-0 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}