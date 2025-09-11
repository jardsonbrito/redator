import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, Users, UserCheck, UserX, MessageSquare } from 'lucide-react';
import { usePresencaParticipacao, usePresencaMutation } from '@/hooks/useDiario';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { AulaDiario, PresencaParticipacao } from '@/types/diario';

interface ControlePresencaProps {
  aula: AulaDiario;
  onClose: () => void;
}

interface AlunoPresenca {
  email: string;
  presente: boolean;
  participou: boolean;
  temRegistro: boolean;
}

export function ControlePresenca({ aula, onClose }: ControlePresencaProps) {
  const [alunosPresenca, setAlunosPresenca] = useState<AlunoPresenca[]>([]);
  const [saving, setSaving] = useState(false);
  
  const { data: presencas, isLoading } = usePresencaParticipacao(aula.id);
  const presencaMutation = usePresencaMutation();

  // Buscar alunos da turma baseado nas redações enviadas
  useEffect(() => {
    const fetchAlunos = async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        
        // Buscar alunos únicos da turma
        const { data: alunosData, error } = await supabase
          .from('redacoes_enviadas')
          .select('email_aluno')
          .eq('turma', aula.turma);
        
        if (error) throw error;
        
        // Remover duplicatas e ordenar
        const alunosUnicos = [...new Set(alunosData.map(a => a.email_aluno))].sort();
        
        // Criar estrutura com dados de presença
        const alunosComPresenca: AlunoPresenca[] = alunosUnicos.map(email => {
          const presencaExistente = presencas?.find(p => p.aluno_email === email);
          return {
            email,
            presente: presencaExistente?.presente || false,
            participou: presencaExistente?.participou || false,
            temRegistro: !!presencaExistente
          };
        });
        
        setAlunosPresenca(alunosComPresenca);
      } catch (error) {
        console.error('Erro ao buscar alunos:', error);
      }
    };

    if (!isLoading) {
      fetchAlunos();
    }
  }, [aula.turma, presencas, isLoading]);

  const handlePresencaChange = (email: string, presente: boolean) => {
    setAlunosPresenca(prev => 
      prev.map(aluno => 
        aluno.email === email 
          ? { ...aluno, presente, participou: presente ? aluno.participou : false }
          : aluno
      )
    );
  };

  const handleParticipacaoChange = (email: string, participou: boolean) => {
    setAlunosPresenca(prev => 
      prev.map(aluno => 
        aluno.email === email 
          ? { ...aluno, participou }
          : aluno
      )
    );
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      // Salvar todos os registros em paralelo
      const promises = alunosPresenca.map(aluno => 
        presencaMutation.mutateAsync({
          aula_id: aula.id,
          aluno_email: aluno.email,
          turma: aula.turma,
          presente: aluno.presente,
          participou: aluno.participou
        })
      );
      
      await Promise.all(promises);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar presenças:', error);
    } finally {
      setSaving(false);
    }
  };

  const marcarTodosPresentes = () => {
    setAlunosPresenca(prev => 
      prev.map(aluno => ({ ...aluno, presente: true }))
    );
  };

  const desmarcarTodos = () => {
    setAlunosPresenca(prev => 
      prev.map(aluno => ({ ...aluno, presente: false, participou: false }))
    );
  };

  const contadores = {
    presentes: alunosPresenca.filter(a => a.presente).length,
    participaram: alunosPresenca.filter(a => a.participou).length,
    total: alunosPresenca.length
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={onClose}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Controle de Presença
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {format(new Date(aula.data_aula), 'dd/MM/yyyy', { locale: ptBR })} - {aula.turma}
              </p>
              <p className="text-sm font-medium mt-1">{aula.conteudo_ministrado}</p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Estatísticas */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{contadores.presentes}</div>
                <div className="text-sm text-muted-foreground">Presentes</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{contadores.participaram}</div>
                <div className="text-sm text-muted-foreground">Participaram</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{contadores.total}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </CardContent>
            </Card>
          </div>

          {/* Ações em Lote */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={marcarTodosPresentes}>
              <UserCheck className="w-4 h-4 mr-2" />
              Marcar Todos Presentes
            </Button>
            <Button variant="outline" onClick={desmarcarTodos}>
              <UserX className="w-4 h-4 mr-2" />
              Desmarcar Todos
            </Button>
          </div>

          {/* Lista de Alunos */}
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center py-8">Carregando alunos...</div>
            ) : (
              alunosPresenca.map((aluno) => (
                <Card key={aluno.email} className="border-l-4 border-l-gray-300">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-medium">{aluno.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {aluno.temRegistro && (
                              <Badge variant="secondary" className="text-xs">
                                Já registrado
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        {/* Presença */}
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`presente-${aluno.email}`}
                            checked={aluno.presente}
                            onCheckedChange={(checked) => 
                              handlePresencaChange(aluno.email, checked as boolean)
                            }
                          />
                          <label
                            htmlFor={`presente-${aluno.email}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            Presente
                          </label>
                        </div>
                        
                        {/* Participação */}
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`participou-${aluno.email}`}
                            checked={aluno.participou}
                            disabled={!aluno.presente}
                            onCheckedChange={(checked) => 
                              handleParticipacaoChange(aluno.email, checked as boolean)
                            }
                          />
                          <label
                            htmlFor={`participou-${aluno.email}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            Participou
                          </label>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Informações */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Instruções
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Marque "Presente" para alunos que compareceram à aula</li>
              <li>• Marque "Participou" apenas para alunos presentes que participaram ativamente</li>
              <li>• As alterações serão salvas quando clicar em "Salvar Presenças"</li>
              <li>• Os dados são utilizados para calcular frequência e participação por etapa</li>
            </ul>
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveAll}
              disabled={saving}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Salvando...' : 'Salvar Presenças'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}