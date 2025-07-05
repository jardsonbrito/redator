
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useCredits } from "@/hooks/useCredits";
import { supabase } from "@/integrations/supabase/client";
import { Coins, Search, Save } from "lucide-react";

interface Student {
  id: string;
  nome: string;
  email: string;
  creditos: number;
}

export const CreditManager = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [newCredits, setNewCredits] = useState<number>(0);
  const [searchEmail, setSearchEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { addCredits, getCreditsbyEmail } = useCredits();
  const { toast } = useToast();

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome, email, creditos')
        .eq('user_type', 'aluno')
        .order('nome');

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Erro ao carregar alunos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a lista de alunos.",
        variant: "destructive"
      });
    }
  };

  const searchStudent = async () => {
    if (!searchEmail.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Digite um e-mail para buscar.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome, email, creditos')
        .eq('email', searchEmail.trim().toLowerCase())
        .eq('user_type', 'aluno')
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast({
          title: "Aluno não encontrado",
          description: "Nenhum aluno encontrado com este e-mail.",
          variant: "destructive"
        });
        return;
      }

      setSelectedStudent(data);
      setNewCredits(data.creditos);
      
      toast({
        title: "Aluno encontrado",
        description: `${data.nome} possui ${data.creditos} créditos.`
      });

    } catch (error) {
      console.error('Erro ao buscar aluno:', error);
      toast({
        title: "Erro na busca",
        description: "Não foi possível buscar o aluno.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateCredits = async () => {
    if (!selectedStudent) {
      toast({
        title: "Nenhum aluno selecionado",
        description: "Busque um aluno primeiro.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Calcular a diferença
      const difference = newCredits - selectedStudent.creditos;
      
      // Usar a função addCredits que já funciona
      const success = await addCredits(selectedStudent.email, difference);
      
      if (success) {
        // Atualizar os dados locais
        setSelectedStudent({
          ...selectedStudent,
          creditos: newCredits
        });
        
        // Recarregar a lista
        await loadStudents();
        
        toast({
          title: "Créditos atualizados",
          description: `${selectedStudent.nome} agora possui ${newCredits} créditos.`
        });
      }
    } catch (error) {
      console.error('Erro ao atualizar créditos:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar os créditos.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5" />
            Gerenciar Créditos dos Alunos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Busca por e-mail */}
          <div className="space-y-2">
            <Label htmlFor="search-email">Buscar aluno por e-mail</Label>
            <div className="flex gap-2">
              <Input
                id="search-email"
                type="email"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                placeholder="Digite o e-mail do aluno..."
                onKeyPress={(e) => e.key === 'Enter' && searchStudent()}
              />
              <Button onClick={searchStudent} disabled={loading}>
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Aluno selecionado */}
          {selectedStudent && (
            <div className="bg-blue-50 p-4 rounded-lg space-y-4">
              <div>
                <h3 className="font-semibold text-blue-800">Aluno Selecionado</h3>
                <p className="text-blue-600">Nome: {selectedStudent.nome}</p>
                <p className="text-blue-600">E-mail: {selectedStudent.email}</p>
                <p className="text-blue-600">Créditos atuais: {selectedStudent.creditos}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-credits">Novos créditos</Label>
                <div className="flex gap-2">
                  <Input
                    id="new-credits"
                    type="number"
                    min="0"
                    value={newCredits}
                    onChange={(e) => setNewCredits(parseInt(e.target.value) || 0)}
                  />
                  <Button onClick={updateCredits} disabled={loading}>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de todos os alunos */}
      <Card>
        <CardHeader>
          <CardTitle>Todos os Alunos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {students.map((student) => (
              <div
                key={student.id}
                className="flex justify-between items-center p-2 border rounded cursor-pointer hover:bg-gray-50"
                onClick={() => {
                  setSelectedStudent(student);
                  setNewCredits(student.creditos);
                  setSearchEmail(student.email);
                }}
              >
                <div>
                  <p className="font-medium">{student.nome}</p>
                  <p className="text-sm text-gray-500">{student.email}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{student.creditos} créditos</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
