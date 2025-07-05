
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useCredits } from "@/hooks/useCredits";
import { Coins, User, Plus, Minus, Search, Loader2 } from "lucide-react";

interface Student {
  id: string;
  nome: string;
  email: string;
  creditos: number;
  turma: string;
}

interface CreditManagerProps {
  turmaFilter?: string;
}

export const CreditManager = ({ turmaFilter }: CreditManagerProps) => {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();
  const { addCredits, loading: creditsLoading } = useCredits();
  const queryClient = useQueryClient();

  const { data: students, isLoading } = useQuery({
    queryKey: ['students-credits', turmaFilter],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('id, nome, email, creditos, turma')
        .eq('user_type', 'aluno')
        .order('nome');

      if (turmaFilter) {
        query = query.eq('turma', turmaFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Student[];
    },
  });

  useEffect(() => {
    if (!students) return;
    
    if (!searchTerm.trim()) {
      setFilteredStudents(students);
      return;
    }

    const filtered = students.filter(student => 
      student.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    setFilteredStudents(filtered);
  }, [searchTerm, students]);

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

    setUpdating(true);
    const finalAmount = operation === 'subtract' ? -amount : amount;
    
    console.log('🎯 Tentando atualizar créditos:', {
      student: student.nome,
      email: student.email,
      operacao: operation,
      valor: finalAmount
    });

    const success = await addCredits(student.email, finalAmount);
    
    if (success) {
      setCreditAmount("");
      setSelectedStudent(null);
      
      // Aguardar um pouco e recarregar os dados
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['students-credits', turmaFilter] });
      }, 500);
      
      console.log('✅ Créditos atualizados com sucesso!');
    } else {
      console.error('❌ Falha ao atualizar créditos');
    }
    
    setUpdating(false);
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
    
    setUpdating(true);
    const success = await addCredits(student.email, difference);
    
    if (success) {
      setCreditAmount("");
      setSelectedStudent(null);
      
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['students-credits', turmaFilter] });
      }, 500);
    }
    
    setUpdating(false);
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
            Gerenciar Créditos dos Alunos {turmaFilter && `- ${turmaFilter}`}
          </CardTitle>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar aluno por nome ou e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {filteredStudents?.map((student) => (
              <div
                key={student.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="font-medium">{student.nome}</p>
                    <p className="text-sm text-gray-500">{student.email}</p>
                    {!turmaFilter && <p className="text-xs text-gray-400">Turma: {student.turma}</p>}
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
                    disabled={updating}
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
              <p className="text-sm text-gray-600">
                Créditos atuais: <strong>{selectedStudent.creditos || 0}</strong>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Email: {selectedStudent.email}
              </p>
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
                disabled={updating}
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={() => handleUpdateCredits(selectedStudent, 'add')}
                disabled={creditsLoading || updating}
                className="flex-1"
              >
                {updating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Adicionar
              </Button>
              
              <Button
                onClick={() => handleUpdateCredits(selectedStudent, 'subtract')}
                variant="destructive"
                disabled={creditsLoading || updating}
                className="flex-1"
              >
                {updating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Minus className="w-4 h-4 mr-2" />
                )}
                Subtrair
              </Button>
              
              <Button
                onClick={() => handleSetCredits(selectedStudent)}
                variant="secondary"
                disabled={creditsLoading || updating}
                className="flex-1"
              >
                {updating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
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
              disabled={updating}
            >
              Cancelar
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
