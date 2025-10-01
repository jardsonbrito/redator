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
        query = query.eq('turma_codigo', selectedTurma);
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
        .not('turma', 'is', null)
        .not('turma_codigo', 'is', null);

      if (error) {
        console.error('Erro ao buscar turmas:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Extrair turmas únicas
      const turmasUnicas = new Map();
      data.forEach(item => {
        if (item.turma && item.turma_codigo) {
          turmasUnicas.set(item.turma_codigo, {
            codigo: item.turma_codigo,
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
  }, [selectedAlunos, onDestinatariosChange]);

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

  const handleSelectAllFromTurma = () => {
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
      // Selecionar todos da turma específica
      const alunosDaTurma = alunos.filter(aluno =>
        aluno.turma_codigo === selectedTurma &&
        !selectedAlunos.some(s => s.id === aluno.id)
      ).map(aluno => ({
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
    }
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

          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Filtro por turma */}
            <div>
              <Label htmlFor="turma-filter">Filtrar por turma:</Label>
              <select
                id="turma-filter"
                value={selectedTurma}
                onChange={(e) => setSelectedTurma(e.target.value)}
                className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="todas">Todas as turmas ({turmas.length} turmas encontradas)</option>
                {turmas.map((turma) => (
                  <option key={turma.codigo} value={turma.codigo}>
                    {turma.nome} ({turma.codigo})
                  </option>
                ))}
              </select>
              {turmasError && (
                <div className="text-red-600 text-xs mt-1">
                  Erro ao carregar turmas: {turmasError.message}
                </div>
              )}
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