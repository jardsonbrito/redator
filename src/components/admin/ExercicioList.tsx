
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Edit, Trash2, ExternalLink, Search, FileText } from "lucide-react";

interface Exercicio {
  id: string;
  titulo: string;
  tipo: string;
  link_forms?: string;
  tema_id?: string;
  imagem_capa_url?: string;
  turmas_autorizadas: string[];
  permite_visitante: boolean;
  ativo: boolean;
  criado_em: string;
  temas?: {
    frase_tematica: string;
    eixo_tematico: string;
  };
}

export const ExercicioList = () => {
  const [exercicios, setExercicios] = useState<Exercicio[]>([]);
  const [filteredExercicios, setFilteredExercicios] = useState<Exercicio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFilter, setTipoFilter] = useState("");

  const tiposDisponiveis = [
    'Google Forms',
    'Redação com Frase Temática'
  ];

  useEffect(() => {
    fetchExercicios();
  }, []);

  useEffect(() => {
    filterExercicios();
  }, [exercicios, searchTerm, tipoFilter]);

  const fetchExercicios = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("exercicios")
        .select(`
          *,
          temas (
            frase_tematica,
            eixo_tematico
          )
        `)
        .order("criado_em", { ascending: false });

      if (error) throw error;
      setExercicios(data || []);
    } catch (error) {
      console.error("Erro ao buscar exercícios:", error);
      toast.error("Erro ao carregar exercícios");
    } finally {
      setIsLoading(false);
    }
  };

  const filterExercicios = () => {
    let filtered = exercicios;

    if (searchTerm) {
      filtered = filtered.filter(exercicio =>
        exercicio.titulo.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (tipoFilter) {
      filtered = filtered.filter(exercicio => exercicio.tipo === tipoFilter);
    }

    setFilteredExercicios(filtered);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este exercício?")) return;

    try {
      const { error } = await (supabase as any)
        .from("exercicios")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Exercício excluído com sucesso!");
      fetchExercicios();
    } catch (error) {
      console.error("Erro ao excluir exercício:", error);
      toast.error("Erro ao excluir exercício");
    }
  };

  const toggleAtivo = async (id: string, ativo: boolean) => {
    try {
      const { error } = await (supabase as any)
        .from("exercicios")
        .update({ ativo: !ativo })
        .eq("id", id);

      if (error) throw error;

      toast.success(`Exercício ${!ativo ? 'ativado' : 'desativado'} com sucesso!`);
      fetchExercicios();
    } catch (error) {
      console.error("Erro ao alterar status:", error);
      toast.error("Erro ao alterar status do exercício");
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Carregando exercícios...</div>;
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
                placeholder="Buscar por título..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Select value={tipoFilter} onValueChange={setTipoFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os tipos</SelectItem>
                  {tiposDisponiveis.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Exercícios */}
      <div className="grid gap-4">
        {filteredExercicios.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">Nenhum exercício encontrado.</p>
            </CardContent>
          </Card>
        ) : (
          filteredExercicios.map((exercicio) => (
            <Card key={exercicio.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {exercicio.titulo}
                      <Badge variant={exercicio.ativo ? "default" : "secondary"}>
                        {exercicio.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </CardTitle>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline">
                        {exercicio.tipo}
                      </Badge>
                      {exercicio.temas && (
                        <Badge variant="secondary">
                          {exercicio.temas.eixo_tematico}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {exercicio.link_forms && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(exercicio.link_forms, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}
                    {exercicio.imagem_capa_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(exercicio.imagem_capa_url, '_blank')}
                      >
                        <FileText className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleAtivo(exercicio.id, exercicio.ativo)}
                    >
                      {exercicio.ativo ? "Desativar" : "Ativar"}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(exercicio.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {exercicio.temas && (
                    <div>
                      <strong>Tema:</strong> {exercicio.temas.frase_tematica}
                    </div>
                  )}
                  
                  {exercicio.turmas_autorizadas.length > 0 && (
                    <div>
                      <strong>Turmas Autorizadas:</strong>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {exercicio.turmas_autorizadas.map((turma) => (
                          <Badge key={turma} variant="secondary" className="text-xs">
                            {turma}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {exercicio.permite_visitante && (
                    <div>
                      <Badge variant="outline">Permite Visitante</Badge>
                    </div>
                  )}
                  
                  <div className="text-sm text-gray-500">
                    Criado em: {new Date(exercicio.criado_em).toLocaleString('pt-BR')}
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
