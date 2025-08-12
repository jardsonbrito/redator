
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Users, AlertCircle } from "lucide-react";

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
        .from('corretores')
        .select('id, nome_completo, email')
        .eq('ativo', true)
        .order('nome_completo');

      if (error) throw error;
      setCorretores(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar corretores:', error);
      toast({
        title: "Erro ao carregar corretores",
        description: "Não foi possível carregar a lista de corretores.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCorretorToggle = (corretorId: string, checked: boolean) => {
    let newSelected = [...selectedCorretores];

    if (checked) {
      // Para simulados, manter limite de 2
      if (isSimulado && newSelected.length >= 2) {
        toast({
          title: "Limite excedido",
          description: "Simulados requerem exatamente 2 corretores.",
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

  const handleSelectAll = (checked: boolean) => {
    if (isSimulado) {
      toast({
        title: "Não disponível para simulados",
        description: "Simulados requerem exatamente 2 corretores.",
        variant: "destructive"
      });
      return;
    }

    if (checked) {
      onCorretoresChange(corretores.map(c => c.id));
    } else {
      onCorretoresChange([]);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Seleção de Corretores(as)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando corretores(as)...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Selecione os(as) corretores(as) {required && <span className="text-red-500">*</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isSimulado && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Simulado:</strong> É obrigatório selecionar exatamente 2 corretores(as).
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          {!isSimulado && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all-corretores"
                checked={selectedCorretores.length === corretores.length && corretores.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <Label htmlFor="select-all-corretores" className="font-medium">
                Selecionar todos(as) os(as) corretores(as)
              </Label>
            </div>
          )}
          
          <div className="grid grid-cols-1 gap-3">
            {corretores.map((corretor) => (
              <div key={corretor.id} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
                <Checkbox
                  id={`corretor-${corretor.id}`}
                  checked={selectedCorretores.includes(corretor.id)}
                  onCheckedChange={(checked) => 
                    handleCorretorToggle(corretor.id, checked === true)
                  }
                />
                <Label 
                  htmlFor={`corretor-${corretor.id}`}
                  className="flex-1 cursor-pointer"
                >
                  <div>
                    <p className="font-medium">{corretor.nome_completo}</p>
                  </div>
                </Label>
              </div>
            ))}
          </div>

          {corretores.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Nenhum(a) corretor(a) ativo(a) encontrado(a). Entre em contato com o administrador.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          <p>Corretores selecionados: {selectedCorretores.length}/{corretores.length}</p>
          {isSimulado && selectedCorretores.length !== 2 && (
            <p className="text-red-500 mt-1">
              ⚠️ Simulados requerem exatamente 2 corretores(as)
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
