import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, ExternalLink } from 'lucide-react';
import { StudentHeader } from '@/components/StudentHeader';
import { Skeleton } from '@/components/ui/skeleton';
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
  enem: 'bg-red-100 text-red-700',
  pedagogico: 'bg-blue-100 text-blue-700',
  revisao_linguistica: 'bg-green-100 text-green-700',
};

// Imagem de capa por modo de correção
const MODO_COVER: Record<string, string> = {
  enem: '/placeholders/aula-cover.png',
  pedagogico: '/placeholders/aula-cover.png',
  revisao_linguistica: '/placeholders/aula-cover.png',
};

const RedacoesComentadas = () => {
  usePageTitle('Redações Comentadas');
  const navigate = useNavigate();
  const { studentData } = useStudentAuth();
  const { professor, loading: professorLoading } = useProfessorAuth();

  const [redacoes, setRedacoes] = useState<RedacaoComentada[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (professorLoading) return;
    const fetchRedacoes = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('redacoes_comentadas')
          .select('id, titulo, modo_correcao_id, turmas_autorizadas, publicado_em, criado_em')
          .eq('ativo', true)
          .order('publicado_em', { ascending: false });

        if (error) throw error;

        const turmaUsuario = professor
          ? professor.turma_nome?.trim().toUpperCase() ?? null
          : studentData.turma?.trim().toUpperCase() ?? null;

        const filtradas = (data || []).filter((r) => {
          const turmas = r.turmas_autorizadas.map((t: string) => t.trim().toUpperCase());
          if (professor) {
            // Professor vê conteúdo marcado como PROFESSOR ou da sua turma (se tiver)
            if (turmas.includes('PROFESSOR')) return true;
            if (turmaUsuario && turmas.includes(turmaUsuario)) return true;
            return false;
          }
          return turmaUsuario ? turmas.includes(turmaUsuario) : false;
        });

        setRedacoes(filtradas);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRedacoes();
  }, [studentData.turma, professor, professorLoading]);

  const basePath = professor ? '/professor' : '';

  const handleVer = (id: string) => {
    navigate(`${basePath}/redacoes-comentadas/${id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
        <StudentHeader pageTitle="Redações Comentadas" />
        <main className="mx-auto max-w-6xl px-4 py-8">
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <div className="aspect-[16/9] bg-gray-200 animate-pulse" />
                <div className="p-6 space-y-3">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </Card>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
      <StudentHeader pageTitle="Redações Comentadas" />

      <main className="mx-auto max-w-6xl px-4 py-8">
        {redacoes.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                Nenhuma redação comentada disponível
              </h3>
              <p className="text-gray-500">
                As redações comentadas aparecerão aqui quando cadastradas pelo administrador.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div role="list" className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {redacoes.map((r) => (
              <Card
                key={r.id}
                className="overflow-hidden shadow-md rounded-2xl border border-gray-200 bg-white"
              >
                {/* Capa 16:9 */}
                <div className="aspect-[16/9] overflow-hidden bg-gradient-to-br from-purple-100 to-violet-200 relative">
                  <img
                    src={MODO_COVER[r.modo_correcao_id] || '/placeholders/aula-cover.png'}
                    alt={`Capa: ${r.titulo}`}
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                    onError={(e) => {
                      e.currentTarget.src = '/placeholders/aula-cover.png';
                    }}
                    loading="lazy"
                  />
                  {/* Badge do modo sobre a imagem */}
                  <div className="absolute top-2 left-2">
                    <Badge className={`text-xs ${MODO_COLORS[r.modo_correcao_id] || ''}`}>
                      {MODO_LABELS[r.modo_correcao_id] || r.modo_correcao_id}
                    </Badge>
                  </div>
                </div>

                {/* Conteúdo */}
                <div className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 leading-tight mb-1">
                        {r.titulo}
                      </h2>
                      {r.publicado_em && (
                        <p className="text-sm text-gray-500">
                          Criado em:{' '}
                          {format(new Date(r.publicado_em), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      )}
                    </div>

                    <div className="pt-2">
                      <Button
                        className="w-full font-semibold bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleVer(r.id)}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Ver Redação
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default RedacoesComentadas;
