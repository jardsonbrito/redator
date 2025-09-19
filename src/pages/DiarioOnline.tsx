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

  // Funções auxiliares para nova lógica de cálculo da média final
  const converterPercentualParaNota = (percentual: number): number => {
    return percentual / 10; // 90% -> 9.0
  };

  const converterNota1000ParaNota10 = (nota: number): number => {
    return nota / 100; // 800 -> 8.0
  };

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

                    {/* Métricas da Etapa - 5 Critérios Convertidos */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* 1. Frequência (convertida para 0-10) */}
                      {renderCardMetrica(
                        'Frequência',
                        converterPercentualParaNota(etapaSelecionada.frequencia.percentual_frequencia).toFixed(1),
                        `${formatPercentual(etapaSelecionada.frequencia.percentual_frequencia)} → Nota 0-10`,
                        <CheckCircle className="w-4 h-4 text-green-600" />,
                        getStatusBadge(etapaSelecionada.frequencia.percentual_frequencia, 'frequencia')
                      )}

                      {/* 2. Participação (convertida para 0-10) */}
                      {renderCardMetrica(
                        'Participação',
                        converterPercentualParaNota(etapaSelecionada.participacao.percentual_participacao).toFixed(1),
                        `${formatPercentual(etapaSelecionada.participacao.percentual_participacao)} → Nota 0-10`,
                        <BookOpen className="w-4 h-4 text-blue-600" />,
                        getStatusBadge(etapaSelecionada.participacao.percentual_participacao, 'participacao')
                      )}

                      {/* 3. Redações (convertida para 0-10) */}
                      {renderCardMetrica(
                        'Redações',
                        converterNota1000ParaNota10(etapaSelecionada.redacoes.nota_media).toFixed(1),
                        `${etapaSelecionada.redacoes.total_redacoes} redações → Nota 0-10`,
                        <FileText className="w-4 h-4 text-purple-600" />
                      )}

                      {/* 4. Lousas (já em escala 0-10) */}
                      {renderCardMetrica(
                        'Lousas',
                        etapaSelecionada.lousas?.nota_media?.toFixed(1) || '0.0',
                        `${etapaSelecionada.lousas?.total_lousas || 0} lousas → Nota 0-10`,
                        <BookOpen className="w-4 h-4 text-indigo-600" />
                      )}

                      {/* 5. Simulados (convertida para 0-10) */}
                      {renderCardMetrica(
                        'Simulados',
                        converterNota1000ParaNota10(etapaSelecionada.simulados.nota_media).toFixed(1),
                        `${etapaSelecionada.simulados.total_simulados} simulados → Nota 0-10`,
                        <Trophy className="w-4 h-4 text-orange-600" />
                      )}

                      {/* Média Final da Etapa */}
                      {renderCardMetrica(
                        'Média Final',
                        etapaSelecionada.media_final.toFixed(1),
                        'Média dos 5 critérios ÷ 5',
                        <TrendingUp className="w-4 h-4 text-primary" />,
                        <Badge className="text-lg">{etapaSelecionada.media_final >= 7 ? '✓' : '!'}</Badge>
                      )}
                    </div>

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