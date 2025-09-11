import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, BookOpen, Users, Calendar, CheckSquare, Edit, Trash2 } from 'lucide-react';
import { useAulasDiario, useTurmasDisponiveis, useEtapas, useAulaDeleteMutation } from '@/hooks/useDiario';
import { FormAula } from '@/components/admin/diario/FormAula';
import { ControlePresenca } from '@/components/admin/diario/ControlePresenca';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { AulaDiario } from '@/types/diario';

export default function RegistroAulas() {
  const [selectedTurma, setSelectedTurma] = useState<string>('');
  const [showFormAula, setShowFormAula] = useState(false);
  const [editingAula, setEditingAula] = useState<AulaDiario | null>(null);
  const [showPresenca, setShowPresenca] = useState(false);
  const [aulaPresenca, setAulaPresenca] = useState<AulaDiario | null>(null);
  
  const { data: turmas, isLoading: loadingTurmas } = useTurmasDisponiveis();
  const { data: aulas, isLoading: loadingAulas } = useAulasDiario(selectedTurma);
  const { data: etapas } = useEtapas(selectedTurma);
  const deleteAulaMutation = useAulaDeleteMutation();

  const handleCreateAula = () => {
    setEditingAula(null);
    setShowFormAula(true);
  };

  const handleEditAula = (aula: AulaDiario) => {
    setEditingAula(aula);
    setShowFormAula(true);
  };

  const handleCloseFormAula = () => {
    setShowFormAula(false);
    setEditingAula(null);
  };

  const handleOpenPresenca = (aula: AulaDiario) => {
    setAulaPresenca(aula);
    setShowPresenca(true);
  };

  const handleClosePresenca = () => {
    setShowPresenca(false);
    setAulaPresenca(null);
  };

  const handleDeleteAula = async (aula: AulaDiario) => {
    if (window.confirm(`Tem certeza que deseja excluir a aula do dia ${formatDate(aula.data_aula)}?\n\nEsta ação não pode ser desfeita e irá remover todos os registros de presença relacionados.`)) {
      await deleteAulaMutation.mutateAsync(aula.id);
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
  };

  const getEtapaBadge = (aula: any) => {
    if (aula.etapas_estudo) {
      return (
        <Badge variant="secondary">
          {aula.etapas_estudo.nome}
        </Badge>
      );
    }
    return <Badge variant="outline">Sem etapa</Badge>;
  };

  if (showFormAula) {
    return (
      <FormAula
        turma={selectedTurma}
        aula={editingAula || undefined}
        onSave={() => handleCloseFormAula()}
        onCancel={handleCloseFormAula}
      />
    );
  }

  if (showPresenca && aulaPresenca) {
    return (
      <ControlePresenca
        aula={aulaPresenca}
        onClose={handleClosePresenca}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Registro de Aulas</h1>
          <p className="text-muted-foreground">
            Registre aulas ministradas e controle presença dos alunos
          </p>
        </div>
        <Button 
          onClick={handleCreateAula}
          disabled={!selectedTurma}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nova Aula
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
                  onClick={() => setSelectedTurma(turma.codigo)}
                  className="h-auto py-3"
                >
                  {turma.nome}
                </Button>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resumo das Etapas */}
      {selectedTurma && etapas && etapas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Etapas Configuradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {etapas.map((etapa) => {
                const hoje = new Date();
                const inicio = new Date(etapa.data_inicio);
                const fim = new Date(etapa.data_fim);
                const isAtiva = hoje >= inicio && hoje <= fim;
                
                return (
                  <div
                    key={etapa.id}
                    className={`p-3 rounded-lg border ${
                      isAtiva ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  >
                    <div className="font-medium">{etapa.nome}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(etapa.data_inicio)} - {formatDate(etapa.data_fim)}
                    </div>
                    {isAtiva && (
                      <Badge variant="default" className="mt-1 text-xs">
                        Em Andamento
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Aulas */}
      {selectedTurma && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Aulas Registradas - {turmas?.find(t => t.codigo === selectedTurma)?.nome || selectedTurma}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingAulas ? (
              <div className="text-center py-8">Carregando aulas...</div>
            ) : !aulas || aulas.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  Nenhuma aula registrada para esta turma
                </p>
                <Button onClick={handleCreateAula}>
                  <Plus className="w-4 h-4 mr-2" />
                  Registrar Primeira Aula
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {aulas.map((aula) => (
                  <Card key={aula.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-lg">
                              {formatDate(aula.data_aula)}
                            </h3>
                            {getEtapaBadge(aula)}
                          </div>
                          
                          <div className="space-y-1">
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {aula.conteudo_ministrado}
                            </p>
                            {aula.observacoes && (
                              <p className="text-sm text-muted-foreground">
                                <strong>Observações:</strong> {aula.observacoes}
                              </p>
                            )}
                          </div>
                          
                          <div className="text-xs text-muted-foreground">
                            Registrado em: {format(new Date(aula.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditAula(aula)}
                            className="flex items-center gap-1"
                          >
                            <Edit className="w-3 h-3" />
                            Editar
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleOpenPresenca(aula)}
                            className="flex items-center gap-1"
                          >
                            <CheckSquare className="w-3 h-3" />
                            Dados
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteAula(aula)}
                            className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={deleteAulaMutation.isPending}
                          >
                            <Trash2 className="w-3 h-3" />
                            Excluir
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}