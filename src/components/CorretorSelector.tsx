
import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle } from "lucide-react";

interface Corretor {
  id: string;
  nome_completo: string;
  email: string;
}

interface CorretorSelectorProps {
  selectedCorretores: string[];
  onCorretoresChange: (corretores: string[]) => void;
  isSimulado?: boolean;
  required?: boolean;
}

export const CorretorSelector = ({ 
  selectedCorretores, 
  onCorretoresChange, 
  isSimulado = false,
  required = false 
}: CorretorSelectorProps) => {
  const [corretores, setCorretores] = useState<Corretor[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchCorretores();
  }, []);

  const fetchCorretores = async () => {
    try {
      const { data, error } = await supabase
        .from("corretores")
        .select("id, nome_completo, email")
        .eq("ativo", true)
        .order("nome_completo");

      if (error) throw error;

      setCorretores(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar corretores:", error);
      toast({
        title: "Erro ao carregar corretores",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCorretorToggle = (corretorId: string, checked: boolean) => {
    let newSelected = [...selectedCorretores];

    if (checked) {
      // Verificar limite máximo de 2 corretores
      if (newSelected.length >= 2) {
        toast({
          title: "Limite atingido",
          description: "Você pode selecionar no máximo 2 corretores.",
          variant: "destructive"
        });
        return;
      }
      
      // Verificar se não é duplicado
      if (newSelected.includes(corretorId)) {
        toast({
          title: "Corretor já selecionado",
          description: "Este corretor já foi selecionado.",
          variant: "destructive"
        });
        return;
      }
      
      newSelected.push(corretorId);
    } else {
      newSelected = newSelected.filter(id => id !== corretorId);
    }

    onCorretoresChange(newSelected);
  };

  const getValidationMessage = () => {
    if (isSimulado && selectedCorretores.length !== 2) {
      return "Para simulados, é obrigatório selecionar exatamente 2 corretores.";
    }
    if (required && selectedCorretores.length === 0) {
      return "Selecione pelo menos 1 corretor.";
    }
    return null;
  };

  const validationMessage = getValidationMessage();

  if (loading) {
    return <div>Carregando corretores...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Selecionar Corretor(es)
          {required && <span className="text-red-500">*</span>}
        </CardTitle>
        {isSimulado && (
          <p className="text-sm text-muted-foreground">
            Para simulados, é obrigatório selecionar exatamente 2 corretores.
          </p>
        )}
      </CardHeader>
      <CardContent>
        {corretores.length === 0 ? (
          <p className="text-muted-foreground">
            Nenhum corretor disponível no momento.
          </p>
        ) : (
          <div className="space-y-3">
            {corretores.map((corretor) => (
              <div key={corretor.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`corretor-${corretor.id}`}
                  checked={selectedCorretores.includes(corretor.id)}
                  onCheckedChange={(checked) => 
                    handleCorretorToggle(corretor.id, checked as boolean)
                  }
                />
                <Label
                  htmlFor={`corretor-${corretor.id}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {corretor.nome_completo}
                </Label>
              </div>
            ))}
          </div>
        )}

        {validationMessage && (
          <div className="mt-4 flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="w-4 h-4" />
            {validationMessage}
          </div>
        )}

        <div className="mt-4 text-xs text-muted-foreground">
          Selecionados: {selectedCorretores.length} de 2 máximo
        </div>
      </CardContent>
    </Card>
  );
};
