import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Calendar, Users, Trash2 } from 'lucide-react';
import { useEtapas, useTurmasDisponiveis, useEtapaDeleteMutation } from '@/hooks/useDiario';
import { FormEtapa } from '@/components/admin/diario/FormEtapa';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatDateForDisplay, parseDateSafely } from '@/utils/dateUtils';
import type { EtapaEstudo } from '@/types/diario';

export default function GestaoEtapas() {
  const [selectedTurma, setSelectedTurma] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [editingEtapa, setEditingEtapa] = useState<EtapaEstudo | null>(null);
  
  const { data: turmas, isLoading: loadingTurmas } = useTurmasDisponiveis();
  const { data: etapas, isLoading: loadingEtapas } = useEtapas(selectedTurma);
  const deleteEtapaMutation = useEtapaDeleteMutation();

  const handleCreateEtapa = () => {
    setEditingEtapa(null);
    setShowForm(true);
  };

  const handleEditEtapa = (etapa: EtapaEstudo) => {
    setEditingEtapa(etapa);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingEtapa(null);
  };

  const handleDeleteEtapa = async (etapa: EtapaEstudo) => {
    if (window.confirm(`Tem certeza que deseja excluir a etapa "${etapa.nome}"?\n\nEsta ação não pode ser desfeita e irá remover todos os dados relacionados.`)) {
      await deleteEtapaMutation.mutateAsync(etapa.id);
    }
  };

  const getStatusBadge = (etapa: EtapaEstudo) => {
    const hoje = new Date();
    // Usar função utilitária para corrigir timezone das datas
    const inicio = parseDateSafely(etapa.data_inicio);
    const fim = parseDateSafely(etapa.data_fim);

    if (hoje < inicio) {
      return <Badge variant="secondary">Futura</Badge>;
    } else if (hoje > fim) {
      return <Badge variant="outline">Concluída</Badge>;
    } else {
      return <Badge variant="default">Em Andamento</Badge>;
    }
  };

  if (showForm) {
    return (
      <FormEtapa
        turma={selectedTurma}
        etapa={editingEtapa || undefined}
        onSave={() => handleCloseForm()}
        onCancel={handleCloseForm}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Etapas</h1>
          <p className="text-muted-foreground">
            Configure os períodos das etapas de estudo para cada turma
          </p>
        </div>
        <Button 
          onClick={handleCreateEtapa}
          disabled={!selectedTurma}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nova Etapa
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

      {/* Lista de Etapas */}
      {selectedTurma && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Etapas da {turmas?.find(t => t.codigo === selectedTurma)?.nome || selectedTurma}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingEtapas ? (
              <div className="text-center py-8">Carregando etapas...</div>
            ) : !etapas || etapas.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  Nenhuma etapa configurada para esta turma
                </p>
                <Button onClick={handleCreateEtapa}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeira Etapa
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {etapas.map((etapa) => (
                  <Card key={etapa.id} className="border-l-4 border-l-primary">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{etapa.nome}</CardTitle>
                        {getStatusBadge(etapa)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">Período</div>
                        <div className="text-sm font-medium">
                          {formatDateForDisplay(etapa.data_inicio)} até {formatDateForDisplay(etapa.data_fim)}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditEtapa(etapa)}
                          className="flex-1"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteEtapa(etapa)}
                          className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={deleteEtapaMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </Button>
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