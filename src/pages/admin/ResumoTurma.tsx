import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, BarChart3, Users, Calendar, TrendingUp } from 'lucide-react';
import { useResumoTurma, useTurmasDisponiveis, useEtapas } from '@/hooks/useDiario';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ResumoAlunoTurma } from '@/types/diario';

export default function ResumoTurma() {
  const [selectedTurma, setSelectedTurma] = useState<string>('');
  const [selectedEtapa, setSelectedEtapa] = useState<number>(1);
  
  const { data: turmas, isLoading: loadingTurmas } = useTurmasDisponiveis();
  const { data: etapas } = useEtapas(selectedTurma);
  const { data: resumo, isLoading: loadingResumo } = useResumoTurma(selectedTurma, selectedEtapa);

  const exportarCSV = () => {
    if (!resumo) return;

    const headers = [
      'Nome do Aluno',
      'Email do Aluno',
      'Frequência (%)',
      'Participação (%)',
      'Redações',
      'Nota Média Redações',
      'Simulados',
      'Nota Média Simulados',
      'Exercícios',
      'Média Final'
    ];

    const rows = resumo.alunos.map((aluno: ResumoAlunoTurma) => [
      aluno.aluno_nome,
      aluno.aluno_email,
      aluno.dados.frequencia.percentual_frequencia,
      aluno.dados.participacao.percentual_participacao,
      aluno.dados.redacoes.total_redacoes,
      aluno.dados.redacoes.nota_media,
      aluno.dados.simulados.total_simulados,
      aluno.dados.simulados.nota_media,
      aluno.dados.exercicios.total_exercicios,
      aluno.dados.media_final
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `resumo_${selectedTurma}_${selectedEtapa}etapa_${format(new Date(), 'dd-MM-yyyy')}.csv`;
    link.click();
  };

  const formatPercentual = (valor: number) => `${valor.toFixed(1)}%`;
  const formatNota = (valor: number) => valor > 0 ? valor.toFixed(1) : '-';

  const getStatusBadge = (percentual: number, tipo: 'frequencia' | 'participacao') => {
    const limite = tipo === 'frequencia' ? 75 : 50; // 75% frequência, 50% participação
    
    if (percentual >= limite) {
      return <Badge variant="default" className="bg-green-600">Bom</Badge>;
    } else if (percentual >= limite * 0.7) {
      return <Badge variant="secondary" className="bg-yellow-600">Regular</Badge>;
    } else {
      return <Badge variant="destructive">Baixo</Badge>;
    }
  };

  const calcularEstatisticas = () => {
    if (!resumo || resumo.alunos.length === 0) return null;

    const dados = resumo.alunos.map(a => a.dados);
    
    return {
      frequenciaMedia: dados.reduce((acc, d) => acc + d.frequencia.percentual_frequencia, 0) / dados.length,
      participacaoMedia: dados.reduce((acc, d) => acc + d.participacao.percentual_participacao, 0) / dados.length,
      mediaFinalMedia: dados.reduce((acc, d) => acc + d.media_final, 0) / dados.length,
      totalRedacoes: dados.reduce((acc, d) => acc + d.redacoes.total_redacoes, 0),
      totalSimulados: dados.reduce((acc, d) => acc + d.simulados.total_simulados, 0),
      totalExercicios: dados.reduce((acc, d) => acc + d.exercicios.total_exercicios, 0)
    };
  };

  const estatisticas = calcularEstatisticas();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Resumo da Turma</h1>
          <p className="text-muted-foreground">
            Visualize o desempenho dos alunos por etapa e exporte relatórios
          </p>
        </div>
        <Button 
          onClick={exportarCSV}
          disabled={!resumo || resumo.alunos.length === 0}
          className="flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Seletores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Seletor de Turma */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Turma</label>
              <Select value={selectedTurma} onValueChange={setSelectedTurma}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma turma" />
                </SelectTrigger>
                <SelectContent>
                  {turmas?.map((turma) => (
                    <SelectItem key={turma.codigo} value={turma.codigo}>
                      {turma.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Seletor de Etapa */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Etapa</label>
              <Select 
                value={selectedEtapa.toString()} 
                onValueChange={(value) => setSelectedEtapa(parseInt(value))}
                disabled={!selectedTurma}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma etapa" />
                </SelectTrigger>
                <SelectContent>
                  {etapas?.map((etapa) => (
                    <SelectItem key={etapa.id} value={etapa.numero.toString()}>
                      {etapa.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas Gerais */}
      {estatisticas && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatPercentual(estatisticas.frequenciaMedia)}
              </div>
              <div className="text-sm text-muted-foreground">Frequência Média</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatPercentual(estatisticas.participacaoMedia)}
              </div>
              <div className="text-sm text-muted-foreground">Participação Média</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {estatisticas.mediaFinalMedia.toFixed(1)}
              </div>
              <div className="text-sm text-muted-foreground">Média Final</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">
                {estatisticas.totalRedacoes + estatisticas.totalSimulados + estatisticas.totalExercicios}
              </div>
              <div className="text-sm text-muted-foreground">Total de Atividades</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Informações da Etapa */}
      {selectedTurma && resumo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Informações da Etapa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Etapa</div>
                <div className="font-medium">{resumo.etapa.nome}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Período</div>
                <div className="font-medium">
                  {format(new Date(resumo.etapa.data_inicio), 'dd/MM/yyyy', { locale: ptBR })} - {' '}
                  {format(new Date(resumo.etapa.data_fim), 'dd/MM/yyyy', { locale: ptBR })}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Aulas Previstas</div>
                <div className="font-medium">{resumo.total_aulas_previstas} aulas</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela de Alunos */}
      {selectedTurma && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Desempenho dos Alunos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingResumo ? (
              <div className="text-center py-12">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <div className="space-y-2">
                    <div className="text-lg font-semibold">Processando dados da turma...</div>
                    <div className="text-sm text-muted-foreground">
                      Calculando frequência, participação, redações e simulados
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Isso pode levar alguns segundos devido ao volume de dados
                    </div>
                  </div>
                </div>
              </div>
            ) : !resumo || resumo.alunos.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Nenhum dado encontrado para esta turma e etapa
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Aluno</TableHead>
                      <TableHead className="text-center">Frequência</TableHead>
                      <TableHead className="text-center">Participação</TableHead>
                      <TableHead className="text-center">Redações</TableHead>
                      <TableHead className="text-center">Simulados</TableHead>
                      <TableHead className="text-center">Exercícios</TableHead>
                      <TableHead className="text-center">Média Final</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resumo.alunos.map((aluno) => (
                      <TableRow key={aluno.aluno_email}>
                        <TableCell className="font-medium">
                          <div>
                            <div className="font-semibold">{aluno.aluno_nome}</div>
                            <div className="text-xs text-muted-foreground">
                              {aluno.aluno_email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="space-y-1">
                            <div>{formatPercentual(aluno.dados.frequencia.percentual_frequencia)}</div>
                            <div className="text-xs text-muted-foreground">
                              {aluno.dados.frequencia.aulas_presentes}/{aluno.dados.frequencia.total_aulas}
                            </div>
                            {getStatusBadge(aluno.dados.frequencia.percentual_frequencia, 'frequencia')}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="space-y-1">
                            <div>{formatPercentual(aluno.dados.participacao.percentual_participacao)}</div>
                            <div className="text-xs text-muted-foreground">
                              {aluno.dados.participacao.aulas_participou}/{aluno.dados.participacao.total_aulas}
                            </div>
                            {getStatusBadge(aluno.dados.participacao.percentual_participacao, 'participacao')}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="space-y-1">
                            <div className="font-medium">{aluno.dados.redacoes.total_redacoes}</div>
                            <div className="text-xs text-muted-foreground">
                              Média: {formatNota(aluno.dados.redacoes.nota_media)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="space-y-1">
                            <div className="font-medium">{aluno.dados.simulados.total_simulados}</div>
                            <div className="text-xs text-muted-foreground">
                              Média: {formatNota(aluno.dados.simulados.nota_media)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="font-medium">{aluno.dados.exercicios.total_exercicios}</div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="text-lg font-bold text-primary">
                            {aluno.dados.media_final.toFixed(1)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}