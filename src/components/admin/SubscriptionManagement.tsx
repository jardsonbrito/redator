import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Crown, CheckCircle, AlertTriangle, Edit2, Save, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SubscriptionData {
  id: string;
  plano: 'Liderança' | 'Lapidação' | 'Largada';
  data_inscricao: string;
  data_validade: string;
  status: 'Ativo' | 'Vencido';
  aluno_id: string;
  aluno_nome: string;
  aluno_email: string;
}

interface SubscriptionHistory {
  id: string;
  aluno_id: string;
  alteracao: string;
  data_alteracao: string;
  admin_responsavel: string;
}

export const SubscriptionManagement = () => {
  console.log('🚀 SubscriptionManagement component mounted');
  const [selectedAluno, setSelectedAluno] = useState<string>('');
  const [editingSubscription, setEditingSubscription] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    plano: '',
    data_inscricao: '',
    data_validade: ''
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar alunos disponíveis
  const { data: alunos = [], isLoading: isLoadingAlunos, error: alunosError } = useQuery({
    queryKey: ['admin-subscription-alunos'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, nome, email, turma')
          .eq('user_type', 'aluno')
          .order('nome');

        if (error) {
          console.error('Erro ao buscar alunos:', error);
          throw error;
        }
        return data || [];
      } catch (error) {
        console.error('Erro na query de alunos:', error);
        return [];
      }
    },
    retry: 3,
    retryDelay: 1000
  });

  // Buscar assinaturas
  const { data: assinaturas = [], isLoading, error: assinaturasError } = useQuery({
    queryKey: ['admin-subscriptions', selectedAluno],
    queryFn: async () => {
      try {
        let query = supabase
          .from('assinaturas')
          .select(`
            *,
            profiles!inner(
              id, nome, email, turma
            )
          `)
          .order('data_validade', { ascending: false });

        if (selectedAluno) {
          query = query.eq('aluno_id', selectedAluno);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Erro ao buscar assinaturas:', error);
          // Se a tabela não existir, retornar array vazio ao invés de falhar
          if (error.code === '42P01') {
            console.warn('Tabela assinaturas não encontrada. Retornando array vazio.');
            return [];
          }
          throw error;
        }

        return (data || []).map((sub: any) => ({
          id: sub.id,
          plano: sub.plano,
          data_inscricao: sub.data_inscricao,
          data_validade: sub.data_validade,
          status: new Date(sub.data_validade) >= new Date() ? 'Ativo' : 'Vencido',
          aluno_id: sub.aluno_id,
          aluno_nome: sub.profiles.nome,
          aluno_email: sub.profiles.email
        })) as SubscriptionData[];
      } catch (error) {
        console.error('Erro na query de assinaturas:', error);
        return [];
      }
    },
    retry: 3,
    retryDelay: 1000
  });

  // Buscar histórico de alterações
  const { data: historico = [] } = useQuery({
    queryKey: ['admin-subscription-history', selectedAluno],
    queryFn: async () => {
      let query = supabase
        .from('subscription_history')
        .select('*')
        .order('data_alteracao', { ascending: false })
        .limit(50);

      if (selectedAluno) {
        query = query.eq('aluno_id', selectedAluno);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    }
  });

  // Criar nova assinatura
  const createSubscriptionMutation = useMutation({
    mutationFn: async ({ alunoId, plano }: { alunoId: string, plano: string }) => {
      const dataInscricao = '2025-02-03'; // Data padrão conforme especificação
      const { error } = await supabase
        .from('assinaturas')
        .insert({
          aluno_id: alunoId,
          plano,
          data_inscricao: dataInscricao,
          data_validade: dataInscricao // Inicialmente igual à data de inscrição, admin deve definir
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      toast({
        title: "Assinatura criada",
        description: "Nova assinatura criada com sucesso. Defina a data de validade.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar assinatura",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Atualizar assinatura
  const updateSubscriptionMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: any }) => {
      const { error } = await supabase
        .from('assinaturas')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      // Registrar no histórico
      const { data: adminData } = await supabase.auth.getUser();
      if (adminData.user) {
        await supabase
          .from('subscription_history')
          .insert({
            aluno_id: updates.aluno_id || id,
            alteracao: `Plano alterado para ${updates.plano || 'N/A'}, Data de validade: ${updates.data_validade || 'N/A'}`,
            admin_responsavel: adminData.user.email || 'Sistema'
          });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-subscription-history'] });
      setEditingSubscription(null);
      toast({
        title: "Assinatura atualizada",
        description: "Assinatura atualizada com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar assinatura",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const handleStartEdit = (subscription: SubscriptionData) => {
    setEditingSubscription(subscription.id);
    setEditForm({
      plano: subscription.plano,
      data_inscricao: subscription.data_inscricao,
      data_validade: subscription.data_validade
    });
  };

  const handleSaveEdit = (subscription: SubscriptionData) => {
    updateSubscriptionMutation.mutate({
      id: subscription.id,
      updates: {
        ...editForm,
        aluno_id: subscription.aluno_id
      }
    });
  };

  const handleCancelEdit = () => {
    setEditingSubscription(null);
    setEditForm({
      plano: '',
      data_inscricao: '',
      data_validade: ''
    });
  };

  const getStatusBadge = (status: string) => {
    if (status === 'Ativo') {
      return <Badge className="bg-green-100 text-green-800">Ativo</Badge>;
    }
    return <Badge variant="destructive">Vencido</Badge>;
  };

  const getPlanoBadge = (plano: string) => {
    const colors = {
      'Liderança': 'bg-purple-100 text-purple-800',
      'Lapidação': 'bg-blue-100 text-blue-800',
      'Largada': 'bg-orange-100 text-orange-800'
    };

    return <Badge className={colors[plano as keyof typeof colors]}>{plano}</Badge>;
  };

  // Verificar se há erros críticos
  if (alunosError || assinaturasError) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Sistema de Assinaturas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Erro ao carregar dados:</strong><br/>
                {alunosError && `Alunos: ${alunosError.message}`}<br/>
                {assinaturasError && `Assinaturas: ${assinaturasError.message}`}
              </AlertDescription>
            </Alert>

            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                ℹ️ Informação
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Se esta é a primeira vez acessando o sistema de assinaturas, as tabelas podem ainda não ter sido criadas.
                Verifique se a migração do banco de dados foi executada corretamente.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros e Ações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Gerenciar Assinaturas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-64">
              <Label htmlFor="aluno-select">Filtrar por Aluno</Label>
              <Select value={selectedAluno} onValueChange={setSelectedAluno}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os alunos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os alunos</SelectItem>
                  {alunos.map((aluno) => (
                    <SelectItem key={aluno.id} value={aluno.id}>
                      {aluno.nome} ({aluno.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedAluno && (
              <div className="flex gap-2">
                {/* Botões para criar nova assinatura para o aluno selecionado */}
                {['Liderança', 'Lapidação', 'Largada'].map((plano) => (
                  <Button
                    key={plano}
                    size="sm"
                    onClick={() => createSubscriptionMutation.mutate({
                      alunoId: selectedAluno,
                      plano
                    })}
                    disabled={createSubscriptionMutation.isPending}
                  >
                    Criar {plano}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lista de Assinaturas */}
      <Card>
        <CardHeader>
          <CardTitle>
            Assinaturas Ativas ({assinaturas.filter(a => a.status === 'Ativo').length}/{assinaturas.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Carregando assinaturas...</p>
              <p className="text-xs text-muted-foreground mt-1">
                {isLoadingAlunos ? 'Buscando alunos...' : `${alunos.length} alunos carregados`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {assinaturas.map((subscription) => (
                <div
                  key={subscription.id}
                  className="p-4 border rounded-lg"
                >
                  {editingSubscription === subscription.id ? (
                    // Modo de edição
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{subscription.aluno_nome}</h3>
                          <p className="text-sm text-muted-foreground">{subscription.aluno_email}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSaveEdit(subscription)}
                            disabled={updateSubscriptionMutation.isPending}
                          >
                            <Save className="w-4 h-4 mr-1" />
                            Salvar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEdit}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Cancelar
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor={`plano-${subscription.id}`}>Plano</Label>
                          <Select value={editForm.plano} onValueChange={(value) => setEditForm(prev => ({ ...prev, plano: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Liderança">Liderança</SelectItem>
                              <SelectItem value="Lapidação">Lapidação</SelectItem>
                              <SelectItem value="Largada">Largada</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor={`inscricao-${subscription.id}`}>Data de Inscrição</Label>
                          <Input
                            type="date"
                            value={editForm.data_inscricao}
                            onChange={(e) => setEditForm(prev => ({ ...prev, data_inscricao: e.target.value }))}
                          />
                        </div>

                        <div>
                          <Label htmlFor={`validade-${subscription.id}`}>Data de Validade</Label>
                          <Input
                            type="date"
                            value={editForm.data_validade}
                            onChange={(e) => setEditForm(prev => ({ ...prev, data_validade: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Modo de visualização
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">{subscription.aluno_nome}</h3>
                          {getPlanoBadge(subscription.plano)}
                          {getStatusBadge(subscription.status)}
                        </div>

                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>📧 {subscription.aluno_email}</span>
                          <span>📅 Inscrição: {formatDate(subscription.data_inscricao)}</span>
                          <span>⏰ Validade: {formatDate(subscription.data_validade)}</span>
                        </div>

                        {subscription.status === 'Ativo' && new Date(subscription.data_validade).getTime() - new Date().getTime() <= 7 * 24 * 60 * 60 * 1000 && (
                          <div className="mt-2">
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">
                              ⚠️ Expira em breve
                            </Badge>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStartEdit(subscription)}
                        >
                          <Edit2 className="w-4 h-4 mr-1" />
                          Editar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {assinaturas.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Crown className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>Nenhuma assinatura encontrada.</p>
                  {selectedAluno && (
                    <p className="text-sm mt-2">Selecione um plano acima para criar a primeira assinatura.</p>
                  )}
                  {!selectedAluno && (
                    <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-2" />
                      <p className="text-sm text-green-800 dark:text-green-200">
                        ✅ Sistema funcionando! {alunos.length} alunos disponíveis.
                        <br />
                        Selecione um aluno para começar a gerenciar assinaturas.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico de Alterações */}
      {historico.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Histórico de Alterações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {historico.slice(0, 10).map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm">{entry.alteracao}</p>
                    <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                      <span>📅 {formatDate(entry.data_alteracao)}</span>
                      <span>👤 {entry.admin_responsavel}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};