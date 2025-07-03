import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Filter, Trash2, Download } from "lucide-react";

interface RadarDado {
  id: string;
  nome_aluno: string;
  email_aluno: string;
  turma: string;
  titulo_exercicio: string;
  data_realizacao: string;
  nota: number | null;
  importado_em: string;
}

export const RadarList = () => {
  const [dados, setDados] = useState<RadarDado[]>([]);
  const [filteredDados, setFilteredDados] = useState<RadarDado[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [turmaFilter, setTurmaFilter] = useState("all");
  const [exercicioFilter, setExercicioFilter] = useState("all");
  const [sortBy, setSortBy] = useState("data");

  const fetchDados = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('radar_dados')
        .select('*')
        .order('data_realizacao', { ascending: false });

      if (error) throw error;
      setDados(data || []);
      setFilteredDados(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar dados do radar');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return;

    try {
      const { error } = await supabase
        .from('radar_dados')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Registro excluído com sucesso!');
      fetchDados();
    } catch (error: any) {
      console.error('Erro ao excluir:', error);
      toast.error('Erro ao excluir registro');
    }
  };

  const exportToCSV = () => {
    const csvContent = [
      'Nome,Email,Turma,Exercício,Data,Nota,Importado em',
      ...filteredDados.map(dado => 
        `"${dado.nome_aluno}","${dado.email_aluno}","${dado.turma}","${dado.titulo_exercicio}","${dado.data_realizacao}","${dado.nota || ''}","${new Date(dado.importado_em).toLocaleString('pt-BR')}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `radar_dados_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  useEffect(() => {
    let filtered = dados;

    // Filtro por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(dado => 
        dado.nome_aluno.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dado.email_aluno.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dado.titulo_exercicio.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por turma
    if (turmaFilter !== "all") {
      filtered = filtered.filter(dado => dado.turma === turmaFilter);
    }

    // Filtro por exercício
    if (exercicioFilter !== "all") {
      filtered = filtered.filter(dado => dado.titulo_exercicio === exercicioFilter);
    }

    // Ordenação
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "nome":
          return a.nome_aluno.localeCompare(b.nome_aluno);
        case "nota":
          return (b.nota || 0) - (a.nota || 0);
        case "turma":
          return a.turma.localeCompare(b.turma);
        default:
          return new Date(b.data_realizacao).getTime() - new Date(a.data_realizacao).getTime();
      }
    });

    setFilteredDados(filtered);
  }, [dados, searchTerm, turmaFilter, exercicioFilter, sortBy]);

  useEffect(() => {
    fetchDados();
  }, []);

  const turmasUnicas = [...new Set(dados.map(d => d.turma))];
  const exerciciosUnicos = [...new Set(dados.map(d => d.titulo_exercicio))];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-2">Carregando dados...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Dados do Radar ({filteredDados.length} registros)</span>
          <div className="flex gap-2">
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
            <Button onClick={fetchDados} variant="outline" size="sm">
              Atualizar
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email ou exercício..."
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
                <SelectItem key={turma} value={turma}>{turma}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={exercicioFilter} onValueChange={setExercicioFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por exercício" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os exercícios</SelectItem>
              {exerciciosUnicos.map(exercicio => (
                <SelectItem key={exercicio} value={exercicio}>{exercicio}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger>
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="data">Data (mais recente)</SelectItem>
              <SelectItem value="nome">Nome (A-Z)</SelectItem>
              <SelectItem value="nota">Nota (maior)</SelectItem>
              <SelectItem value="turma">Turma (A-Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabela */}
        {filteredDados.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Filter className="w-8 h-8 mx-auto mb-2" />
            <p>Nenhum registro encontrado</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Turma</TableHead>
                  <TableHead>Exercício</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Nota</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDados.map((dado) => (
                  <TableRow key={dado.id}>
                    <TableCell className="font-medium">{dado.nome_aluno}</TableCell>
                    <TableCell>{dado.email_aluno}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{dado.turma}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {dado.titulo_exercicio}
                    </TableCell>
                    <TableCell>
                      {new Date(dado.data_realizacao).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      {dado.nota !== null ? (
                        <Badge variant="outline">{dado.nota}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(dado.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
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