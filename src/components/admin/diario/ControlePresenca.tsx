import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Save, Users, UserCheck, UserX, Info, Radio } from 'lucide-react';
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
  nome: string;
  presente: boolean;
  participou: boolean;
  temRegistro: boolean;
}

export function ControlePresenca({ aula, onClose }: ControlePresencaProps) {
  const [alunosPresenca, setAlunosPresenca] = useState<AlunoPresenca[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: presencas, isLoading } = usePresencaParticipacao(aula.id);
  const presencaMutation = usePresencaMutation();

  // Verificar se é uma aula online com presença automática
  const isAulaOnline = aula.eh_aula_online === true;
  const isPresencaAutomatica = aula.presenca_automatica === true;

  // Buscar alunos da turma com nomes da tabela profiles
  useEffect(() => {
    const fetchAlunos = async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        
        // Buscar alunos direto da tabela profiles
        const { data: alunosData, error } = await supabase
          .from('profiles')
          .select('email, nome')
          .eq('user_type', 'aluno')
          .eq('turma', aula.turma)
          .eq('ativo', true)
          .order('nome');
        
        if (error) throw error;
        
        // Criar estrutura com dados de presença
        const alunosComPresenca: AlunoPresenca[] = (alunosData || []).map(aluno => {
          const presencaExistente = presencas?.find(p => p.aluno_email === aluno.email);
          return {
            email: aluno.email,
            nome: aluno.nome || aluno.email,
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
    <div className="container mx-auto p-2 sm:p-6 max-w-4xl">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-start gap-2 sm:gap-4">
            <Button variant="outline" size="icon" onClick={onClose} className="shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="truncate">Controle de Presença</span>
              </CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {format(new Date(aula.data_aula), 'dd/MM/yyyy', { locale: ptBR })} - {aula.turma}
              </p>
              <p className="text-xs sm:text-sm font-medium mt-1 line-clamp-2">
                {aula.conteudo_ministrado}
              </p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4 sm:space-y-6">
          {/* Alerta para aulas online */}
          {isAulaOnline && (
            <Alert className="bg-blue-50 border-blue-200">
              <Radio className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Presença Automática (Aula Ao Vivo)</strong>
                <br />
                A presença dos alunos é registrada automaticamente quando eles entram e saem da aula.
                {isPresencaAutomatica && " Os controles abaixo estão desabilitados."}
              </AlertDescription>
            </Alert>
          )}

          {/* Estatísticas */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <Card>
              <CardContent className="p-2 sm:p-4 text-center">
                <div className="text-xl sm:text-2xl font-bold text-green-600">{contadores.presentes}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Presentes</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-2 sm:p-4 text-center">
                <div className="text-xl sm:text-2xl font-bold text-blue-600">{contadores.participaram}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Participaram</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-2 sm:p-4 text-center">
                <div className="text-xl sm:text-2xl font-bold">{contadores.total}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Total</div>
              </CardContent>
            </Card>
          </div>

          {/* Ações em Lote */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={marcarTodosPresentes}
              className="flex-1 text-sm"
              disabled={isAulaOnline}
              title={isAulaOnline ? "Desabilitado para aulas online com presença automática" : ""}
            >
              <UserCheck className="w-4 h-4 mr-2" />
              Marcar Todos Presentes
            </Button>
            <Button
              variant="outline"
              onClick={desmarcarTodos}
              className="flex-1 text-sm"
              disabled={isAulaOnline}
              title={isAulaOnline ? "Desabilitado para aulas online com presença automática" : ""}
            >
              <UserX className="w-4 h-4 mr-2" />
              Desmarcar
            </Button>
          </div>

          {/* Lista de Alunos */}
          <div className="space-y-2 sm:space-y-3">
            {isLoading ? (
              <div className="text-center py-8">Carregando alunos...</div>
            ) : (
              alunosPresenca.map((aluno) => (
                <Card key={aluno.email} className="border-l-4 border-l-gray-300">
                  <CardContent className="p-3 sm:p-4">
                    {/* Layout Mobile - Stack vertical */}
                    <div className="sm:hidden">
                      <div className="mb-3">
                        <p className="font-medium text-sm truncate">{aluno.nome}</p>
                        <p className="text-xs text-muted-foreground truncate">{aluno.email}</p>
                        {aluno.temRegistro && (
                          <Badge variant="secondary" className="text-xs mt-1">
                            Já registrado
                          </Badge>
                        )}
                      </div>
                      
                      <div className="space-y-3">
                        {/* Presença */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Presente</span>
                          <Checkbox
                            id={`presente-${aluno.email}`}
                            checked={aluno.presente}
                            disabled={isAulaOnline}
                            onCheckedChange={(checked) =>
                              handlePresencaChange(aluno.email, checked as boolean)
                            }
                          />
                        </div>

                        {/* Participação */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Participou</span>
                          <Checkbox
                            id={`participou-${aluno.email}`}
                            checked={aluno.participou}
                            disabled={!aluno.presente || isAulaOnline}
                            onCheckedChange={(checked) =>
                              handleParticipacaoChange(aluno.email, checked as boolean)
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* Layout Desktop - Horizontal */}
                    <div className="hidden sm:flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-medium">{aluno.nome}</p>
                          <p className="text-sm text-muted-foreground">{aluno.email}</p>
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
                            id={`presente-desktop-${aluno.email}`}
                            checked={aluno.presente}
                            disabled={isAulaOnline}
                            onCheckedChange={(checked) =>
                              handlePresencaChange(aluno.email, checked as boolean)
                            }
                          />
                          <label
                            htmlFor={`presente-desktop-${aluno.email}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            Presente
                          </label>
                        </div>

                        {/* Participação */}
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`participou-desktop-${aluno.email}`}
                            checked={aluno.participou}
                            disabled={!aluno.presente || isAulaOnline}
                            onCheckedChange={(checked) =>
                              handleParticipacaoChange(aluno.email, checked as boolean)
                            }
                          />
                          <label
                            htmlFor={`participou-desktop-${aluno.email}`}
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


          {/* Botões de Ação */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="order-2 sm:order-1">
              {isAulaOnline ? 'Fechar' : 'Cancelar'}
            </Button>
            {isAulaOnline ? (
              <Button
                disabled
                className="flex items-center justify-center gap-2 order-1 sm:order-2 bg-blue-100 text-blue-800 cursor-not-allowed"
              >
                <Radio className="w-4 h-4" />
                Presença Automática
              </Button>
            ) : (
              <Button
                onClick={handleSaveAll}
                disabled={saving}
                className="flex items-center justify-center gap-2 order-1 sm:order-2"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Salvando...' : 'Salvar Presenças'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}