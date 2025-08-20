import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Presentation } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import LousaCard from './LousaCard';

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
  const [lousas, setLousas] = useState<Lousa[]>([]);
  const [loading, setLoading] = useState(true);
  const { studentData: student } = useStudentAuth();
  const navigate = useNavigate();

  const fetchLousas = async () => {
    if (!student) return;

    try {
      // Buscar lousas disponíveis para o aluno
      const { data: lousasData, error: lousasError } = await supabase
        .from('lousa')
        .select('*')
        .eq('ativo', true)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (lousasError) throw lousasError;

      const lousasComResposta = await Promise.all(
        (lousasData || []).map(async (lousa) => {
          // Verificar se o aluno tem acesso à lousa
          const temAcesso = lousa.permite_visitante || 
            (student.turma && lousa.turmas.includes(student.turma.replace('Turma ', '')));

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
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Presentation className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Lousa</h1>
          <p className="text-muted-foreground">Participe dos exercícios rápidos criados pelos professores</p>
        </div>
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
            <LousaCard
              key={lousa.id}
              lousa={lousa}
              onClick={() => handleLousaClick(lousa)}
            />
          ))}
        </div>
      )}
    </div>
  );
}