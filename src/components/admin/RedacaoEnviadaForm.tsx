
import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { useRedacoesEnviadas, RedacaoEnviada } from "@/hooks/useRedacoesEnviadas";
import { RedacaoViewForm } from "./RedacaoViewForm";
import { RedacaoListTable } from "./RedacaoListTable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const RedacaoEnviadaForm = () => {
  const {
    redacoes,
    loading,
    searchTerm,
    setSearchTerm,
    fetchRedacoes,
    handleDeleteRedacao
  } = useRedacoesEnviadas();

  const [selectedRedacao, setSelectedRedacao] = useState<RedacaoEnviada | null>(null);
  
  // Estados dos filtros
  const [filtroTurma, setFiltroTurma] = useState<string>("todas");
  const [filtroStatus, setFiltroStatus] = useState<string>("todas");
  const [filtroCorretor, setFiltroCorretor] = useState<string>("todos");
  const [filtroMes, setFiltroMes] = useState<string>(""); // vazio significa "mês atual"
  const [buscaNome, setBuscaNome] = useState("");

  // Consulta para buscar corretores ativos
  const { data: corretores } = useQuery({
    queryKey: ['corretores-ativos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('corretores')
        .select('*')
        .eq('ativo', true)
        .order('nome_completo');
      
      if (error) throw error;
      return data;
    }
  });

  // Calcular meses disponíveis baseado nas redações
  const mesesDisponiveis = useMemo(() => {
    if (!redacoes.length) return [];
    
    const meses = Array.from(new Set(
      redacoes.map(r => {
        // Garantir que a data seja interpretada corretamente
        const data = new Date(r.data_envio);
        // Usar UTC para evitar problemas de timezone
        const year = data.getUTCFullYear();
        const month = String(data.getUTCMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
      })
    ));
    
    console.log('Meses encontrados nas redações:', meses);
    return meses.sort((a, b) => a.localeCompare(b)); // ordem crescente (mais antigo → mais recente)
  }, [redacoes]);

  // Determinar mês padrão (atual ou mais recente disponível)
  const mesAtual = format(new Date(), 'yyyy-MM');
  const mesDefault = mesesDisponiveis.includes(mesAtual) ? mesAtual : (mesesDisponiveis[mesesDisponiveis.length - 1] || mesAtual);

  // Inicializar filtro de mês se ainda não foi definido
  useEffect(() => {
    if (filtroMes === "" && mesesDisponiveis.length > 0) {
      setFiltroMes(mesDefault);
    }
  }, [filtroMes, mesesDisponiveis, mesDefault]);

  // Filtrar redações baseado nos filtros ativos
  const redacoesFiltradas = redacoes.filter(redacao => {
    const matchNome = buscaNome === "" || 
      redacao.nome_aluno.toLowerCase().includes(buscaNome.toLowerCase()) ||
      redacao.email_aluno.toLowerCase().includes(buscaNome.toLowerCase());
    
    const matchTurma = filtroTurma === "todas" || (() => {
      if (!redacao.turma && (redacao.email_aluno.includes('@gmail') || redacao.email_aluno.includes('@hotmail') || redacao.email_aluno.includes('@yahoo'))) {
        return filtroTurma === 'Visitantes';
      }
      return filtroTurma === redacao.turma;
    })();
    
    const matchStatus = filtroStatus === "todas" || 
      (filtroStatus === "pendentes" && (!redacao.status || redacao.status === 'pendente')) ||
      (filtroStatus === "incompletas" && redacao.status === 'incompleta') ||
      (filtroStatus === "corrigidas" && (redacao.status === 'corrigida' || redacao.corrigida));
    
    const matchCorretor = filtroCorretor === "todos" || 
      redacao.corretor_id_1 === filtroCorretor || 
      redacao.corretor_id_2 === filtroCorretor;

    const matchMes = filtroMes === "todos" || (() => {
      const redacaoData = new Date(redacao.data_envio);
      // Usar UTC para consistência com o cálculo dos meses disponíveis
      const year = redacaoData.getUTCFullYear();
      const month = String(redacaoData.getUTCMonth() + 1).padStart(2, '0');
      const redacaoMes = `${year}-${month}`;
      console.log(`Comparando redação ${redacao.id}: ${redacaoMes} === ${filtroMes}?`, redacaoMes === filtroMes);
      return redacaoMes === filtroMes;
    })();
    
    return matchNome && matchTurma && matchStatus && matchCorretor && matchMes;
  });

  const turmasDisponiveis = ["LRA2025", "LRB2025", "LRC2025", "LRD2025", "LRE2025", "Visitantes"];

  const handleView = (redacao: RedacaoEnviada) => {
    setSelectedRedacao(redacao);
  };

  const handleCancelView = () => {
    setSelectedRedacao(null);
  };

  if (selectedRedacao) {
    return (
      <RedacaoViewForm
        redacao={selectedRedacao}
        onCancel={handleCancelView}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-redator-primary">Redações</h2>
        <Badge variant="outline" className="text-sm">
          {redacoesFiltradas.length} entrada(s) encontrada(s)
        </Badge>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                      {turma}
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
                  <SelectItem value="pendentes">Pendentes</SelectItem>
                  <SelectItem value="incompletas">Incompletas</SelectItem>
                  <SelectItem value="corrigidas">Corrigidas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Corretor</Label>
              <Select value={filtroCorretor} onValueChange={setFiltroCorretor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os corretores</SelectItem>
                  {corretores?.map(corretor => (
                    <SelectItem key={corretor.id} value={corretor.id}>
                      {corretor.nome_completo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Chips mensais para seleção rápida */}
          <div className="flex flex-wrap gap-2 mt-4">
            <Button
              variant={filtroMes === "todos" ? "default" : "outline"}
              size="sm"
              onClick={() => setFiltroMes("todos")}
            >
              Todos os meses
            </Button>
            {mesesDisponiveis.map(mes => (
              <Button
                key={mes}
                variant={filtroMes === mes ? "default" : "outline"}
                size="sm"
                onClick={() => setFiltroMes(mes)}
              >
                {format(new Date(`${mes}-01`), 'LLLL', { locale: ptBR })}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabela de redações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Visualização Gerencial
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Carregando redações...</div>
          ) : redacoesFiltradas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {buscaNome || filtroTurma !== "todas" || filtroStatus !== "todas" || filtroCorretor !== "todos" || (filtroMes !== "todos" && filtroMes !== "") ? 
                "Nenhuma redação encontrada com os critérios de busca." : 
                "Nenhuma redação enviada ainda."}
            </div>
          ) : (
            <RedacaoListTable
              redacoes={redacoesFiltradas}
              onView={handleView}
              onDelete={(redacao) => handleDeleteRedacao(redacao.id)}
              onRefresh={fetchRedacoes}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};
