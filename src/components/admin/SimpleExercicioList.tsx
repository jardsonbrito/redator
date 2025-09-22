import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ExercicioForm } from "./ExercicioForm";
import { AdminExerciseCard } from "./AdminExerciseCard";

interface Exercicio {
  id: string;
  titulo: string;
  tipo: string;
  link_forms?: string;
  tema_id?: string;
  imagem_capa_url?: string;
  cover_url?: string;
  cover_upload_url?: string;
  cover_upload_path?: string;
  updated_at?: string;
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
    cover_url?: string;
    cover_file_path?: string;
  };
}

export const SimpleExercicioList = () => {
  const [exercicios, setExercicios] = useState<Exercicio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exercicioEditando, setExercicioEditando] = useState<Exercicio | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchExercicios = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from("exercicios")
        .select(`
          *,
          temas (
            frase_tematica,
            eixo_tematico,
            cover_url,
            cover_file_path
          )
        `)
        .order("criado_em", { ascending: false });

      if (error) throw error;
      
      setExercicios(data || []);
    } catch (err: any) {
      console.error("Erro ao buscar exercícios:", err);
      setError(err.message || "Erro ao carregar exercícios");
      toast.error("Erro ao carregar exercícios");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (exercicio: Exercicio) => {
    if (!confirm("Tem certeza que deseja excluir este exercício?")) return;

    try {
      const { error } = await supabase
        .from("exercicios")
        .delete()
        .eq("id", exercicio.id);

      if (error) throw error;

      toast.success("Exercício excluído com sucesso!");
      fetchExercicios();
    } catch (err: any) {
      console.error("Erro ao excluir exercício:", err);
      toast.error("Erro ao excluir exercício");
    }
  };

  const handleToggleActive = async (exercicio: Exercicio) => {
    try {
      const { error } = await supabase
        .from("exercicios")
        .update({ ativo: !exercicio.ativo })
        .eq("id", exercicio.id);

      if (error) throw error;

      toast.success(`Exercício ${!exercicio.ativo ? 'ativado' : 'desativado'} com sucesso!`);
      fetchExercicios();
    } catch (err: any) {
      console.error("Erro ao alterar status:", err);
      toast.error("Erro ao alterar status do exercício");
    }
  };

  const handleEdit = (exercicio: Exercicio) => {
    setExercicioEditando(exercicio);
    setShowForm(true);
  };

  const handleCancelEdit = () => {
    setExercicioEditando(null);
    setShowForm(false);
  };

  const handleSuccess = () => {
    setExercicioEditando(null);
    setShowForm(false);
    fetchExercicios();
  };

  useEffect(() => {
    fetchExercicios();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p>Carregando exercícios...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-red-500">Erro: {error}</p>
          <Button onClick={fetchExercicios} className="mt-2">
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (showForm) {
    return (
      <div className="space-y-4">
        <ExercicioForm 
          exercicioEditando={exercicioEditando}
          onSuccess={handleSuccess}
          onCancelEdit={handleCancelEdit}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Exercícios Cadastrados</h2>
        <div className="flex gap-2">
          <Button onClick={() => setShowForm(true)} variant="default" size="sm">
            Novo Exercício
          </Button>
          <Button onClick={fetchExercicios} variant="outline" size="sm">
            Atualizar
          </Button>
        </div>
      </div>

      {exercicios.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">Nenhum exercício encontrado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exercicios.map((exercicio) => (
            <AdminExerciseCard
              key={exercicio.id}
              exercicio={exercicio}
              onEdit={handleEdit}
              onToggleActive={handleToggleActive}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};