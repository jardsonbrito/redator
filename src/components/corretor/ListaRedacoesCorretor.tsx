
import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCorretorRedacoes, RedacaoCorretor } from "@/hooks/useCorretorRedacoes";
import { Clock, FileText, CheckCircle, User, Search } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useVisualizacoesRealtime } from "@/hooks/useVisualizacoesRealtime";
import { supabase } from "@/integrations/supabase/client";

interface ListaRedacoesCorretorProps {
  corretorEmail: string;
  onCorrigir: (redacao: RedacaoCorretor) => void;
}

interface NotasRedacao {
  c1: number | null;
  c2: number | null;
  c3: number | null;
  c4: number | null;
  c5: number | null;
  total: number | null;
}

export const ListaRedacoesCorretor = ({ corretorEmail, onCorrigir }: ListaRedacoesCorretorProps) => {
  const { loading, redacoes, getRedacoesPorStatus } = useCorretorRedacoes(corretorEmail);
  const isMobile = useIsMobile();
  const [notasRedacoes, setNotasRedacoes] = useState<Record<string, NotasRedacao>>({});
  
  // Hook para visualizações em tempo real
  const { isRedacaoVisualizada, getVisualizacao } = useVisualizacoesRealtime();
  
  // Estados dos filtros
  const [buscaNome, setBuscaNome] = useState("");
  const [filtroTurma, setFiltroTurma] = useState("todas");
  const [filtroStatus, setFiltroStatus] = useState("todas");
  const [filtroMes, setFiltroMes] = useState("todos");

  // Lista fixa de todas as turmas do sistema
  const turmasDisponiveis = useMemo(() => {
    return ['Turma A', 'Turma B', 'Turma C', 'Turma D', 'Turma E', 'Visitantes'];
  }, []);

  const mesesDisponiveis = useMemo(() => {
    const meses = Array.from(new Set(redacoes.map(r => {
      const data = new Date(r.data_envio);
      const mes = data.toLocaleDateString('pt-BR', { month: 'long' });
      const ano = data.getFullYear().toString().slice(-2);
      return `${mes}/${ano}`;
    })));
    return meses.sort((a, b) => {
      const [mesA, anoA] = a.split('/');
      const [mesB, anoB] = b.split('/');
      const dataA = new Date(2000 + parseInt(anoA), new Date(`${mesA} 1`).getMonth());
      const dataB = new Date(2000 + parseInt(anoB), new Date(`${mesB} 1`).getMonth());
      return dataA.getTime() - dataB.getTime();
    });
  }, [redacoes]);

  // Filtrar redações baseado nos filtros ativos
  const redacoesFiltradas = useMemo(() => {
    return redacoes.filter(redacao => {
      const matchNome = buscaNome === "" || 
        redacao.nome_aluno.toLowerCase().includes(buscaNome.toLowerCase()) ||
        redacao.email_aluno.toLowerCase().includes(buscaNome.toLowerCase());

      const matchTurma = filtroTurma === "todas" || (() => {
        if (!redacao.turma && (redacao.email_aluno.includes('@gmail') || redacao.email_aluno.includes('@hotmail') || redacao.email_aluno.includes('@yahoo'))) {
          return filtroTurma === 'Visitantes';
        }
        return filtroTurma === redacao.turma;
      })();

      const matchStatus = filtroStatus === "todas" || redacao.status_minha_correcao === filtroStatus;

      const matchMes = filtroMes === "todos" || (() => {
        const data = new Date(redacao.data_envio);
        const mes = data.toLocaleDateString('pt-BR', { month: 'long' });
        const ano = data.getFullYear().toString().slice(-2);
        return `${mes}/${ano}` === filtroMes;
      })();

      return matchNome && matchTurma && matchStatus && matchMes;
    });
  }, [redacoes, buscaNome, filtroTurma, filtroStatus, filtroMes]);

  // Função para buscar as notas de uma redação corrigida
  const buscarNotasRedacao = async (redacao: RedacaoCorretor) => {
    if (notasRedacoes[redacao.id]) return; // Já buscou

    try {
      let data, error;
      
      if (redacao.tipo_redacao === 'regular') {
        const result = await supabase
          .from('redacoes_enviadas')
          .select('c1_corretor_1, c2_corretor_1, c3_corretor_1, c4_corretor_1, c5_corretor_1, nota_final_corretor_1, c1_corretor_2, c2_corretor_2, c3_corretor_2, c4_corretor_2, c5_corretor_2, nota_final_corretor_2')
          .eq('id', redacao.id)
          .single();
        data = result.data;
        error = result.error;
      } else if (redacao.tipo_redacao === 'simulado') {
        const result = await supabase
          .from('redacoes_simulado')
          .select('c1_corretor_1, c2_corretor_1, c3_corretor_1, c4_corretor_1, c5_corretor_1, nota_final_corretor_1, c1_corretor_2, c2_corretor_2, c3_corretor_2, c4_corretor_2, c5_corretor_2, nota_final_corretor_2')
          .eq('id', redacao.id)
          .single();
        data = result.data;
        error = result.error;
      } else if (redacao.tipo_redacao === 'exercicio') {
        const result = await supabase
          .from('redacoes_exercicio')
          .select('c1_corretor_1, c2_corretor_1, c3_corretor_1, c4_corretor_1, c5_corretor_1, nota_final_corretor_1, c1_corretor_2, c2_corretor_2, c3_corretor_2, c4_corretor_2, c5_corretor_2, nota_final_corretor_2')
          .eq('id', redacao.id)
          .single();
        data = result.data;
        error = result.error;
      } else {
        return;
      }

      if (error) throw error;

      let notas: NotasRedacao;

      if (redacao.eh_corretor_1) {
        notas = {
          c1: data.c1_corretor_1,
          c2: data.c2_corretor_1,
          c3: data.c3_corretor_1,
          c4: data.c4_corretor_1,
          c5: data.c5_corretor_1,
          total: data.nota_final_corretor_1
        };
      } else {
        notas = {
          c1: data.c1_corretor_2,
          c2: data.c2_corretor_2,
          c3: data.c3_corretor_2,
          c4: data.c4_corretor_2,
          c5: data.c5_corretor_2,
          total: data.nota_final_corretor_2
        };
      }

      setNotasRedacoes(prev => ({
        ...prev,
        [redacao.id]: notas
      }));
    } catch (error) {
      console.error('Erro ao buscar notas:', error);
    }
  };

  // Função para verificar se o aluno visualizou a devolução
  const verificarSeAlunoVisualizou = (redacao: RedacaoCorretor): boolean => {
    return isRedacaoVisualizada(redacao.id, redacao.email_aluno);
  };

  // Função para obter redações por status com base nas redações filtradas
  const getRedacoesFiltradas = useMemo(() => {
    const pendentes = redacoesFiltradas.filter(r => r.status_minha_correcao === 'pendente');
    const incompletas = redacoesFiltradas.filter(r => r.status_minha_correcao === 'incompleta');
    const corrigidas = redacoesFiltradas.filter(r => r.status_minha_correcao === 'corrigida');
    const devolvidas = redacoesFiltradas.filter(r => r.status_minha_correcao === 'devolvida');
    
    return { pendentes, incompletas, corrigidas, devolvidas };
  }, [redacoesFiltradas]);

  // Buscar notas para redações corrigidas de forma isolada
  useMemo(() => {
    getRedacoesFiltradas.corrigidas.forEach(redacao => {
      buscarNotasRedacao(redacao);
    });
  }, [getRedacoesFiltradas.corrigidas]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const { pendentes, incompletas, corrigidas, devolvidas } = getRedacoesFiltradas;

  const RedacaoItem = ({ redacao, index }: { redacao: RedacaoCorretor; index: number }) => (
    <div className="border rounded-lg p-3 sm:p-4 hover:bg-muted/50 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="font-semibold text-sm sm:text-lg">#{index + 1}</span>
            <Badge variant="outline" className="text-xs">
              {redacao.tipo_redacao === 'regular' ? 'Regular' : 
               redacao.tipo_redacao === 'simulado' ? 'Simulado' : 
               redacao.tipo_redacao === 'exercicio' ? 'Exercício' : 
               redacao.tipo_redacao === 'avulsa' ? 'Livre' : redacao.tipo_redacao}
            </Badge>
          </div>
          
          <div className="flex items-start gap-2 mb-2">
            <User className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <h3 className="font-medium text-sm sm:text-base break-words">
              {redacao.nome_aluno}
            </h3>
          </div>
          
          <p className="text-xs sm:text-sm text-muted-foreground mb-2 line-clamp-2 break-words">
            {redacao.frase_tematica}
          </p>

          {/* Exibir notas para redações corrigidas */}
          {redacao.status_minha_correcao === 'corrigida' && (
            <div className="mb-2">
              {notasRedacoes[redacao.id] ? (
                <div className="text-xs sm:text-sm">
                  <div className="flex flex-wrap gap-1 sm:gap-2 mb-1">
                    <span className="text-red-600">C1: {notasRedacoes[redacao.id].c1 ?? 0}</span>
                    <span className="text-green-600">C2: {notasRedacoes[redacao.id].c2 ?? 0}</span>
                    <span className="text-blue-600">C3: {notasRedacoes[redacao.id].c3 ?? 0}</span>
                    <span className="text-purple-600">C4: {notasRedacoes[redacao.id].c4 ?? 0}</span>
                    <span className="text-orange-600">C5: {notasRedacoes[redacao.id].c5 ?? 0}</span>
                  </div>
                  <div className="font-semibold text-purple-700 bg-purple-100 inline-block px-2 py-1 rounded text-xs sm:text-sm">
                    Total: {notasRedacoes[redacao.id].total ?? 0}/1000
                  </div>
                </div>
              ) : (
                <div className="text-xs sm:text-sm text-muted-foreground italic">
                  Notas ainda não atribuídas
                </div>
              )}
            </div>
          )}
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3 shrink-0" />
            <span className="truncate">
              {new Date(redacao.data_envio).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                ...(isMobile ? {} : { hour: '2-digit', minute: '2-digit' })
              })}
            </span>
          </div>
        </div>
        
        <div className="shrink-0 w-full sm:w-auto">
          {redacao.status_minha_correcao === 'devolvida' ? (
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">
                Status do aluno
              </div>
              <Badge
                variant={verificarSeAlunoVisualizou(redacao) ? "default" : "secondary"}
                className={`text-xs ${verificarSeAlunoVisualizou(redacao) 
                  ? "bg-green-100 text-green-700 border-green-300" 
                  : "bg-gray-100 text-gray-600 border-gray-300"
                }`}
              >
                {verificarSeAlunoVisualizou(redacao) ? "Ciente" : "Não visualizada"}
              </Badge>
            </div>
          ) : (
            <Button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCorrigir(redacao);
              }}
              variant={redacao.status_minha_correcao === 'corrigida' ? 'outline' : 'default'}
              size="sm"
              className="w-full sm:w-auto text-xs sm:text-sm"
              disabled={false}
            >
              {redacao.status_minha_correcao === 'pendente' && 'Corrigir'}
              {redacao.status_minha_correcao === 'em_correcao' && 'Continuar'}
              {redacao.status_minha_correcao === 'incompleta' && 'Continuar'}
              {redacao.status_minha_correcao === 'corrigida' && 'Editar correção'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label>Buscar por nome/email</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Digite nome ou email..."
                  value={buscaNome}
                  onChange={(e) => setBuscaNome(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <Label>Turma</Label>
              <Select value={filtroTurma} onValueChange={setFiltroTurma}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as turmas</SelectItem>
                  {turmasDisponiveis.map(turma => (
                    <SelectItem key={turma} value={turma}>
                      {turma === "Visitante" ? "Visitantes" : turma}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Status</Label>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="pendente">Pendentes</SelectItem>
                  <SelectItem value="incompleta">Incompletas</SelectItem>
                  <SelectItem value="corrigida">Corrigidas</SelectItem>
                  <SelectItem value="devolvida">Devolvidas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Mês/Ano</Label>
              <Select value={filtroMes} onValueChange={setFiltroMes}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os meses</SelectItem>
                  {mesesDisponiveis.map(mes => (
                    <SelectItem key={mes} value={mes}>
                      {mes}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setBuscaNome("");
                  setFiltroTurma("todas");
                  setFiltroStatus("todas");
                  setFiltroMes("todos");
                }}
                className="w-full"
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs com contadores atualizados */}
      <Card>
        <CardContent>
          <Tabs defaultValue="pendentes" className="w-full">
          <TabsList className={`grid w-full ${isMobile ? 'grid-cols-1 gap-1 h-auto' : 'grid-cols-4'}`}>
            <TabsTrigger 
              value="pendentes" 
              className={`flex items-center gap-1 sm:gap-2 text-xs sm:text-sm ${isMobile ? 'justify-start' : 'justify-center'}`}
            >
              <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
              Pendentes ({pendentes.length})
            </TabsTrigger>
            <TabsTrigger 
              value="incompletas" 
              className={`flex items-center gap-1 sm:gap-2 text-xs sm:text-sm ${isMobile ? 'justify-start' : 'justify-center'}`}
            >
              <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
              Incompletas ({incompletas.length})
            </TabsTrigger>
            <TabsTrigger 
              value="corrigidas" 
              className={`flex items-center gap-1 sm:gap-2 text-xs sm:text-sm ${isMobile ? 'justify-start' : 'justify-center'}`}
            >
              <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
              Corrigidas ({corrigidas.length})
            </TabsTrigger>
            <TabsTrigger 
              value="devolvidas" 
              className={`flex items-center gap-1 sm:gap-2 text-xs sm:text-sm ${isMobile ? 'justify-start' : 'justify-center'}`}
            >
              <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
              Devolvidas ({devolvidas.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="pendentes" className="mt-4">
            {pendentes.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
                Nenhuma redação pendente no momento.
              </p>
            ) : (
              <div className="space-y-3">
                {pendentes.map((redacao, index) => (
                  <RedacaoItem key={redacao.id} redacao={redacao} index={index} />
                ))}
              </div>
            )}
          </TabsContent>
          
          
          <TabsContent value="incompletas" className="mt-4">
            {incompletas.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
                Nenhuma correção incompleta.
              </p>
            ) : (
              <div className="space-y-3">
                {incompletas.map((redacao, index) => (
                  <RedacaoItem key={redacao.id} redacao={redacao} index={index} />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="corrigidas" className="mt-4">
            {corrigidas.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
                Nenhuma redação corrigida ainda.
              </p>
            ) : (
              <div className="space-y-3">
                {corrigidas.map((redacao, index) => (
                  <RedacaoItem key={redacao.id} redacao={redacao} index={index} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="devolvidas" className="mt-4">
            {devolvidas.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
                Nenhuma redação devolvida.
              </p>
            ) : (
              <div className="space-y-3">
                {devolvidas.map((redacao, index) => (
                  <RedacaoItem key={redacao.id} redacao={redacao} index={index} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
