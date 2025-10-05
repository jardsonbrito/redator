import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Calendar, Save, Award } from 'lucide-react';
import { useTurmasDisponiveis, useEtapas } from '@/hooks/useDiario';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AlunoAvaliacao {
  email: string;
  nome: string;
  nota: number | null;
  observacoes?: string;
}

export default function AvaliacaoPresencial() {
  const [selectedTurma, setSelectedTurma] = useState<string>('');
  const [selectedEtapa, setSelectedEtapa] = useState<string>('');
  const [alunos, setAlunos] = useState<AlunoAvaliacao[]>([]);

  const { data: turmas, isLoading: loadingTurmas } = useTurmasDisponiveis();
  const { data: etapas, isLoading: loadingEtapas } = useEtapas(selectedTurma);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar alunos da turma selecionada
  const { isLoading: loadingAlunos } = useQuery({
    queryKey: ['alunos_avaliacao', selectedTurma, selectedEtapa],
    queryFn: async () => {
      if (!selectedTurma || !selectedEtapa) return [];

      // Buscar alunos da turma
      const { data: alunosData, error: alunosError } = await supabase
        .from('profiles')
        .select('email, nome')
        .eq('user_type', 'aluno')
        .eq('turma', selectedTurma)
        .eq('ativo', true)
        .order('nome');

      if (alunosError) throw alunosError;

      // Buscar notas existentes para esta etapa
      const { data: notasData, error: notasError } = await supabase
        .from('avaliacoes_presenciais')
        .select('aluno_email, nota, observacoes')
        .eq('turma', selectedTurma)
        .eq('etapa_id', selectedEtapa);

      if (notasError) throw notasError;

      // Combinar dados
      const alunosComNotas = alunosData.map(aluno => {
        const notaExistente = notasData?.find(n => n.aluno_email === aluno.email);
        return {
          email: aluno.email,
          nome: aluno.nome,
          nota: notaExistente?.nota || null,
          observacoes: notaExistente?.observacoes || ''
        };
      });

      setAlunos(alunosComNotas);
      return alunosComNotas;
    },
    enabled: !!selectedTurma && !!selectedEtapa
  });

  // Mutation para salvar notas
  const salvarNotasMutation = useMutation({
    mutationFn: async () => {
      const notasParaSalvar = alunos.filter(a => a.nota !== null && a.nota >= 0 && a.nota <= 10);

      if (notasParaSalvar.length === 0) {
        throw new Error('Nenhuma nota válida para salvar');
      }

      const promises = notasParaSalvar.map(aluno =>
        supabase
          .from('avaliacoes_presenciais')
          .upsert({
            turma: selectedTurma,
            etapa_id: selectedEtapa,
            aluno_email: aluno.email,
            nota: aluno.nota,
            observacoes: aluno.observacoes,
            data_avaliacao: new Date().toISOString().split('T')[0]
          }, {
            onConflict: 'aluno_email,etapa_id'
          })
      );

      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error);

      if (errors.length > 0) {
        throw new Error(`Erro ao salvar ${errors.length} nota(s)`);
      }

      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alunos_avaliacao'] });
      queryClient.invalidateQueries({ queryKey: ['diario_aluno'] });
      queryClient.invalidateQueries({ queryKey: ['resumo_turma'] });
      toast({
        title: 'Sucesso',
        description: 'Notas salvas com sucesso!',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao salvar notas',
        variant: 'destructive',
      });
    }
  });

  const handleNotaChange = (email: string, nota: string) => {
    const notaNum = parseFloat(nota);
    setAlunos(prev => prev.map(a =>
      a.email === email
        ? { ...a, nota: isNaN(notaNum) ? null : notaNum }
        : a
    ));
  };

  const handleObservacoesChange = (email: string, observacoes: string) => {
    setAlunos(prev => prev.map(a =>
      a.email === email
        ? { ...a, observacoes }
        : a
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Avaliação Presencial</h1>
          <p className="text-muted-foreground">
            Registre avaliações presenciais e atribua notas aos alunos
          </p>
        </div>
        <Button
          onClick={() => salvarNotasMutation.mutate()}
          disabled={!selectedTurma || !selectedEtapa || alunos.length === 0 || salvarNotasMutation.isPending}
          className="flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {salvarNotasMutation.isPending ? 'Salvando...' : 'Salvar Notas'}
        </Button>
      </div>

      {/* Seletor de Turma */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Selecionar Turma
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {loadingTurmas ? (
              <div className="col-span-full text-center py-4">
                Carregando turmas...
              </div>
            ) : (
              turmas?.map((turma) => (
                <Button
                  key={turma.codigo}
                  variant={selectedTurma === turma.codigo ? "default" : "outline"}
                  onClick={() => {
                    setSelectedTurma(turma.codigo);
                    setSelectedEtapa('');
                    setAlunos([]);
                  }}
                  className="h-auto py-3"
                >
                  {turma.nome}
                </Button>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Seletor de Etapa */}
      {selectedTurma && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Selecionar Etapa
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingEtapas ? (
              <div className="text-center py-4">Carregando etapas...</div>
            ) : !etapas || etapas.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                Nenhuma etapa configurada para esta turma
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {etapas.map((etapa) => (
                  <Button
                    key={etapa.id}
                    variant={selectedEtapa === etapa.id ? "default" : "outline"}
                    onClick={() => setSelectedEtapa(etapa.id)}
                    className="h-auto py-3"
                  >
                    <div className="text-left w-full">
                      <div className="font-semibold">{etapa.nome}</div>
                      <div className="text-xs opacity-70 mt-1">
                        Etapa {etapa.numero}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabela de Notas */}
      {selectedTurma && selectedEtapa && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Notas dos Alunos - {turmas?.find(t => t.codigo === selectedTurma)?.nome}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingAlunos ? (
              <div className="text-center py-8">Carregando alunos...</div>
            ) : alunos.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Nenhum aluno encontrado nesta turma
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Aluno</TableHead>
                      <TableHead className="text-center w-32">Nota (0-10)</TableHead>
                      <TableHead>Observações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alunos.map((aluno) => (
                      <TableRow key={aluno.email}>
                        <TableCell className="font-medium">
                          <div>
                            <div className="font-semibold">{aluno.nome}</div>
                            <div className="text-xs text-muted-foreground">
                              {aluno.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            min="0"
                            max="10"
                            step="0.1"
                            value={aluno.nota ?? ''}
                            onChange={(e) => handleNotaChange(aluno.email, e.target.value)}
                            placeholder="0.0"
                            className="w-24 text-center"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="text"
                            value={aluno.observacoes || ''}
                            onChange={(e) => handleObservacoesChange(aluno.email, e.target.value)}
                            placeholder="Observações (opcional)"
                            className="max-w-md"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
