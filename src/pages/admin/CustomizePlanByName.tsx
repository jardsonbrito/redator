import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Users, Settings2, RotateCcw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ModernAdminHeader } from '@/components/admin/ModernAdminHeader';

interface Student {
  id: string;
  nome: string;
  email: string;
  plano: 'Liderança' | 'Lapidação' | 'Largada' | 'Bolsista' | null;
}

// Definir funcionalidades padrão por plano
const DEFAULT_PLAN_FEATURES = {
  'Largada': {
    'temas': true,
    'enviar_tema_livre': false,
    'exercicios': false,
    'simulados': false,
    'lousa': false,
    'biblioteca': false,
    'redacoes_exemplares': false,
    'aulas_ao_vivo': false,
    'videoteca': true,
    'aulas_gravadas': true,
    'diario_online': true,
    'gamificacao': true,
    'top_5': true,
    'minhas_conquistas': true
  },
  'Lapidação': {
    'temas': true,
    'enviar_tema_livre': true,
    'exercicios': true,
    'simulados': true,
    'lousa': true,
    'biblioteca': true,
    'redacoes_exemplares': true,
    'aulas_ao_vivo': false,
    'videoteca': true,
    'aulas_gravadas': true,
    'diario_online': true,
    'gamificacao': true,
    'top_5': true,
    'minhas_conquistas': true
  },
  'Liderança': {
    'temas': true,
    'enviar_tema_livre': true,
    'exercicios': true,
    'simulados': true,
    'lousa': true,
    'biblioteca': true,
    'redacoes_exemplares': true,
    'aulas_ao_vivo': true,
    'videoteca': true,
    'aulas_gravadas': true,
    'diario_online': true,
    'gamificacao': true,
    'top_5': true,
    'minhas_conquistas': true
  },
  'Bolsista': {
    'temas': true,
    'enviar_tema_livre': true,
    'exercicios': true,
    'simulados': true,
    'lousa': true,
    'biblioteca': true,
    'redacoes_exemplares': true,
    'aulas_ao_vivo': false,
    'videoteca': true,
    'aulas_gravadas': true,
    'diario_online': true,
    'gamificacao': true,
    'top_5': true,
    'minhas_conquistas': true
  }
};

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

export const CustomizePlanByName = () => {
  const { turmaNome } = useParams();
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [turmaData, setTurmaData] = useState<{ turma: string; alunos: Student[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [overrides, setOverrides] = useState<Record<string, Record<string, boolean>>>({});

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Verificar se a tabela plan_overrides existe
  const checkPlanOverridesTable = async () => {
    try {
      await supabase.from('plan_overrides').select('count', { count: 'exact' }).limit(1);
      return true;
    } catch (error) {
      console.warn('Tabela plan_overrides não existe ainda:', error);
      return false;
    }
  };

  // Buscar dados da turma e seus alunos
  const loadTurmaData = async () => {
    try {
      setLoading(true);

      if (!turmaNome) throw new Error('Nome da turma não fornecido');

      const decodedTurmaNome = decodeURIComponent(turmaNome);
      console.log('Carregando turma:', decodedTurmaNome);

      // Buscar alunos da turma com suas assinaturas
      const { data: alunos, error: alunosError } = await supabase
        .from('profiles')
        .select(`
          id, nome, email,
          assinaturas!left(plano, data_validade)
        `)
        .eq('user_type', 'aluno')
        .eq('turma', decodedTurmaNome)
        .order('nome');

      if (alunosError) throw alunosError;

      console.log('Alunos encontrados:', alunos?.length || 0);

      // Processar dados dos alunos para obter o plano ativo
      const processedAlunos: Student[] = (alunos || []).map((aluno: any) => {
        let plano = null;
        if (aluno.assinaturas && aluno.assinaturas.length > 0) {
          // Pegar a assinatura mais recente e ativa
          const activeSubscription = aluno.assinaturas
            .filter((sub: any) => new Date(sub.data_validade) >= new Date())
            .sort((a: any, b: any) => new Date(b.data_validade).getTime() - new Date(a.data_validade).getTime())[0];

          plano = activeSubscription?.plano || null;
        }

        return {
          id: aluno.id,
          nome: aluno.nome,
          email: aluno.email,
          plano
        };
      });

      setTurmaData({
        turma: decodedTurmaNome,
        alunos: processedAlunos
      });

      // Tentar buscar overrides se a tabela existir
      const tableExists = await checkPlanOverridesTable();
      if (tableExists && processedAlunos.length > 0) {
        const studentIds = processedAlunos.map(a => a.id);
        const { data: existingOverrides, error: overridesError } = await supabase
          .from('plan_overrides')
          .select('*')
          .in('student_id', studentIds);

        if (!overridesError && existingOverrides) {
          const organized: Record<string, Record<string, boolean>> = {};
          existingOverrides.forEach((override: any) => {
            if (!organized[override.student_id]) {
              organized[override.student_id] = {};
            }
            organized[override.student_id][override.functionality] = override.enabled;
          });
          setOverrides(organized);
        }
      }

    } catch (error) {
      console.error('Erro ao carregar dados da turma:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados da turma: " + (error as Error).message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (turmaNome) {
      loadTurmaData();
    }
  }, [turmaNome]);

  const toggleFunctionality = async (studentId: string, functionality: string) => {
    const student = turmaData?.alunos.find(a => a.id === studentId);
    if (!student?.plano) {
      toast({
        title: "Erro",
        description: "Aluno não possui plano ativo",
        variant: "destructive"
      });
      return;
    }

    const defaultValue = DEFAULT_PLAN_FEATURES[student.plano][functionality];
    const currentValue = overrides[studentId]?.[functionality] ?? defaultValue;
    const newValue = !currentValue;

    // Atualizar estado local imediatamente
    setOverrides(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [functionality]: newValue
      }
    }));

    // Tentar salvar no banco (se a tabela existir)
    try {
      const tableExists = await checkPlanOverridesTable();
      if (tableExists) {
        const { error } = await supabase
          .from('plan_overrides')
          .upsert({
            student_id: studentId,
            functionality,
            enabled: newValue
          });

        if (error) {
          console.error('Erro ao salvar override:', error);
          toast({
            title: "Aviso",
            description: "Mudança aplicada localmente. Para persistir, inicialize o banco de dados.",
            variant: "default"
          });
        } else {
          toast({
            title: "Salvo",
            description: "Personalização salva com sucesso!",
          });
        }
      } else {
        toast({
          title: "Aviso",
          description: "Tabela de personalização não existe. Mudança aplicada apenas localmente.",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Erro ao verificar/salvar:', error);
      toast({
        title: "Aviso",
        description: "Mudança aplicada localmente",
        variant: "default"
      });
    }
  };

  const getFunctionalityStatus = (student: Student, functionality: string) => {
    if (!student.plano) return false;

    const defaultValue = DEFAULT_PLAN_FEATURES[student.plano][functionality];
    return overrides[student.id]?.[functionality] ?? defaultValue;
  };

  const hasCustomizations = (studentId: string) => {
    return overrides[studentId] && Object.keys(overrides[studentId]).length > 0;
  };

  const resetStudent = (studentId: string) => {
    // Limpar overrides locais
    setOverrides(prev => {
      const newState = { ...prev };
      delete newState[studentId];
      return newState;
    });

    // Tentar deletar do banco (se a tabela existir)
    checkPlanOverridesTable().then(exists => {
      if (exists) {
        supabase
          .from('plan_overrides')
          .delete()
          .eq('student_id', studentId)
          .then(({ error }) => {
            if (error) {
              console.error('Erro ao resetar no banco:', error);
            } else {
              toast({
                title: "Resetado",
                description: "Aluno voltou ao padrão do plano",
              });
            }
          });
      } else {
        toast({
          title: "Resetado",
          description: "Aluno voltou ao padrão do plano (local)",
        });
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <ModernAdminHeader userEmail={user?.email} onLogout={handleLogout} />
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Carregando dados da turma...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!turmaData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <ModernAdminHeader userEmail={user?.email} onLogout={handleLogout} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-96">
            <Alert variant="destructive" className="max-w-md">
              <AlertDescription>
                Turma "{turmaNome}" não encontrada ou sem alunos.
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cabeçalho da página */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin')}
              className="text-gray-500 hover:text-primary"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Admin
            </Button>
          </div>

          <div className="bg-white/95 backdrop-blur-sm rounded-lg border border-gray-200/50 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Personalizar Plano</h1>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Users className="w-4 h-4" />
                    <span className="font-medium">Turma: {turmaData.turma}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {turmaData.alunos.length} aluno(s)
                  </Badge>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <Settings2 className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabela de alunos */}
        <Card className="bg-white/95 backdrop-blur-sm border-gray-200/50 shadow-sm">
          <CardHeader className="border-b border-gray-200/50">
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Settings2 className="h-5 w-5 text-primary" />
              Controle de Funcionalidades por Aluno
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
          <div className="space-y-6">
            {turmaData.alunos.map((student) => (
              <div key={student.id} className="bg-gray-50/50 border border-gray-200/50 rounded-lg p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{student.nome}</h3>
                      {student.plano ? (
                        <Badge variant="outline" className="text-xs">
                          {student.plano}
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">
                          Sem Plano
                        </Badge>
                      )}
                      {hasCustomizations(student.id) && (
                        <Badge className="text-xs bg-orange-100 text-orange-800">
                          Customizado
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{student.email}</p>
                  </div>
                  {hasCustomizations(student.id) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resetStudent(student.id)}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Voltar ao Padrão
                    </Button>
                  )}
                </div>

                {student.plano ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                    {Object.entries(FUNCTIONALITY_LABELS).map(([key, label]) => {
                      const isEnabled = getFunctionalityStatus(student, key);
                      const isCustom = overrides[student.id]?.[key] !== undefined;

                      return (
                        <button
                          key={key}
                          onClick={() => toggleFunctionality(student.id, key)}
                          className={`
                            p-2 text-xs rounded-md transition-all text-center border-2
                            ${isEnabled
                              ? isCustom
                                ? 'bg-orange-100 text-orange-800 border-orange-300'
                                : 'bg-green-100 text-green-800 border-green-300'
                              : isCustom
                                ? 'bg-red-100 text-red-800 border-red-300'
                                : 'bg-gray-100 text-gray-600 border-gray-300'
                            }
                            hover:scale-105 hover:shadow-sm
                          `}
                          title={`${label} - ${isEnabled ? 'Ativo' : 'Bloqueado'}${isCustom ? ' (Customizado)' : ''}`}
                        >
                          {label}
                          {isCustom && (
                            <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mx-auto mt-1"></div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground">
                    Aluno sem plano ativo. Configure uma assinatura primeiro.
                  </div>
                )}
              </div>
            ))}

            {turmaData.alunos.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p>Nenhum aluno encontrado na turma "{turmaData.turma}".</p>
              </div>
            )}
          </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};