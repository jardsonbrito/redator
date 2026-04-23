import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFuncionalidades } from '@/hooks/usePlansAdmin';
import { ArrowLeft, Users, Settings2, RotateCcw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Student {
  id: string;
  nome: string;
  email: string;
  plano: string | null;
}

export const CustomizePlanSimple = () => {
  const { turmaId } = useParams();
  const { toast } = useToast();
  const [turmaData, setTurmaData] = useState<{ turma: string; alunos: Student[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [overrides, setOverrides] = useState<Record<string, Record<string, boolean>>>({});

  const { data: funcionalidades = [] } = useFuncionalidades();

  // Features base de todos os planos ativos (fonte: banco)
  const { data: allPlanFeatures } = useQuery({
    queryKey: ['all-active-plan-features'],
    queryFn: async (): Promise<Record<string, Record<string, boolean>>> => {
      const { data, error } = await supabase
        .from('plano_funcionalidades')
        .select('habilitado, planos!inner(nome, ativo), funcionalidades!inner(chave)');
      if (error) return {};
      const result: Record<string, Record<string, boolean>> = {};
      (data ?? []).forEach((row: any) => {
        if (!row.planos?.ativo) return;
        const planName = row.planos.nome as string;
        const chave = row.funcionalidades?.chave as string;
        if (!planName || !chave) return;
        if (!result[planName]) result[planName] = {};
        result[planName][chave] = row.habilitado;
      });
      return result;
    },
    staleTime: 5 * 60 * 1000,
  });

  const loadTurmaData = async () => {
    try {
      setLoading(true);

      if (!turmaId) throw new Error('ID da turma não fornecido');

      const { data: turma, error: turmaError } = await supabase
        .from('turmas')
        .select('nome')
        .eq('id', turmaId)
        .single();

      if (turmaError) throw turmaError;

      const { data: alunos, error: alunosError } = await supabase
        .from('profiles')
        .select(`
          id, nome, email,
          assinaturas!left(plano, data_validade)
        `)
        .eq('user_type', 'aluno')
        .eq('turma', turma.nome)
        .order('nome');

      if (alunosError) throw alunosError;

      const processedAlunos: Student[] = (alunos || []).map((aluno: any) => {
        let plano = null;
        if (aluno.assinaturas && aluno.assinaturas.length > 0) {
          const activeSubscription = aluno.assinaturas
            .filter((sub: any) => new Date(sub.data_validade) >= new Date())
            .sort((a: any, b: any) => new Date(b.data_validade).getTime() - new Date(a.data_validade).getTime())[0];
          plano = activeSubscription?.plano || null;
        }
        return { id: aluno.id, nome: aluno.nome, email: aluno.email, plano };
      });

      setTurmaData({ turma: turma.nome, alunos: processedAlunos });

      if (processedAlunos.length > 0) {
        const studentIds = processedAlunos.map(a => a.id);
        const { data: existingOverrides, error: overridesError } = await supabase
          .from('plan_overrides')
          .select('*')
          .in('student_id', studentIds);

        if (!overridesError && existingOverrides) {
          const organized: Record<string, Record<string, boolean>> = {};
          existingOverrides.forEach((override: any) => {
            if (!organized[override.student_id]) organized[override.student_id] = {};
            organized[override.student_id][override.functionality] = override.enabled;
          });
          setOverrides(organized);
        }
      }
    } catch (error) {
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
    if (turmaId) loadTurmaData();
  }, [turmaId]);

  const toggleFunctionality = async (studentId: string, functionality: string) => {
    const student = turmaData?.alunos.find(a => a.id === studentId);
    if (!student?.plano) {
      toast({ title: "Erro", description: "Aluno não possui plano ativo", variant: "destructive" });
      return;
    }

    const defaultValue = allPlanFeatures?.[student.plano]?.[functionality] ?? false;
    const currentValue = overrides[studentId]?.[functionality] ?? defaultValue;
    const newValue = !currentValue;

    setOverrides(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], [functionality]: newValue }
    }));

    const { error } = await supabase
      .from('plan_overrides')
      .upsert({ student_id: studentId, functionality, enabled: newValue });

    if (error) {
      toast({ title: "Aviso", description: "Mudança aplicada localmente.", variant: "default" });
    }
  };

  const getFunctionalityStatus = (student: Student, functionality: string) => {
    if (!student.plano) return false;
    const defaultValue = allPlanFeatures?.[student.plano]?.[functionality] ?? false;
    return overrides[student.id]?.[functionality] ?? defaultValue;
  };

  const hasCustomizations = (studentId: string) =>
    !!overrides[studentId] && Object.keys(overrides[studentId]).length > 0;

  const resetStudent = async (studentId: string) => {
    setOverrides(prev => {
      const next = { ...prev };
      delete next[studentId];
      return next;
    });

    const { error } = await supabase
      .from('plan_overrides')
      .delete()
      .eq('student_id', studentId);

    if (!error) {
      toast({ title: "Resetado", description: "Aluno voltou ao padrão do plano" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando dados da turma...</p>
        </div>
      </div>
    );
  }

  if (!turmaData) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Alert variant="destructive">
          <AlertDescription>Turma não encontrada ou erro ao carregar dados.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/admin" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary">
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Admin
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Personalizar Plano</h1>
            <div className="flex items-center gap-2 mt-1">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Turma: {turmaData.turma}</span>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Controle de Funcionalidades por Aluno
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {turmaData.alunos.map((student) => (
              <div key={student.id} className="border rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{student.nome}</h3>
                      {student.plano ? (
                        <Badge variant="outline" className="text-xs">{student.plano}</Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">Sem Plano</Badge>
                      )}
                      {hasCustomizations(student.id) && (
                        <Badge className="text-xs bg-orange-100 text-orange-800">Customizado</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{student.email}</p>
                  </div>
                  {hasCustomizations(student.id) && (
                    <Button size="sm" variant="outline" onClick={() => resetStudent(student.id)}>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Voltar ao Padrão
                    </Button>
                  )}
                </div>

                {student.plano ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                    {funcionalidades.map((f) => {
                      const isEnabled = getFunctionalityStatus(student, f.chave);
                      const isCustom = overrides[student.id]?.[f.chave] !== undefined;
                      return (
                        <button
                          key={f.chave}
                          onClick={() => toggleFunctionality(student.id, f.chave)}
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
                          title={`${f.nome_exibicao} - ${isEnabled ? 'Ativo' : 'Bloqueado'}${isCustom ? ' (Customizado)' : ''}`}
                        >
                          {f.nome_exibicao}
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
                <p>Nenhum aluno encontrado nesta turma.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
