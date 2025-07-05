
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useCredits } from "@/hooks/useCredits";
import { Coins, User, Plus, Minus } from "lucide-react";

interface Student {
  id: string;
  nome: string;
  email: string;
  creditos: number;
  turma: string;
}

export const CreditManager = () => {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const { toast } = useToast();
  const { addCredits, loading } = useCredits();
  const queryClient = useQueryClient();

  const { data: students, isLoading } = useQuery({
    queryKey: ['students-credits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome, email, creditos, turma')
        .eq('user_type', 'aluno')
        .order('nome');

      if (error) throw error;
      return data as Student[];
    },
  });

  const handleUpdateCredits = async (student: Student, operation: 'add' | 'subtract') => {
    const amount = parseInt(creditAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Valor inválido",
        description: "Digite um número válido maior que zero.",
        variant: "destructive"
      });
      return;
    }

    const finalAmount = operation === 'subtract' ? -amount : amount;
    const success = await addCredits(student.email, finalAmount);
    
    if (success) {
      setCreditAmount("");
      setSelectedStudent(null);
      queryClient.invalidateQueries({ queryKey: ['students-credits'] });
    }
  };

  const handleSetCredits = async (student: Student) => {
    const newTotal = parseInt(creditAmount);
    if (isNaN(newTotal) || newTotal < 0) {
      toast({
        title: "Valor inválido",
        description: "Digite um número válido maior ou igual a zero.",
        variant: "destructive"
      });
      return;
    }

    const currentCredits = student.creditos || 0;
    const difference = newTotal - currentCredits;
    
    const success = await addCredits(student.email, difference);
    
    if (success) {
      setCreditAmount("");
      setSelectedStudent(null);
      queryClient.invalidateQueries({ queryKey: ['students-credits'] });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Carregando alunos...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5" />
            Gerenciar Créditos dos Alunos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {students?.map((student) => (
              <div
                key={student.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="font-medium">{student.nome}</p>
                    <p className="text-sm text-gray-500">{student.email}</p>
                    <p className="text-xs text-gray-400">Turma: {student.turma}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-bold text-lg">{student.creditos || 0}</p>
                    <p className="text-xs text-gray-500">créditos</p>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedStudent(student)}
                  >
                    Editar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedStudent && (
        <Card>
          <CardHeader>
            <CardTitle>Editar Créditos - {selectedStudent.nome}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">Créditos atuais: <strong>{selectedStudent.creditos || 0}</strong></p>
            </div>
            
            <div>
              <Label htmlFor="credit-amount">Quantidade</Label>
              <Input
                id="credit-amount"
                type="number"
                min="0"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                placeholder="Digite a quantidade"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={() => handleUpdateCredits(selectedStudent, 'add')}
                disabled={loading}
                className="flex-1"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
              
              <Button
                onClick={() => handleUpdateCredits(selectedStudent, 'subtract')}
                variant="destructive"
                disabled={loading}
                className="flex-1"
              >
                <Minus className="w-4 h-4 mr-2" />
                Subtrair
              </Button>
              
              <Button
                onClick={() => handleSetCredits(selectedStudent)}
                variant="secondary"
                disabled={loading}
                className="flex-1"
              >
                Definir Total
              </Button>
            </div>
            
            <Button
              variant="outline"
              onClick={() => {
                setSelectedStudent(null);
                setCreditAmount("");
              }}
              className="w-full"
            >
              Cancelar
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
