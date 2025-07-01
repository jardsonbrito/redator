
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Edit, Trash2, ExternalLink, FileText, Search } from "lucide-react";

interface Aula {
  id: string;
  titulo: string;
  descricao: string;
  modulo: string;
  link_conteudo: string;
  pdf_url?: string;
  pdf_nome?: string;
  turmas_autorizadas: string[];
  permite_visitante: boolean;
  ativo: boolean;
  criado_em: string;
}

export const AulaList = () => {
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [filteredAulas, setFilteredAulas] = useState<Aula[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [moduloFilter, setModuloFilter] = useState("");

  const modulosDisponiveis = [
    'Competência 1',
    'Competência 2',
    'Competência 3',
    'Competência 4',
    'Competência 5',
    'Aula ao vivo'
  ];

  useEffect(() => {
    fetchAulas();
  }, []);

  useEffect(() => {
    filterAulas();
  }, [aulas, searchTerm, moduloFilter]);

  const fetchAulas = async () => {
    try {
      const { data, error } = await supabase
        .from("aulas")
        .select("*")
        .order("criado_em", { ascending: false });

      if (error) throw error;
      setAulas(data || []);
    } catch (error) {
      console.error("Erro ao buscar aulas:", error);
      toast.error("Erro ao carregar aulas");
    } finally {
      setIsLoading(false);
    }
  };

  const filterAulas = () => {
    let filtered = aulas;

    if (searchTerm) {
      filtered = filtered.filter(aula =>
        aula.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        aula.descricao.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (moduloFilter) {
      filtered = filtered.filter(aula => aula.modulo === moduloFilter);
    }

    setFilteredAulas(filtered);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta aula?")) return;

    try {
      const { error } = await supabase
        .from("aulas")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Aula excluída com sucesso!");
      fetchAulas();
    } catch (error) {
      console.error("Erro ao excluir aula:", error);
      toast.error("Erro ao excluir aula");
    }
  };

  const toggleAtivo = async (id: string, ativo: boolean) => {
    try {
      const { error } = await supabase
        .from("aulas")
        .update({ ativo: !ativo })
        .eq("id", id);

      if (error) throw error;

      toast.success(`Aula ${!ativo ? 'ativada' : 'desativada'} com sucesso!`);
      fetchAulas();
    } catch (error) {
      console.error("Erro ao alterar status:", error);
      toast.error("Erro ao alterar status da aula");
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Carregando aulas...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input
                placeholder="Buscar por título ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Select value={moduloFilter} onValueChange={setModuloFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por módulo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os módulos</SelectItem>
                  {modulosDisponiveis.map((modulo) => (
                    <SelectItem key={modulo} value={modulo}>
                      {modulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Aulas */}
      <div className="grid gap-4">
        {filteredAulas.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">Nenhuma aula encontrada.</p>
            </CardContent>
          </Card>
        ) : (
          filteredAulas.map((aula) => (
            <Card key={aula.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {aula.titulo}
                      <Badge variant={aula.ativo ? "default" : "secondary"}>
                        {aula.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </CardTitle>
                    <Badge variant="outline" className="mt-2">
                      {aula.modulo}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(aula.link_conteudo, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                    {aula.pdf_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(aula.pdf_url, '_blank')}
                      >
                        <FileText className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleAtivo(aula.id, aula.ativo)}
                    >
                      {aula.ativo ? "Desativar" : "Ativar"}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(aula.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">{aula.descricao}</p>
                
                <div className="space-y-2">
                  {aula.turmas_autorizadas.length > 0 && (
                    <div>
                      <strong>Turmas Autorizadas:</strong>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {aula.turmas_autorizadas.map((turma) => (
                          <Badge key={turma} variant="secondary" className="text-xs">
                            {turma}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {aula.permite_visitante && (
                    <div>
                      <Badge variant="outline">Permite Visitante</Badge>
                    </div>
                  )}
                  
                  {aula.pdf_nome && (
                    <div>
                      <strong>PDF:</strong> {aula.pdf_nome}
                    </div>
                  )}
                  
                  <div className="text-sm text-gray-500">
                    Criado em: {new Date(aula.criado_em).toLocaleString('pt-BR')}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
