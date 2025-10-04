import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { X, Search, Users, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DestinatarioSelecionado {
  email: string;
  nome: string;
  tipo: 'aluno' | 'turma';
  turma?: string;
  turmaCodigo?: string;
}

interface InboxDestinatariosFormProps {
  onDestinatariosChange: (destinatarios: DestinatarioSelecionado[]) => void;
  destinatariosSelecionados?: DestinatarioSelecionado[];
}

export function InboxDestinatariosForm({ onDestinatariosChange, destinatariosSelecionados = [] }: InboxDestinatariosFormProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTurma, setSelectedTurma] = useState<string>("");
  const [selectedDestinatarios, setSelectedDestinatarios] = useState<DestinatarioSelecionado[]>(destinatariosSelecionados);

  // Buscar alunos
  const { data: alunos = [], isLoading: loadingAlunos } = useQuery({
    queryKey: ['alunos-inbox', searchTerm, selectedTurma],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('email, nome, turma, turma_codigo')
        .eq('user_type', 'aluno')
        .eq('ativo', true);

      // Filtrar por turma selecionada
      if (selectedTurma) {
        query = query.eq('turma_codigo', selectedTurma);
      }

      // Filtrar por termo de busca
      if (searchTerm) {
        query = query.or(`nome.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Buscar turmas únicas dos alunos
  const { data: turmas = [], isLoading: loadingTurmas } = useQuery({
    queryKey: ['turmas-alunos-inbox'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('turma, turma_codigo')
        .eq('user_type', 'aluno')
        .eq('ativo', true)
        .not('turma', 'is', null)
        .not('turma_codigo', 'is', null);

      if (error) {
        console.error('Erro ao buscar turmas dos alunos:', error);
        throw error;
      }

      // Extrair turmas únicas
      const turmasUnicas = new Map();
      (data || []).forEach(item => {
        if (item.turma && item.turma_codigo) {
          turmasUnicas.set(item.turma_codigo, {
            codigo: item.turma_codigo,
            nome: item.turma
          });
        }
      });

      console.log('Turmas encontradas:', Array.from(turmasUnicas.values()));
      return Array.from(turmasUnicas.values());
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    onDestinatariosChange(selectedDestinatarios);
  }, [selectedDestinatarios, onDestinatariosChange]);

  const handleSelectAluno = (aluno: { email: string; nome: string; turma: string; turma_codigo: string }, isSelected: boolean) => {
    if (isSelected) {
      const novoDestinatario: DestinatarioSelecionado = {
        email: aluno.email,
        nome: aluno.nome,
        tipo: 'aluno',
        turma: aluno.turma,
        turmaCodigo: aluno.turma_codigo,
      };
      setSelectedDestinatarios(prev => [...prev, novoDestinatario]);
    } else {
      setSelectedDestinatarios(prev =>
        prev.filter(d => !(d.email === aluno.email && d.tipo === 'aluno'))
      );
    }
  };

  const handleSelectAllFromTurma = async () => {
    if (!selectedTurma) {
      toast.error("Selecione uma turma primeiro");
      return;
    }

    const turma = turmas.find(t => t.codigo === selectedTurma);
    if (!turma) {
      console.log('Turma não encontrada:', selectedTurma);
      return;
    }

    try {
      console.log('Buscando todos os alunos da turma:', selectedTurma);

      // Buscar TODOS os alunos da turma, IGNORANDO o filtro de busca
      const { data: todosAlunosDaTurma, error } = await supabase
        .from('profiles')
        .select('email, nome, turma, turma_codigo')
        .eq('user_type', 'aluno')
        .eq('ativo', true)
        .eq('turma_codigo', selectedTurma);

      console.log('Resultado da busca:', { todosAlunosDaTurma, error });

      if (error) throw error;

      if (!todosAlunosDaTurma || todosAlunosDaTurma.length === 0) {
        toast.warning("Esta turma não possui alunos ativos");
        return;
      }

      // Adicionar todos os alunos da turma
      const novosDestinatarios: DestinatarioSelecionado[] = todosAlunosDaTurma.map(aluno => ({
        email: aluno.email,
        nome: aluno.nome,
        tipo: 'aluno' as const,
        turma: aluno.turma,
        turmaCodigo: aluno.turma_codigo,
      }));

      console.log('Novos destinatários criados:', novosDestinatarios);

      // Remover duplicatas baseadas no email
      setSelectedDestinatarios(prev => {
        const emailsExistentes = new Set(prev.map(d => d.email));
        const destinatariosUnicos = novosDestinatarios.filter(d => !emailsExistentes.has(d.email));
        const novaLista = [...prev, ...destinatariosUnicos];

        console.log('Destinatários anteriores:', prev.length);
        console.log('Destinatários únicos novos:', destinatariosUnicos.length);
        console.log('Total após adição:', novaLista.length);

        return novaLista;
      });

      toast.success(`${todosAlunosDaTurma.length} alunos da turma "${turma.nome}" selecionados`);
    } catch (error) {
      console.error('Erro ao selecionar todos os alunos:', error);
      toast.error("Erro ao selecionar alunos da turma");
    }
  };

  const handleRemoveDestinatario = (destinatario: DestinatarioSelecionado) => {
    setSelectedDestinatarios(prev =>
      prev.filter(d => d.email !== destinatario.email)
    );
  };

  const isAlunoSelected = (aluno: { email: string; nome: string; turma: string; turma_codigo: string }) => {
    return selectedDestinatarios.some(d => d.email === aluno.email && d.tipo === 'aluno');
  };


  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">Seleção de Destinatários</h3>

        {/* Seletor de turma */}
        <div className="mb-6">
          <Label htmlFor="turma-select">Selecionar Turma</Label>
          <select
            id="turma-select"
            value={selectedTurma}
            onChange={(e) => setSelectedTurma(e.target.value)}
            className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="">-- Selecione uma turma --</option>
            {turmas.map((turma) => (
              <option key={turma.codigo} value={turma.codigo}>
                {turma.nome}
              </option>
            ))}
          </select>
          {selectedTurma && (
            <Button
              onClick={handleSelectAllFromTurma}
              variant="outline"
              size="sm"
              className="mt-2"
            >
              <Users className="h-4 w-4 mr-2" />
              Selecionar todos os alunos desta turma
            </Button>
          )}
        </div>

        {/* Campo de busca (somente se turma selecionada) */}
        {selectedTurma && (
          <div className="mb-6">
            <Label htmlFor="search">Buscar alunos na turma selecionada</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Digite o nome ou email do aluno..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        )}

        {/* Destinatários selecionados */}
        {selectedDestinatarios.length > 0 && (
          <div className="mb-6">
            <Label>Destinatários Selecionados ({selectedDestinatarios.length})</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedDestinatarios.map((destinatario, index) => (
                <Badge key={`${destinatario.email}-${index}`} variant="secondary" className="pl-2 pr-1">
                  <User className="h-3 w-3 mr-1" />
                  {destinatario.nome}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveDestinatario(destinatario)}
                    className="ml-1 h-auto p-0 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Lista de Alunos (somente se turma selecionada) */}
        {selectedTurma && (
          <div>
            <h4 className="font-medium mb-3 flex items-center">
              <User className="h-4 w-4 mr-2" />
              Alunos da turma selecionada ({alunos.length} encontrados)
            </h4>
            <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3">
              {loadingAlunos ? (
                <div className="text-sm text-muted-foreground">Carregando alunos...</div>
              ) : alunos.length === 0 ? (
                <div className="text-sm text-muted-foreground">Nenhum aluno encontrado nesta turma</div>
              ) : (
                alunos.map((aluno) => (
                  <div key={aluno.email} className="flex items-center space-x-2">
                    <Checkbox
                      id={`aluno-${aluno.email}`}
                      checked={isAlunoSelected(aluno)}
                      onCheckedChange={(checked) => handleSelectAluno(aluno, checked as boolean)}
                    />
                    <label htmlFor={`aluno-${aluno.email}`} className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer">
                      <div>{aluno.nome}</div>
                      <div className="text-xs text-muted-foreground">{aluno.email}</div>
                      {aluno.turma && (
                        <div className="text-xs text-muted-foreground">Turma: {aluno.turma}</div>
                      )}
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Instruções quando nenhuma turma selecionada */}
        {!selectedTurma && (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Selecione uma turma</p>
            <p className="text-sm">Escolha uma turma acima para ver os alunos disponíveis</p>
          </div>
        )}

        <div className="mt-4 text-sm text-muted-foreground">
          <p>• Primeiro selecione uma turma para ver os alunos disponíveis</p>
          <p>• Use o botão "Selecionar todos" para incluir toda a turma</p>
          <p>• Ou marque alunos individualmente conforme necessário</p>
          <p>• Use a busca para filtrar alunos por nome ou email</p>
        </div>
      </div>
    </div>
  );
}