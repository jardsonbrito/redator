import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Presentation } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import { StudentHeader } from '@/components/StudentHeader';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { TooltipProvider } from '@/components/ui/tooltip';
import { usePageTitle } from '@/hooks/useBreadcrumbs';
import { LousaCardPadrao } from '@/components/shared/LousaCardPadrao';

interface Lousa {
  id: string;
  titulo: string;
  enunciado: string;
  inicio_em: string | null;
  fim_em: string | null;
  turmas: string[];
  permite_visitante: boolean;
  capa_url: string | null;
  resposta?: {
    status: string;
    nota: number | null;
    comentario_professor: string | null;
    submitted_at: string | null;
  } | null;
}

export default function AlunoLousaList() {
  // Configurar título da página
  usePageTitle('Lousa Interativa');
  
  const [lousas, setLousas] = useState<Lousa[]>([]);
  const [loading, setLoading] = useState(true);
  const { studentData: student } = useStudentAuth();
  const navigate = useNavigate();

  const fetchLousas = async () => {
    if (!student) return;

    try {
      // Buscar lousas ativas
      const { data: lousasAtivas, error: lousasError } = await supabase
        .from('lousa')
        .select('*')
        .eq('ativo', true)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (lousasError) throw lousasError;

      // Buscar lousas onde o aluno já tem resposta (podem estar inativas)
      const { data: respostasAluno } = await supabase
        .from('lousa_resposta')
        .select('lousa_id')
        .eq('email_aluno', student.email || '');

      const lousaIdsAtivas = new Set((lousasAtivas || []).map(l => l.id));
      const idsFaltando = [...new Set((respostasAluno || []).map(r => r.lousa_id))]
        .filter(id => !lousaIdsAtivas.has(id));

      let todasLousas = [...(lousasAtivas || [])];

      // Buscar lousas inativas que o aluno respondeu
      if (idsFaltando.length > 0) {
        const { data: lousasInativas } = await supabase
          .from('lousa')
          .select('*')
          .in('id', idsFaltando);
        todasLousas = [...todasLousas, ...(lousasInativas || [])];
      }

      const lousasComResposta = await Promise.all(
        todasLousas.map(async (lousa) => {
          // Verificar se o aluno tem acesso à lousa
          // Apenas alunos da turma específica podem ver (sem visitantes)
          const turmaSemPrefixo = student.turma?.replace('Turma ', '');
          const temAcesso = student.userType === 'visitante' ? lousa.permite_visitante : 
            (turmaSemPrefixo && lousa.turmas.includes(turmaSemPrefixo));

          if (!temAcesso) return null;

          // Buscar resposta do aluno se existir
          const { data: respostaData } = await supabase
            .from('lousa_resposta')
            .select('status, nota, comentario_professor, submitted_at')
            .eq('lousa_id', lousa.id)
            .eq('email_aluno', student.email || '')
            .maybeSingle();

          return {
            ...lousa,
            resposta: respostaData
          };
        })
      );

      setLousas(lousasComResposta.filter(Boolean) as Lousa[]);
    } catch (error) {
      console.error('Erro ao carregar lousas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLousas();
  }, [student]);

  const handleLousaClick = (lousa: Lousa) => {
    navigate(`/lousa/${lousa.id}`);
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <TooltipProvider>
          <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
            <StudentHeader pageTitle="Lousa" />
            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            </main>
          </div>
        </TooltipProvider>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <TooltipProvider>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
          <StudentHeader pageTitle="Lousa" />
          <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-redator-primary mb-2">
                Lousa Disponível
              </h2>
            </div>

            {lousas.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Presentation className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Nenhuma lousa disponível</h3>
                  <p className="text-muted-foreground">
                    Não há lousas disponíveis para sua turma no momento.
                    {!student?.turma && ' Faça login com uma turma para ver mais conteúdos.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {lousas.map((lousa) => (
                  <LousaCardPadrao
                    key={lousa.id}
                    lousa={{
                      ...lousa,
                      ativo: lousa.ativo !== false,
                      resposta: lousa.resposta
                    }}
                    perfil="aluno"
                    actions={{
                      onResponder: () => handleLousaClick(lousa)
                    }}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      </TooltipProvider>
    </ProtectedRoute>
  );
}