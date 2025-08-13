
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Edit, Trash2, ExternalLink, Search, FileText } from "lucide-react";
import { ExerciseCard } from "@/components/ui/exercise-card";
import { ExercicioForm } from "./ExercicioForm";

interface Exercicio {
  id: string;
  titulo: string;
  tipo: string;
  link_forms?: string;
  tema_id?: string;
  imagem_capa_url?: string;
  cover_url?: string;
  cover_upload_path?: string;
  turmas_autorizadas: string[] | null;
  permite_visitante: boolean;
  ativo: boolean;
  criado_em: string;
  data_inicio?: string;
  hora_inicio?: string;
  data_fim?: string;
  hora_fim?: string;
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
  const [editingExercise, setEditingExercise] = useState<Exercicio | null>(null);

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
      console.log('🔍 Buscando exercícios...');
      const { data, error } = await supabase
        .from("exercicios")
        .select(`
          *,
          temas (
            frase_tematica,
            eixo_tematico
          )
        `)
        .order("criado_em", { ascending: false });

      console.log('✅ Dados recebidos:', data);
      console.log('❌ Erro:', error);

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
      const { error } = await supabase
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
      const { error } = await supabase
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
      {/* Formulário de Edição */}
      {editingExercise && (
        <ExercicioForm
          exercicioEditando={editingExercise}
          onSuccess={() => {
            setEditingExercise(null);
            fetchExercicios();
          }}
          onCancelEdit={() => setEditingExercise(null)}
        />
      )}

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
      <div className="space-y-6">
        {filteredExercicios.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">Nenhum exercício encontrado.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredExercicios.map((exercicio) => (
              <ExerciseCard
                key={exercicio.id}
                exercise={exercicio}
                isAdmin={true}
                onEdit={setEditingExercise}
                onDelete={handleDelete}
                onToggleStatus={toggleAtivo}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
