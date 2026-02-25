import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Search, Eye, User, GraduationCap, Star, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { CorretorLayout } from "@/components/corretor/CorretorLayout";
import { useCorretorAuth } from "@/hooks/useCorretorAuth";
import { verificarDivergencia } from "@/utils/simuladoDivergencia";

interface RedacaoSimulado {
  id: string;
  nome_aluno: string;
  email_aluno: string;
  turma: string;
  data_envio: string;
  texto: string;
  redacao_manuscrita_url?: string | null;
  // Status dos corretores
  status_corretor_1?: string | null;
  status_corretor_2?: string | null;
  corretor_id_1?: string | null;
  corretor_id_2?: string | null;
  // Notas do corretor 1
  c1_corretor_1?: number | null;
  c2_corretor_1?: number | null;
  c3_corretor_1?: number | null;
  c4_corretor_1?: number | null;
  c5_corretor_1?: number | null;
  nota_final_corretor_1?: number | null;
  // Notas do corretor 2
  c1_corretor_2?: number | null;
  c2_corretor_2?: number | null;
  c3_corretor_2?: number | null;
  c4_corretor_2?: number | null;
  c5_corretor_2?: number | null;
  nota_final_corretor_2?: number | null;
  // Dados do simulado
  simulados?: {
    frase_tematica: string;
    titulo: string;
  };
}

const CorretorSimuladoRedacoes = () => {
  const { simuladoId } = useParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedDivergencia, setExpandedDivergencia] = useState<Set<string>>(new Set());
  const { corretor } = useCorretorAuth();

  const toggleDivergencia = (id: string) => {
    setExpandedDivergencia(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const { data: redacoes, isLoading, error } = useQuery({
    queryKey: ['corretor-simulado-redacoes', simuladoId],
    queryFn: async () => {
      if (!simuladoId) {
        throw new Error('ID do simulado não fornecido');
      }

      const { data, error } = await supabase
        .from('redacoes_simulado')
        .select(`
          *,
          simulados(frase_tematica, titulo)
        `)
        .eq('id_simulado', simuladoId)
        .order('nome_aluno', { ascending: true });

      if (error) {
        console.error('Erro ao buscar redações do simulado:', error);
        throw error;
      }

      return data as RedacaoSimulado[];
    },
    enabled: !!simuladoId
  });

  // Filtrar redações por termo de busca
  const redacoesFiltradas = redacoes?.filter(redacao =>
    redacao.nome_aluno.toLowerCase().includes(searchTerm.toLowerCase()) ||
    redacao.email_aluno.toLowerCase().includes(searchTerm.toLowerCase()) ||
    redacao.turma.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Função para calcular status geral da redação
  const getStatusGeral = (redacao: RedacaoSimulado) => {
    const corrigida1 = redacao.status_corretor_1 === 'corrigida';
    const corrigida2 = redacao.status_corretor_2 === 'corrigida';
    const temCorretor1 = !!redacao.corretor_id_1;
    const temCorretor2 = !!redacao.corretor_id_2;

    // Se ambos finalizaram, verificar divergência
    if (temCorretor1 && temCorretor2 && corrigida1 && corrigida2) {
      const div = verificarDivergencia(redacao);
      if (div?.temDivergencia) return { label: 'Discrepância', color: 'bg-red-500' };
      return { label: 'Aguardando Admin', color: 'bg-blue-500' };
    }

    if (temCorretor1 && temCorretor2) {
      if (corrigida1 || corrigida2) return { label: 'Parcial', color: 'bg-yellow-600' };
      return { label: 'Pendente', color: 'bg-gray-500' };
    } else if (temCorretor1) {
      return corrigida1 ? { label: 'Aguardando Admin', color: 'bg-blue-500' } : { label: 'Pendente', color: 'bg-gray-500' };
    } else if (temCorretor2) {
      return corrigida2 ? { label: 'Aguardando Admin', color: 'bg-blue-500' } : { label: 'Pendente', color: 'bg-gray-500' };
    }
    return { label: 'Sem Corretor', color: 'bg-red-500' };
  };

  // Função para calcular nota final consolidada
  const getNotaFinalConsolidada = (redacao: RedacaoSimulado) => {
    const nota1 = redacao.nota_final_corretor_1;
    const nota2 = redacao.nota_final_corretor_2;

    if (nota1 !== null && nota2 !== null) {
      return ((nota1 + nota2) / 2).toFixed(1);
    } else if (nota1 !== null) {
      return nota1.toString();
    } else if (nota2 !== null) {
      return nota2.toString();
    }
    return '-';
  };

  // Função para obter as notas por competência (média ou única)
  const getNotasCompetencias = (redacao: RedacaoSimulado) => {
    const notas = [];
    for (let i = 1; i <= 5; i++) {
      const nota1 = (redacao as any)[`c${i}_corretor_1`];
      const nota2 = (redacao as any)[`c${i}_corretor_2`];

      if (nota1 !== null && nota2 !== null) {
        notas.push(((nota1 + nota2) / 2).toFixed(1));
      } else if (nota1 !== null) {
        notas.push(nota1.toString());
      } else if (nota2 !== null) {
        notas.push(nota2.toString());
      } else {
        notas.push('-');
      }
    }
    return notas;
  };

  if (isLoading) {
    return (
      <CorretorLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Carregando redações...</h1>
          </div>
        </div>
      </CorretorLayout>
    );
  }

  if (error || !redacoes) {
    return (
      <CorretorLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Erro ao carregar redações</h1>
            <p className="text-gray-600">Não foi possível carregar as redações deste simulado.</p>
          </div>
          <Button onClick={() => navigate('/corretor/simulados')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Simulados
          </Button>
        </div>
      </CorretorLayout>
    );
  }

  const simulado = redacoes[0]?.simulados;

  return (
    <CorretorLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button onClick={() => navigate('/corretor/simulados')} variant="outline" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para Simulados
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">
              {simulado?.titulo || 'Redações do Simulado'}
            </h1>
            <p className="text-gray-600">
              {simulado?.frase_tematica}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Total de redações: {redacoes.length}
            </p>
          </div>
        </div>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar por nome, email ou turma..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Lista de redações */}
        <div className="grid gap-4">
          {redacoesFiltradas.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">
                  {searchTerm ? 'Nenhuma redação encontrada com esse filtro.' : 'Nenhuma redação encontrada.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            redacoesFiltradas.map((redacao) => {
              const status = getStatusGeral(redacao);
              const notaFinal = getNotaFinalConsolidada(redacao);
              const notasCompetencias = getNotasCompetencias(redacao);
              const div = verificarDivergencia(redacao);
              const isDivergente = div?.temDivergencia ?? false;
              const mostrarDetalhes = expandedDivergencia.has(redacao.id);

              // Determinar qual corretor é baseado no ID logado
              let corretorNumero: number | null = null;
              if (corretor?.id === redacao.corretor_id_1) {
                corretorNumero = 1;
              } else if (corretor?.id === redacao.corretor_id_2) {
                corretorNumero = 2;
              } else {
                corretorNumero = redacao.corretor_id_1 ? 1 : 2;
              }

              return (
                <Card
                  key={redacao.id}
                  className={`hover:shadow-md transition-shadow ${isDivergente ? 'border-red-300' : ''}`}
                >
                  <CardContent className="p-6 space-y-3">
                    {/* Alerta de divergência */}
                    {isDivergente && (
                      <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-red-700">Discrepância detectada</p>
                          <p className="text-xs text-red-600">
                            Diferença total de <strong>{div!.diferencaTotal} pts</strong> entre os dois corretores.
                            Entre em contato com o admin para alinhamento.
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 h-7 px-2"
                          onClick={() => toggleDivergencia(redacao.id)}
                        >
                          {mostrarDetalhes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          <span className="text-xs ml-1">Comparar notas</span>
                        </Button>
                      </div>
                    )}

                    {/* Tabela comparativa de notas – visível quando expandido */}
                    {isDivergente && mostrarDetalhes && (
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50">
                              <TableHead className="text-xs">Competência</TableHead>
                              <TableHead className="text-xs text-center">Corretor 1</TableHead>
                              <TableHead className="text-xs text-center">Corretor 2</TableHead>
                              <TableHead className="text-xs text-center">Diferença</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {div!.competencias.map(c => (
                              <TableRow key={c.competencia} className={c.temDivergencia ? 'bg-red-50' : ''}>
                                <TableCell className="text-xs font-medium">
                                  C{c.competencia}
                                  {c.temDivergencia && <AlertTriangle className="w-3 h-3 text-red-500 inline ml-1" />}
                                </TableCell>
                                <TableCell className="text-xs text-center">{c.nota_c1}</TableCell>
                                <TableCell className="text-xs text-center">{c.nota_c2}</TableCell>
                                <TableCell className={`text-xs text-center font-semibold ${c.temDivergencia ? 'text-red-600' : 'text-gray-600'}`}>
                                  {c.diferenca}
                                </TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="font-bold border-t">
                              <TableCell className="text-xs">Total</TableCell>
                              <TableCell className="text-xs text-center">{div!.nota_final_1}</TableCell>
                              <TableCell className="text-xs text-center">{div!.nota_final_2}</TableCell>
                              <TableCell className={`text-xs text-center font-bold ${div!.diferencaTotal > 100 ? 'text-red-600' : 'text-gray-700'}`}>
                                {div!.diferencaTotal}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start lg:items-center">
                      {/* Informações do aluno */}
                      <div className="lg:col-span-4">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="w-4 h-4 text-gray-500" />
                          <span className="font-semibold text-gray-900">{redacao.nome_aluno}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <GraduationCap className="w-4 h-4" />
                          <span>Turma: {redacao.turma}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(redacao.data_envio).toLocaleDateString('pt-BR')}
                        </div>
                      </div>

                      {/* Status */}
                      <div className="lg:col-span-2">
                        <Badge className={`${status.color} text-white`}>
                          {status.label === 'Discrepância' && <AlertTriangle className="w-3 h-3 mr-1 inline" />}
                          {status.label}
                        </Badge>
                      </div>

                      {/* Notas por competência */}
                      <div className="lg:col-span-4 space-y-2">
                        <div className="flex flex-wrap gap-1 items-center">
                          <span className="text-sm font-medium text-gray-700 mr-2">Competências:</span>
                          {notasCompetencias.map((nota, index) => (
                            <div key={index} className="text-xs bg-gray-100 px-2 py-1 rounded whitespace-nowrap">
                              C{index + 1}: {nota}
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-yellow-500" />
                          <span className="text-sm font-semibold">
                            Nota Final: {notaFinal}
                          </span>
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="lg:col-span-2">
                        <Button
                          onClick={() => {
                            const redacaoUrlId = `${redacao.id}-corretor${corretorNumero}`;
                            navigate(`/redacoes/manuscrita/${redacaoUrlId}?origem=corretor`);
                          }}
                          variant="outline"
                          size="sm"
                          className="w-full"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Redação
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </CorretorLayout>
  );
};

export default CorretorSimuladoRedacoes;