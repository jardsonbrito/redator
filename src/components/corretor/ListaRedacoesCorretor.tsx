
import { useState, useMemo } from "react";
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

interface ListaRedacoesCorretorProps {
  corretorEmail: string;
  onCorrigir: (redacao: RedacaoCorretor) => void;
}

export const ListaRedacoesCorretor = ({ corretorEmail, onCorrigir }: ListaRedacoesCorretorProps) => {
  const { loading, redacoes, getRedacoesPorStatus } = useCorretorRedacoes(corretorEmail);
  const isMobile = useIsMobile();
  
  // Estados dos filtros
  const [buscaNome, setBuscaNome] = useState("");
  const [filtroTurma, setFiltroTurma] = useState("todas");
  const [filtroStatus, setFiltroStatus] = useState("todas");
  const [filtroMes, setFiltroMes] = useState("todos");

  // Lista fixa de todas as turmas do sistema
  const turmasDisponiveis = useMemo(() => {
    return ['Turma A', 'Turma B', 'Turma C', 'Turma D', 'Turma E', 'Visitantes'];
  }, []);

  // Extrair meses/anos únicos das redações
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
      // Filtro por nome/email
      const matchNome = buscaNome === "" || 
        redacao.nome_aluno.toLowerCase().includes(buscaNome.toLowerCase()) ||
        redacao.email_aluno.toLowerCase().includes(buscaNome.toLowerCase());

      // Filtro por turma
      const matchTurma = filtroTurma === "todas" || (() => {
        // Se não tem turma específica e email é de domínio público, considerar visitante
        if (!redacao.turma && (redacao.email_aluno.includes('@gmail') || redacao.email_aluno.includes('@hotmail') || redacao.email_aluno.includes('@yahoo'))) {
          return filtroTurma === 'Visitantes';
        }
        // Comparar com a turma real da redação
        return filtroTurma === redacao.turma;
      })();

      // Filtro por status
      const matchStatus = filtroStatus === "todas" || redacao.status_minha_correcao === filtroStatus;

      // Filtro por mês
      const matchMes = filtroMes === "todos" || (() => {
        const data = new Date(redacao.data_envio);
        const mes = data.toLocaleDateString('pt-BR', { month: 'long' });
        const ano = data.getFullYear().toString().slice(-2);
        return `${mes}/${ano}` === filtroMes;
      })();

      return matchNome && matchTurma && matchStatus && matchMes;
    });
  }, [redacoes, buscaNome, filtroTurma, filtroStatus, filtroMes]);

  // Função para obter redações por status com base nas redações filtradas
  const getRedacoesFiltradas = () => {
    const pendentes = redacoesFiltradas.filter(r => r.status_minha_correcao === 'pendente');
    const incompletas = redacoesFiltradas.filter(r => r.status_minha_correcao === 'incompleta');
    const corrigidas = redacoesFiltradas.filter(r => r.status_minha_correcao === 'corrigida');
    return { pendentes, incompletas, corrigidas };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const { pendentes, incompletas, corrigidas } = getRedacoesFiltradas();

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
          <Button
            onClick={() => onCorrigir(redacao)}
            variant={redacao.status_minha_correcao === 'corrigida' ? 'outline' : 'default'}
            size="sm"
            className="w-full sm:w-auto text-xs sm:text-sm"
          >
            {redacao.status_minha_correcao === 'pendente' && 'Corrigir'}
            {redacao.status_minha_correcao === 'em_correcao' && 'Continuar'}
            {redacao.status_minha_correcao === 'incompleta' && 'Continuar'}
            {redacao.status_minha_correcao === 'corrigida' && 'Ver correção'}
          </Button>
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
          <TabsList className={`grid w-full ${isMobile ? 'grid-cols-1 gap-1 h-auto' : 'grid-cols-3'}`}>
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
        </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
