import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Download, Calendar, Clock, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface FrequenciaData {
  id: string;
  nome_completo: string;
  turma: string;
  aula_titulo: string;
  data_aula: string;
  horario_entrada: string | null;
  horario_saida: string | null;
  tempo_total: number | null;
  situacao: 'completa' | 'incompleta' | 'ausente';
}

interface AulaVirtual {
  id: string;
  titulo: string;
  data_aula: string;
}

export const FrequenciaAulas = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const [frequencias, setFrequencias] = useState<FrequenciaData[]>([]);
  const [aulas, setAulas] = useState<AulaVirtual[]>([]);
  const [filteredData, setFilteredData] = useState<FrequenciaData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [filters, setFilters] = useState({
    turma: "",
    aula: "",
    dataInicio: "",
    dataFim: "",
    searchTerm: ""
  });

  const turmasDisponiveis = ["Turma A", "Turma B", "Turma C", "Turma D", "Turma E", "visitante"];

  const fetchAulas = async () => {
    try {
      console.log('🔍 Buscando aulas virtuais...');
      const { data, error } = await supabase
        .from('aulas_virtuais')
        .select('id, titulo, data_aula')
        .order('data_aula', { ascending: false });

      if (error) throw error;
      console.log('✅ Aulas carregadas:', data?.length || 0);
      setAulas(data || []);
    } catch (error: any) {
      console.error('❌ Erro ao buscar aulas:', error);
    }
  };

  const fetchFrequencias = async () => {
    try {
      setIsLoading(true);
      console.log('🔍 Buscando dados de frequência...');
      
      // Buscar todas as aulas virtuais
      const { data: aulasData, error: aulasError } = await supabase
        .from('aulas_virtuais')
        .select('id, titulo, data_aula');

      if (aulasError) throw aulasError;
      console.log('✅ Aulas encontradas:', aulasData?.length || 0);

      // Buscar todos os registros de presença
      const { data: presencaData, error: presencaError } = await supabase
        .from('presenca_aulas')
        .select(`
          id,
          aula_id,
          nome_aluno,
          sobrenome_aluno,
          turma,
          tipo_registro,
          data_registro
        `);

      if (presencaError) throw presencaError;
      console.log('✅ Registros de presença encontrados:', presencaData?.length || 0);

      // Processar dados para criar relatório de frequência
      const frequenciaMap = new Map<string, any>();

      // Agrupar registros por aluno e aula
      (presencaData || []).forEach((registro) => {
        const key = `${registro.aula_id}-${registro.nome_aluno}-${registro.sobrenome_aluno}-${registro.turma}`;
        
        if (!frequenciaMap.has(key)) {
          frequenciaMap.set(key, {
            aula_id: registro.aula_id,
            nome_completo: `${registro.nome_aluno} ${registro.sobrenome_aluno}`,
            turma: registro.turma,
            entrada: null,
            saida: null
          });
        }

        const item = frequenciaMap.get(key);
        if (registro.tipo_registro === 'entrada') {
          item.entrada = registro.data_registro;
        } else if (registro.tipo_registro === 'saida') {
          item.saida = registro.data_registro;
        }
      });

      // Converter para array e adicionar informações da aula
      const frequenciaArray: FrequenciaData[] = Array.from(frequenciaMap.values()).map((item) => {
        const aula = (aulasData || []).find(a => a.id === item.aula_id);
        let situacao: 'completa' | 'incompleta' | 'ausente' = 'ausente';
        let tempoTotal = null;

        if (item.entrada && item.saida) {
          situacao = 'completa';
          const entrada = new Date(item.entrada);
          const saida = new Date(item.saida);
          tempoTotal = Math.round((saida.getTime() - entrada.getTime()) / (1000 * 60)); // minutos
        } else if (item.entrada || item.saida) {
          situacao = 'incompleta';
        }

        return {
          id: `${item.aula_id}-${item.nome_completo}`,
          nome_completo: item.nome_completo,
          turma: item.turma,
          aula_titulo: aula?.titulo || 'Aula não encontrada',
          data_aula: aula?.data_aula || '',
          horario_entrada: item.entrada ? new Date(item.entrada).toLocaleTimeString('pt-BR') : null,
          horario_saida: item.saida ? new Date(item.saida).toLocaleTimeString('pt-BR') : null,
          tempo_total: tempoTotal,
          situacao
        };
      });

      console.log('✅ Dados processados:', frequenciaArray.length, 'registros');
      setFrequencias(frequenciaArray);
      setFilteredData(frequenciaArray);
    } catch (error: any) {
      console.error('❌ Erro ao buscar frequências:', error);
      console.error('❌ Detalhes do erro:', {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code
      });
      toast.error(`Erro ao carregar dados de frequência: ${error?.message || 'Erro desconhecido'}`);
      // Não fazer logout automático em caso de erro
      setFrequencias([]);
      setFilteredData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = () => {
    const csvContent = [
      'Nome Completo,Turma,Aula,Data,Entrada,Saída,Tempo Total (min),Situação',
      ...filteredData.map(item => 
        `"${item.nome_completo}","${item.turma}","${item.aula_titulo}","${new Date(item.data_aula).toLocaleDateString('pt-BR')}","${item.horario_entrada || ''}","${item.horario_saida || ''}","${item.tempo_total || ''}","${item.situacao}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `frequencia_aulas_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getSituacaoBadge = (situacao: string) => {
    switch (situacao) {
      case 'completa':
        return <Badge className="bg-green-100 text-green-800">✅ Presente</Badge>;
      case 'incompleta':
        return <Badge variant="secondary">⚠️ Incompleta</Badge>;
      case 'ausente':
        return <Badge variant="destructive">❌ Ausente</Badge>;
      default:
        return <Badge variant="outline">{situacao}</Badge>;
    }
  };

  useEffect(() => {
    let filtered = frequencias;

    if (filters.turma) {
      filtered = filtered.filter(item => item.turma === filters.turma);
    }

    if (filters.aula) {
      filtered = filtered.filter(item => item.aula_titulo.includes(filters.aula));
    }

    if (filters.dataInicio) {
      filtered = filtered.filter(item => 
        new Date(item.data_aula) >= new Date(filters.dataInicio)
      );
    }

    if (filters.dataFim) {
      filtered = filtered.filter(item => 
        new Date(item.data_aula) <= new Date(filters.dataFim + 'T23:59:59')
      );
    }

    if (filters.searchTerm) {
      filtered = filtered.filter(item => 
        item.nome_completo.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        item.aula_titulo.toLowerCase().includes(filters.searchTerm.toLowerCase())
      );
    }

    setFilteredData(filtered);
  }, [frequencias, filters]);

  useEffect(() => {
    // Só executa quando não está carregando a autenticação E é admin
    if (!authLoading && isAdmin) {
      fetchAulas();
      fetchFrequencias();
    } else if (!authLoading && !isAdmin) {
      // Se não está carregando e não é admin, finaliza o loading
      setIsLoading(false);
    }
  }, [isAdmin, authLoading]);

  // Aguarda carregamento da autenticação antes de decidir o que mostrar
  if (authLoading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-2">Verificando permissões...</p>
        </CardContent>
      </Card>
    );
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Acesso restrito para administradores</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-2">Carregando frequências...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Frequência das Aulas ({filteredData.length} registros)
          </span>
          <div className="flex gap-2">
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
            <Button onClick={fetchFrequencias} variant="outline" size="sm">
              Atualizar
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou aula..."
              value={filters.searchTerm}
              onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
              className="pl-10"
            />
          </div>
          
          <Select value={filters.turma} onValueChange={(value) => setFilters(prev => ({ ...prev, turma: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por turma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas as turmas</SelectItem>
              {turmasDisponiveis.map(turma => (
                <SelectItem key={turma} value={turma}>{turma}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.aula} onValueChange={(value) => setFilters(prev => ({ ...prev, aula: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por aula" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas as aulas</SelectItem>
              {aulas.map(aula => (
                <SelectItem key={aula.id} value={aula.titulo}>{aula.titulo}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              placeholder="Data início"
              value={filters.dataInicio}
              onChange={(e) => setFilters(prev => ({ ...prev, dataInicio: e.target.value }))}
              className="pl-10"
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              placeholder="Data fim"
              value={filters.dataFim}
              onChange={(e) => setFilters(prev => ({ ...prev, dataFim: e.target.value }))}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tabela */}
        {filteredData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-8 h-8 mx-auto mb-2" />
            <p>Nenhum registro de frequência encontrado</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome Completo</TableHead>
                  <TableHead>Turma</TableHead>
                  <TableHead>Aula</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Entrada</TableHead>
                  <TableHead>Saída</TableHead>
                  <TableHead>Tempo Total</TableHead>
                  <TableHead>Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item) => (
                  <TableRow key={item.id}>
                     <TableCell className="font-medium">{item.nome_completo}</TableCell>
                    <TableCell>
                      <Badge variant={item.turma === 'visitante' ? 'secondary' : 'outline'}>
                        {item.turma === 'visitante' ? '👤 Visitante' : item.turma}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {item.aula_titulo}
                    </TableCell>
                    <TableCell>
                      {new Date(item.data_aula).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      {item.horario_entrada ? (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.horario_entrada}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.horario_saida ? (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.horario_saida}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.tempo_total !== null ? (
                        <span className="font-mono">
                          {Math.floor(item.tempo_total / 60)}h {item.tempo_total % 60}min
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {getSituacaoBadge(item.situacao)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};