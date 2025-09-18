import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StudentHeader } from '@/components/StudentHeader';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { SubscriptionInfo } from '@/components/student/SubscriptionInfo';
import { BookOpen, TrendingUp, Calendar, BarChart3, FileText, Trophy, CheckCircle } from 'lucide-react';
import { useDiarioAluno } from '@/hooks/useDiario';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import { usePageTitle } from '@/hooks/useBreadcrumbs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DiarioEtapa } from '@/types/diario';

const DiarioOnline = () => {
  usePageTitle('Diário Online');
  
  const { studentData } = useStudentAuth();
  const [selectedEtapa, setSelectedEtapa] = useState<number | null>(null);
  
  const { data: etapas, isLoading } = useDiarioAluno(
    studentData?.email || '',
    studentData?.turma || '',
    selectedEtapa || undefined
  );

  // Selecionar automaticamente a etapa atual ou a última
  useEffect(() => {
    if (etapas && etapas.length > 0 && selectedEtapa === null) {
      const hoje = new Date();
      
      // Procurar etapa atual
      const etapaAtual = etapas.find(etapa => {
        const inicio = new Date(etapa.data_inicio);
        const fim = new Date(etapa.data_fim);
        return hoje >= inicio && hoje <= fim;
      });
      
      // Se não encontrar etapa atual, pegar a última
      const etapaParaSelecionar = etapaAtual || etapas[etapas.length - 1];
      setSelectedEtapa(etapaParaSelecionar.etapa_numero);
    }
  }, [etapas, selectedEtapa]);

  const formatPercentual = (valor: number) => `${valor.toFixed(1)}%`;
  const formatNota = (valor: number) => valor > 0 ? valor.toFixed(1) : '-';

  const getStatusBadge = (percentual: number, tipo: 'frequencia' | 'participacao') => {
    const limite = tipo === 'frequencia' ? 75 : 50;
    
    if (percentual >= limite) {
      return <Badge className="bg-green-600">Excelente</Badge>;
    } else if (percentual >= limite * 0.7) {
      return <Badge className="bg-yellow-600">Regular</Badge>;
    } else {
      return <Badge variant="destructive">Atenção</Badge>;
    }
  };

  const calcularMediaGeral = () => {
    if (!etapas || etapas.length === 0) return 0;
    const soma = etapas.reduce((acc, etapa) => acc + etapa.media_final, 0);
    return soma / etapas.length;
  };

  const renderCardMetrica = (
    titulo: string,
    valor: string | number,
    subtitulo?: string,
    icon?: React.ReactNode,
    badge?: React.ReactNode
  ) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {icon}
              <span className="text-sm font-medium text-muted-foreground">{titulo}</span>
            </div>
            <div className="text-2xl font-bold">{valor}</div>
            {subtitulo && (
              <div className="text-xs text-muted-foreground">{subtitulo}</div>
            )}
          </div>
          {badge && <div>{badge}</div>}
        </div>
      </CardContent>
    </Card>
  );

  if (!studentData) {
    return <div>Carregando dados do estudante...</div>;
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <StudentHeader pageTitle="Diário Online" />
        
        <main className="container mx-auto px-4 py-6 space-y-6">
          {/* Cabeçalho */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Diário Online</h1>
            <p className="text-muted-foreground">
              Acompanhe seu desempenho acadêmico por etapa
            </p>
            <div className="flex justify-center items-center gap-2">
              <Badge variant="outline">{studentData.turma}</Badge>
              <Badge variant="secondary">{studentData.nome}</Badge>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="text-lg">Carregando seu diário...</div>
            </div>
          ) : !etapas || etapas.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Diário ainda não disponível</h3>
                <p className="text-muted-foreground">
                  As etapas ainda não foram configuradas para sua turma ou não há dados disponíveis.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Informações de Assinatura */}
              <SubscriptionInfo userEmail={studentData.email} />

              {/* Resumo Geral */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Resumo Geral do Ano
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {calcularMediaGeral().toFixed(1)}
                      </div>
                      <div className="text-sm text-muted-foreground">Média Final</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {etapas.length}
                      </div>
                      <div className="text-sm text-muted-foreground">Etapas</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {etapas.reduce((acc, e) => acc + e.redacoes.total_redacoes, 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">Redações</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {etapas.reduce((acc, e) => acc + e.simulados.total_simulados, 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">Simulados</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Seletor de Etapas */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Etapas do Ano Letivo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {etapas.map((etapa) => {
                      const isSelected = selectedEtapa === etapa.etapa_numero;
                      const hoje = new Date();
                      const inicio = new Date(etapa.data_inicio);
                      const fim = new Date(etapa.data_fim);
                      const isAtual = hoje >= inicio && hoje <= fim;
                      
                      return (
                        <Button
                          key={etapa.etapa_numero}
                          variant={isSelected ? "default" : "outline"}
                          onClick={() => setSelectedEtapa(etapa.etapa_numero)}
                          className="h-auto p-4 flex flex-col items-start"
                        >
                          <div className="flex items-center justify-between w-full mb-2">
                            <span className="font-semibold">{etapa.etapa_nome}</span>
                            {isAtual && <Badge className="bg-green-600 text-xs">Atual</Badge>}
                          </div>
                          <div className="text-xs opacity-70">
                            {format(new Date(etapa.data_inicio), 'dd/MM', { locale: ptBR })} - {' '}
                            {format(new Date(etapa.data_fim), 'dd/MM', { locale: ptBR })}
                          </div>
                          <div className="text-sm font-bold mt-1">
                            Média: {etapa.media_final.toFixed(1)}
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Detalhes da Etapa Selecionada */}
              {selectedEtapa && (() => {
                const etapaSelecionada = etapas.find(e => e.etapa_numero === selectedEtapa);
                if (!etapaSelecionada) return null;

                return (
                  <div className="space-y-6">
                    {/* Cabeçalho da Etapa */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BarChart3 className="w-5 h-5" />
                          {etapaSelecionada.etapa_nome}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(etapaSelecionada.data_inicio), 'dd/MM/yyyy', { locale: ptBR })} até {' '}
                          {format(new Date(etapaSelecionada.data_fim), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      </CardHeader>
                    </Card>

                    {/* Métricas da Etapa */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Frequência */}
                      {renderCardMetrica(
                        'Frequência',
                        formatPercentual(etapaSelecionada.frequencia.percentual_frequencia),
                        `${etapaSelecionada.frequencia.aulas_presentes}/${etapaSelecionada.frequencia.total_aulas} aulas`,
                        <CheckCircle className="w-4 h-4 text-green-600" />,
                        getStatusBadge(etapaSelecionada.frequencia.percentual_frequencia, 'frequencia')
                      )}

                      {/* Participação */}
                      {renderCardMetrica(
                        'Participação',
                        formatPercentual(etapaSelecionada.participacao.percentual_participacao),
                        `${etapaSelecionada.participacao.aulas_participou}/${etapaSelecionada.participacao.total_aulas} aulas`,
                        <BookOpen className="w-4 h-4 text-blue-600" />,
                        getStatusBadge(etapaSelecionada.participacao.percentual_participacao, 'participacao')
                      )}

                      {/* Redações */}
                      {renderCardMetrica(
                        'Redações',
                        etapaSelecionada.redacoes.total_redacoes,
                        `Média: ${formatNota(etapaSelecionada.redacoes.nota_media)}`,
                        <FileText className="w-4 h-4 text-purple-600" />
                      )}

                      {/* Simulados */}
                      {renderCardMetrica(
                        'Simulados',
                        etapaSelecionada.simulados.total_simulados,
                        `Média: ${formatNota(etapaSelecionada.simulados.nota_media)}`,
                        <Trophy className="w-4 h-4 text-orange-600" />
                      )}

                      {/* Exercícios */}
                      {renderCardMetrica(
                        'Exercícios',
                        etapaSelecionada.exercicios.total_exercicios,
                        'Concluídos',
                        <BookOpen className="w-4 h-4 text-green-600" />
                      )}

                      {/* Média Final da Etapa */}
                      {renderCardMetrica(
                        'Média Final',
                        etapaSelecionada.media_final.toFixed(1),
                        'Escala 0-10',
                        <TrendingUp className="w-4 h-4 text-primary" />,
                        <Badge className="text-lg">{etapaSelecionada.media_final >= 7 ? '✓' : '!'}</Badge>
                      )}
                    </div>

                    {/* Dicas e Informações */}
                    <Card>
                      <CardContent className="p-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                            Como interpretar seus dados
                          </h4>
                          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                            <li>• <strong>Frequência:</strong> Mínimo recomendado de 75% de presença</li>
                            <li>• <strong>Participação:</strong> Mínimo recomendado de 50% de participação ativa</li>
                            <li>• <strong>Redações e Simulados:</strong> Quanto mais praticar, melhor será seu desempenho</li>
                            <li>• <strong>Média Final:</strong> Calculada automaticamente com base em todos os critérios</li>
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })()}
            </>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default DiarioOnline;