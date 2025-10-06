import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Download, Calendar } from "lucide-react";
import { TODAS_TURMAS, formatTurmaDisplay } from "@/utils/turmaUtils";

interface RedacaoCorrigida {
  id: string;
  nome_aluno: string;
  email_aluno: string;
  turma: string;
  frase_tematica: string;
  tipo_envio: string;
  data_envio: string;
  nota_total: number | null;
  nota_c1: number | null;
  nota_c2: number | null;
  nota_c3: number | null;
  nota_c4: number | null;
  nota_c5: number | null;
}

export const RadarRedacoes = () => {
  const [redacoes, setRedacoes] = useState<RedacaoCorrigida[]>([]);
  const [filteredRedacoes, setFilteredRedacoes] = useState<RedacaoCorrigida[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [turmaFilter, setTurmaFilter] = useState("all");
  const [tipoFilter, setTipoFilter] = useState("all");
  const [notaMinFilter, setNotaMinFilter] = useState("");
  const [notaMaxFilter, setNotaMaxFilter] = useState("");
  const [dataInicioFilter, setDataInicioFilter] = useState("");
  const [dataFimFilter, setDataFimFilter] = useState("");
  const [sortBy, setSortBy] = useState<keyof RedacaoCorrigida>("data_envio");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const fetchRedacoes = async () => {
    try {
      setIsLoading(true);
      
      // Buscar redações enviadas (regulares e visitantes)
      const { data: redacoesEnviadas, error: errorEnviadas } = await supabase
        .from('redacoes_enviadas')
        .select('*')
        .eq('corrigida', true);

      // Buscar redações de simulado
      const { data: redacoesSimulado, error: errorSimulado } = await supabase
        .from('redacoes_simulado')
        .select('*')
        .eq('corrigida', true);

      // Buscar redações de exercício
      const { data: redacoesExercicio, error: errorExercicio } = await supabase
        .from('redacoes_exercicio')
        .select('*')
        .eq('corrigida', true);

      if (errorEnviadas || errorSimulado || errorExercicio) {
        throw new Error('Erro ao buscar redações');
      }

      // Normalizar dados
      const todasRedacoes: RedacaoCorrigida[] = [
        ...(redacoesEnviadas || []).map(r => ({
          id: r.id,
          nome_aluno: r.nome_aluno || 'Não informado',
          email_aluno: r.email_aluno || 'Não informado',
          turma: r.turma || 'Não informado',
          frase_tematica: r.frase_tematica,
          tipo_envio: r.tipo_envio || 'regular',
          data_envio: r.data_envio,
          nota_total: r.nota_total,
          nota_c1: r.nota_c1,
          nota_c2: r.nota_c2,
          nota_c3: r.nota_c3,
          nota_c4: r.nota_c4,
          nota_c5: r.nota_c5,
        })),
        ...(redacoesSimulado || []).map(r => ({
          id: r.id,
          nome_aluno: r.nome_aluno,
          email_aluno: r.email_aluno,
          turma: r.turma,
          frase_tematica: `Simulado: ${r.texto?.substring(0, 50)}...`,
          tipo_envio: 'simulado',
          data_envio: r.data_envio,
          nota_total: r.nota_total,
          nota_c1: r.nota_c1,
          nota_c2: r.nota_c2,
          nota_c3: r.nota_c3,
          nota_c4: r.nota_c4,
          nota_c5: r.nota_c5,
        })),
        ...(redacoesExercicio || []).map(r => ({
          id: r.id,
          nome_aluno: r.nome_aluno,
          email_aluno: r.email_aluno,
          turma: r.turma || 'Não informado',
          frase_tematica: 'Exercício de redação',
          tipo_envio: 'exercicio',
          data_envio: r.data_envio || new Date().toISOString(),
          nota_total: r.nota_total,
          nota_c1: r.nota_c1,
          nota_c2: r.nota_c2,
          nota_c3: r.nota_c3,
          nota_c4: r.nota_c4,
          nota_c5: r.nota_c5,
        }))
      ];

      setRedacoes(todasRedacoes);
      setFilteredRedacoes(todasRedacoes);
    } catch (error: any) {
      console.error('Erro ao buscar redações:', error);
      toast.error('Erro ao carregar redações corrigidas');
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = () => {
    const csvContent = [
      'Nome,Email,Turma,Frase Temática,Tipo de Envio,Data de Envio,Nota Total,C1,C2,C3,C4,C5',
      ...filteredRedacoes.map(redacao => 
        `"${redacao.nome_aluno}","${redacao.email_aluno}","${redacao.turma}","${redacao.frase_tematica}","${redacao.tipo_envio}","${new Date(redacao.data_envio).toLocaleString('pt-BR')}","${redacao.nota_total || ''}","${redacao.nota_c1 || ''}","${redacao.nota_c2 || ''}","${redacao.nota_c3 || ''}","${redacao.nota_c4 || ''}","${redacao.nota_c5 || ''}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `redacoes_corrigidas_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleSort = (field: keyof RedacaoCorrigida) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  useEffect(() => {
    let filtered = redacoes;

    // Filtro por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(redacao => 
        redacao.nome_aluno.toLowerCase().includes(searchTerm.toLowerCase()) ||
        redacao.email_aluno.toLowerCase().includes(searchTerm.toLowerCase()) ||
        redacao.frase_tematica.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por turma
    if (turmaFilter !== "all") {
      filtered = filtered.filter(redacao => redacao.turma === turmaFilter);
    }

    // Filtro por tipo
    if (tipoFilter !== "all") {
      filtered = filtered.filter(redacao => redacao.tipo_envio === tipoFilter);
    }

    // Filtro por nota mínima
    if (notaMinFilter) {
      const notaMin = parseInt(notaMinFilter);
      filtered = filtered.filter(redacao => (redacao.nota_total || 0) >= notaMin);
    }

    // Filtro por nota máxima
    if (notaMaxFilter) {
      const notaMax = parseInt(notaMaxFilter);
      filtered = filtered.filter(redacao => (redacao.nota_total || 0) <= notaMax);
    }

    // Filtro por data de início
    if (dataInicioFilter) {
      filtered = filtered.filter(redacao => 
        new Date(redacao.data_envio) >= new Date(dataInicioFilter)
      );
    }

    // Filtro por data de fim
    if (dataFimFilter) {
      filtered = filtered.filter(redacao => 
        new Date(redacao.data_envio) <= new Date(dataFimFilter + 'T23:59:59')
      );
    }

    // Ordenação
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (sortBy === 'data_envio') {
        aValue = new Date(aValue as string).getTime();
        bValue = new Date(bValue as string).getTime();
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === "asc" 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortOrder === "asc" 
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });

    setFilteredRedacoes(filtered);
  }, [redacoes, searchTerm, turmaFilter, tipoFilter, notaMinFilter, notaMaxFilter, dataInicioFilter, dataFimFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchRedacoes();
  }, []);

  // Filtrar turmas que existem nas redações
  const turmasUnicas = TODAS_TURMAS.filter(turma =>
    redacoes.some(r => r.turma === turma)
  );
  const tiposUnicos = [...new Set(redacoes.map(r => r.tipo_envio))];

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'regular': return 'Regular';
      case 'simulado': return 'Simulado';
      case 'exercicio': return 'Exercício';
      case 'visitante': return 'Visitante';
      default: return tipo;
    }
  };

  const getTipoBadgeVariant = (tipo: string) => {
    switch (tipo) {
      case 'simulado': return 'default';
      case 'exercicio': return 'secondary';
      case 'visitante': return 'outline';
      default: return 'outline';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-2">Carregando redações...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Redações Corrigidas ({filteredRedacoes.length} registros)</span>
          <div className="flex gap-2">
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
            <Button onClick={fetchRedacoes} variant="outline" size="sm">
              Atualizar
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={turmaFilter} onValueChange={setTurmaFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por turma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as turmas</SelectItem>
              {turmasUnicas.map(turma => (
                <SelectItem key={turma} value={turma}>{formatTurmaDisplay(turma)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {tiposUnicos.map(tipo => (
                <SelectItem key={tipo} value={tipo}>{getTipoLabel(tipo)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Nota mín"
              value={notaMinFilter}
              onChange={(e) => setNotaMinFilter(e.target.value)}
              className="w-20"
            />
            <Input
              type="number"
              placeholder="Nota máx"
              value={notaMaxFilter}
              onChange={(e) => setNotaMaxFilter(e.target.value)}
              className="w-20"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              placeholder="Data início"
              value={dataInicioFilter}
              onChange={(e) => setDataInicioFilter(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              placeholder="Data fim"
              value={dataFimFilter}
              onChange={(e) => setDataFimFilter(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tabela */}
        {filteredRedacoes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="w-8 h-8 mx-auto mb-2" />
            <p>Nenhuma redação corrigida encontrada</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('nome_aluno')}
                  >
                    Nome {sortBy === 'nome_aluno' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('turma')}
                  >
                    Turma {sortBy === 'turma' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead>Frase Temática</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('data_envio')}
                  >
                    Data {sortBy === 'data_envio' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('nota_total')}
                  >
                    Total {sortBy === 'nota_total' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead>C1</TableHead>
                  <TableHead>C2</TableHead>
                  <TableHead>C3</TableHead>
                  <TableHead>C4</TableHead>
                  <TableHead>C5</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRedacoes.map((redacao) => (
                  <TableRow key={redacao.id}>
                    <TableCell className="font-medium">{redacao.nome_aluno}</TableCell>
                    <TableCell>{redacao.email_aluno}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{formatTurmaDisplay(redacao.turma)}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {redacao.frase_tematica}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getTipoBadgeVariant(redacao.tipo_envio)}>
                        {getTipoLabel(redacao.tipo_envio)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(redacao.data_envio).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      {redacao.nota_total !== null ? (
                        <Badge variant="outline" className="font-mono">
                          {redacao.nota_total}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-mono">
                        {redacao.nota_c1 !== null ? redacao.nota_c1 : '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-mono">
                        {redacao.nota_c2 !== null ? redacao.nota_c2 : '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-mono">
                        {redacao.nota_c3 !== null ? redacao.nota_c3 : '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-mono">
                        {redacao.nota_c4 !== null ? redacao.nota_c4 : '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-mono">
                        {redacao.nota_c5 !== null ? redacao.nota_c5 : '-'}
                      </span>
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