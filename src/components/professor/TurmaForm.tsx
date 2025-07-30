import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Users } from "lucide-react";
import { useProfessorAuth } from "@/hooks/useProfessorAuth";

interface TurmaFormProps {
  onSuccess: () => void;
  onCancel?: () => void;
}

export const TurmaForm = ({ onSuccess, onCancel }: TurmaFormProps) => {
  const [nomeTurma, setNomeTurma] = useState("");
  const [professorId, setProfessorId] = useState("");
  const [professores, setProfessores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { professor } = useProfessorAuth();

  // Buscar lista de professores
  useEffect(() => {
    const fetchProfessores = async () => {
      try {
        const { data, error } = await supabase
          .from("professores")
          .select("id, nome_completo, email")
          .eq("ativo", true)
          .order("nome_completo");

        if (error) throw error;
        setProfessores(data || []);
        
        // Pré-selecionar o professor logado
        if (professor?.id) {
          setProfessorId(professor.id);
        }
      } catch (error) {
        console.error("Erro ao buscar professores:", error);
      }
    };

    fetchProfessores();
  }, [professor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeTurma.trim() || !professorId) return;

    setLoading(true);
    try {
      // Por enquanto, vamos criar uma entrada na tabela profiles para simular uma turma
      // No futuro, você pode criar uma tabela específica para turmas
      const turmaData = {
        id: `turma-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        nome: nomeTurma.trim(),
        sobrenome: "",
        email: `turma-${Date.now()}@sistema.com`, // Email fictício para compatibilidade
        turma: nomeTurma.trim(),
        user_type: "turma",
        ativo: true,
        aprovado_por: professorId
      };

      const { error } = await supabase
        .from("profiles")
        .insert(turmaData);

      if (error) throw error;

      toast({
        title: "Turma criada com sucesso!",
        description: `A turma "${nomeTurma}" foi criada.`
      });

      setNomeTurma("");
      setProfessorId(professor?.id || "");
      onSuccess();

    } catch (error: any) {
      console.error("Erro ao criar turma:", error);
      toast({
        title: "Erro ao criar turma",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = nomeTurma.trim() && professorId;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Criar Nova Turma
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="nomeTurma">Nome da Turma *</Label>
            <Input
              id="nomeTurma"
              value={nomeTurma}
              onChange={(e) => setNomeTurma(e.target.value)}
              placeholder="Ex: Turma A, Redação 2025, etc."
              required
            />
          </div>

          <div>
            <Label htmlFor="professor">Vincular ao Docente *</Label>
            <Select value={professorId} onValueChange={setProfessorId} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o professor responsável" />
              </SelectTrigger>
              <SelectContent>
                {professores.map((prof) => (
                  <SelectItem key={prof.id} value={prof.id}>
                    {prof.nome_completo} ({prof.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button 
              type="submit" 
              disabled={!isFormValid || loading}
              className="flex-1"
            >
              {loading ? "Criando..." : "Criar Turma"}
            </Button>
            {onCancel && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
                disabled={loading}
              >
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};