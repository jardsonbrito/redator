import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Calendar } from 'lucide-react';
import { StudentHeader } from '@/components/StudentHeader';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import { useProfessorAuth } from '@/hooks/useProfessorAuth';
import { usePageTitle } from '@/hooks/useBreadcrumbs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RedacaoComentada {
  id: string;
  titulo: string;
  modo_correcao_id: string;
  turmas_autorizadas: string[];
  publicado_em: string | null;
  criado_em: string;
}

const MODO_LABELS: Record<string, string> = {
  enem: 'ENEM',
  pedagogico: 'Pedagógico',
  revisao_linguistica: 'Revisão Linguística',
};

const MODO_COLORS: Record<string, string> = {
  enem: 'bg-red-100 text-red-700 border-red-200',
  pedagogico: 'bg-blue-100 text-blue-700 border-blue-200',
  revisao_linguistica: 'bg-green-100 text-green-700 border-green-200',
};

const RedacoesComentadas = () => {
  usePageTitle('Redações Comentadas');
  const navigate = useNavigate();
  const { studentData } = useStudentAuth();
  const { professor } = useProfessorAuth();

  const [redacoes, setRedacoes] = useState<RedacaoComentada[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRedacoes = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('redacoes_comentadas')
          .select('id, titulo, modo_correcao_id, turmas_autorizadas, publicado_em, criado_em')
          .eq('ativo', true)
          .order('publicado_em', { ascending: false });

        if (error) throw error;

        // Filtrar por turma do usuário
        const turmaUsuario = professor
          ? professor.turma_nome?.trim().toUpperCase() ?? null
          : studentData.turma?.trim().toUpperCase() ?? null;

        const filtradas = (data || []).filter((r) => {
          const turmas = r.turmas_autorizadas.map((t: string) => t.trim().toUpperCase());
          if (professor) {
            return turmas.includes('PROFESSOR') || (turmaUsuario && turmas.includes(turmaUsuario));
          }
          return turmaUsuario ? turmas.includes(turmaUsuario) : false;
        });

        setRedacoes(filtradas);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRedacoes();
  }, [studentData.turma, professor]);

  const basePath = professor ? '/professor' : '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
      <StudentHeader pageTitle="Redações Comentadas" />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-primary mb-2">Redações Comentadas</h1>
            <p className="text-muted-foreground">
              Analise redações com comentários detalhados e anotações por trecho
            </p>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : redacoes.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma redação disponível</h3>
                <p className="text-muted-foreground">
                  Não há redações comentadas disponíveis para sua turma no momento.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {redacoes.map((r) => (
                <Card
                  key={r.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`${basePath}/redacoes-comentadas/${r.id}`)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h3 className="font-semibold leading-snug">{r.titulo}</h3>
                      <Badge
                        variant="outline"
                        className={`text-xs shrink-0 border ${MODO_COLORS[r.modo_correcao_id] || ''}`}
                      >
                        {MODO_LABELS[r.modo_correcao_id] || r.modo_correcao_id}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      {r.publicado_em
                        ? format(new Date(r.publicado_em), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
                        : 'Data não disponível'}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default RedacoesComentadas;
