import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, ExternalLink, FileText, Edit } from "lucide-react";
import { ExercicioForm } from "./ExercicioForm";

interface Exercicio {
  id: string;
  titulo: string;
  tipo: string;
  link_forms: string | null;
  tema_id: string | null;
  imagem_capa_url: string | null;
  turmas_autorizadas: string[] | null;
  permite_visitante: boolean | null;
  ativo: boolean | null;
  criado_em: string | null;
  abrir_aba_externa: boolean | null;
  temas?: {
    frase_tematica: string;
    eixo_tematico: string;
  } | null;
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
            eixo_tematico
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
    } catch (err: any) {
      console.error("Erro ao excluir exercício:", err);
      toast.error("Erro ao excluir exercício");
    }
  };

  const toggleAtivo = async (id: string, ativo: boolean | null) => {
    try {
      const { error } = await supabase
        .from("exercicios")
        .update({ ativo: !ativo })
        .eq("id", id);

      if (error) throw error;

      toast.success(`Exercício ${!ativo ? 'ativado' : 'desativado'} com sucesso!`);
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
            <p className="text-gray-500">Nenhum exercício encontrado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {exercicios.map((exercicio) => (
            <Card key={exercicio.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      {exercicio.titulo}
                      <Badge variant={exercicio.ativo ? "default" : "secondary"}>
                        {exercicio.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </CardTitle>
                    <div className="flex gap-2 mt-1">
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
                        onClick={() => window.open(exercicio.link_forms!, '_blank')}
                        title="Abrir formulário"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}
                    {exercicio.imagem_capa_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(exercicio.imagem_capa_url!, '_blank')}
                        title="Ver imagem"
                      >
                        <FileText className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(exercicio)}
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
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
                    <div className="text-sm">
                      <strong>Tema:</strong> {exercicio.temas.frase_tematica}
                    </div>
                  )}
                  
                  {exercicio.turmas_autorizadas && exercicio.turmas_autorizadas.length > 0 && (
                    <div>
                      <strong className="text-sm">Turmas Autorizadas:</strong>
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
                    <Badge variant="outline" className="text-xs">
                      Permite Visitante
                    </Badge>
                  )}
                  
                  {exercicio.tipo === 'Google Forms' && !exercicio.abrir_aba_externa && (
                    <Badge variant="outline" className="text-xs">
                      Abre Embutido
                    </Badge>
                  )}
                  
                  {exercicio.tipo === 'Google Forms' && exercicio.abrir_aba_externa && (
                    <Badge variant="outline" className="text-xs">
                      Abre em Nova Aba
                    </Badge>
                  )}
                  
                  {exercicio.criado_em && (
                    <div className="text-xs text-gray-500">
                      Criado em: {new Date(exercicio.criado_em).toLocaleString('pt-BR')}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};