import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { usePlanOverrides } from '@/hooks/usePlanOverrides';
import { ArrowLeft, User, Settings2, RotateCcw, Home } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ModernAdminHeader } from '@/components/admin/ModernAdminHeader';
import { useAdminBreadcrumbs, useAdminPageTitle, useAdminNavigationContext } from '@/hooks/useAdminNavigationContext';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';

interface Student {
  id: string;
  nome: string;
  email: string;
  turma: string;
  plano: 'Liderança' | 'Lapidação' | 'Largada' | 'Bolsista' | null;
}


const FUNCTIONALITY_LABELS = {
  'temas': 'Temas',
  'enviar_tema_livre': 'Enviar Tema Livre',
  'exercicios': 'Exercícios',
  'simulados': 'Simulados',
  'lousa': 'Lousa',
  'biblioteca': 'Biblioteca',
  'redacoes_exemplares': 'Redações Exemplares',
  'aulas_ao_vivo': 'Aulas ao Vivo',
  'videoteca': 'Videoteca',
  'aulas_gravadas': 'Aulas Gravadas',
  'diario_online': 'Diário Online',
  'gamificacao': 'Gamificação',
  'top_5': 'Top 5',
  'minhas_conquistas': 'Minhas Conquistas'
};

export const CustomizeStudentPlan = () => {
  const { studentId } = useParams();
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingStates, setSavingStates] = useState<Record<string, boolean>>({});

  // Usar o hook de plan overrides
  const {
    overrides,
    isFunctionalityEnabled,
    updateFunctionalityOverride,
    resetAllOverrides,
    hasCustomizations
  } = usePlanOverrides({
    studentId: studentId || '',
    plano: student?.plano || null
  });

  const { setBreadcrumbs } = useAdminNavigationContext();

  // Configurar breadcrumbs dinâmicos baseados no contexto do aluno
  useEffect(() => {
    if (student) {
      // Salvar turma em sessionStorage para manter estado ao voltar
      sessionStorage.setItem('last_selected_turma', student.turma);

      setBreadcrumbs([
        { label: 'Dashboard', href: '/admin' },
        { label: 'Configurações', href: '/admin?view=configuracoes' },
        { label: 'Assinatura', href: `/admin?view=configuracoes&subtab=subscriptions&turma=${encodeURIComponent(student.turma)}` },
        { label: 'Personalização' },
        { label: student.nome }
      ]);
    }
  }, [student, setBreadcrumbs]);

  useAdminPageTitle('Personalização do Aluno');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Buscar dados do aluno
  const loadStudentData = async () => {
    try {
      setLoading(true);

      if (!studentId) throw new Error('ID do aluno não fornecido');

      // Buscar dados do aluno com sua assinatura
      const { data: alunoData, error: alunoError } = await supabase
        .from('profiles')
        .select(`
          id, nome, email, turma,
          assinaturas!left(plano, data_validade)
        `)
        .eq('id', studentId)
        .eq('user_type', 'aluno')
        .single();

      if (alunoError) throw alunoError;

      if (!alunoData) {
        throw new Error('Aluno não encontrado');
      }

      // Processar dados do aluno para obter o plano ativo
      let plano = null;
      if (alunoData.assinaturas && alunoData.assinaturas.length > 0) {
        // Pegar a assinatura mais recente e ativa
        const activeSubscription = alunoData.assinaturas
          .filter((sub: any) => new Date(sub.data_validade) >= new Date())
          .sort((a: any, b: any) => new Date(b.data_validade).getTime() - new Date(a.data_validade).getTime())[0];

        plano = activeSubscription?.plano || null;
      }

      const processedStudent: Student = {
        id: alunoData.id,
        nome: alunoData.nome,
        email: alunoData.email,
        turma: alunoData.turma,
        plano
      };

      setStudent(processedStudent);

    } catch (error) {
      console.error('Erro ao carregar dados do aluno:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do aluno: " + (error as Error).message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (studentId) {
      loadStudentData();
    }
  }, [studentId]);

  const toggleFunctionality = async (functionality: string) => {
    if (!student?.plano) {
      toast({
        title: "Erro",
        description: "Aluno não possui plano ativo",
        variant: "destructive"
      });
      return;
    }

    const currentValue = isFunctionalityEnabled(functionality);
    const newValue = !currentValue;

    // Mostrar indicador de salvamento
    setSavingStates(prev => ({ ...prev, [functionality]: true }));

    try {
      // Usar o hook para atualizar
      const success = await updateFunctionalityOverride(functionality, newValue);

      if (success) {
        toast({
          title: "✅ Salvo Automaticamente",
          description: `${FUNCTIONALITY_LABELS[functionality]} foi ${newValue ? 'ativado' : 'desativado'} com sucesso!`,
        });
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
    } finally {
      // Remover indicador de salvamento após 500ms
      setTimeout(() => {
        setSavingStates(prev => ({ ...prev, [functionality]: false }));
      }, 500);
    }
  };

  const resetStudent = async () => {
    try {
      await resetAllOverrides();
    } catch (error) {
      console.error('Erro inesperado ao resetar:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <ModernAdminHeader userEmail={user?.email} onLogout={handleLogout} />
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Carregando dados do aluno...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <ModernAdminHeader userEmail={user?.email} onLogout={handleLogout} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-96">
            <Alert variant="destructive" className="max-w-md">
              <AlertDescription>
                Aluno não encontrado ou erro ao carregar dados.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Modern Header */}
      <ModernAdminHeader
        userEmail={user?.email}
        onLogout={handleLogout}
      />

      {/* Breadcrumb Navigation */}
      <BreadcrumbNavigation basePath="/admin" />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">

          <div className="bg-white/95 backdrop-blur-sm rounded-lg border border-gray-200/50 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Personalizar Plano do Aluno</h1>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-gray-600">
                    <User className="w-4 h-4" />
                    <span className="font-medium">{student.nome}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {student.email}
                  </Badge>
                  {student.plano ? (
                    <Badge variant="outline" className="text-xs">
                      {student.plano}
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs">
                      Sem Plano
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {student.turma}
                  </Badge>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <Settings2 className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>
        </div>

        {/* Controles de funcionalidade */}
        <Card className="bg-white/95 backdrop-blur-sm border-gray-200/50 shadow-sm">
          <CardHeader className="border-b border-gray-200/50">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Settings2 className="h-5 w-5 text-primary" />
                Controle de Funcionalidades
              </CardTitle>
              {hasCustomizations() && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={resetStudent}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Voltar ao Padrão
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {student.plano ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {Object.entries(FUNCTIONALITY_LABELS).map(([key, label]) => {
                    const isEnabled = isFunctionalityEnabled(key);
                    const isCustom = overrides[key] !== undefined;
                    const isSaving = savingStates[key];

                    return (
                      <button
                        key={key}
                        onClick={() => toggleFunctionality(key)}
                        disabled={isSaving}
                        className={`
                          relative p-3 text-sm rounded-lg transition-all text-center border-2
                          ${isEnabled
                            ? isCustom
                              ? 'bg-orange-100 text-orange-800 border-orange-300 shadow-sm'
                              : 'bg-green-100 text-green-800 border-green-300 shadow-sm'
                            : isCustom
                              ? 'bg-red-100 text-red-800 border-red-300 shadow-sm'
                              : 'bg-gray-100 text-gray-600 border-gray-300'
                          }
                          ${isSaving ? 'opacity-70 cursor-wait' : 'hover:scale-105 hover:shadow-md'}
                          font-medium disabled:hover:scale-100
                        `}
                        title={`${label} - ${isEnabled ? 'Ativo' : 'Bloqueado'}${isCustom ? ' (Customizado)' : ''}`}
                      >
                        {isSaving && (
                          <div className="absolute top-1 right-1">
                            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        )}
                        {label}
                        {isCustom && !isSaving && (
                          <div className="w-2 h-2 bg-orange-500 rounded-full mx-auto mt-2"></div>
                        )}
                        {isSaving && (
                          <div className="text-xs mt-1 opacity-70">Salvando...</div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {hasCustomizations() && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <p className="text-sm text-orange-800">
                      <strong>Customizações ativas:</strong> Este aluno possui configurações personalizadas que sobrescrevem o padrão do plano {student.plano}.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-12">
                <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p>Aluno sem plano ativo. Configure uma assinatura primeiro.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};