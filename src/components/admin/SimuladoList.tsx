
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Users, Calendar, Clock, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, isAfter, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SimuladoForm } from "./SimuladoForm";

const SimuladoList = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [simuladoEditando, setSimuladoEditando] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: simulados, isLoading } = useQuery({
    queryKey: ['admin-simulados'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('simulados')
        .select('*')
        .order('criado_em', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const deletarSimulado = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('simulados')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Simulado excluído com sucesso!",
        description: "O simulado foi removido do sistema.",
      });
      queryClient.invalidateQueries({ queryKey: ['admin-simulados'] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir simulado",
        description: "Não foi possível excluir o simulado.",
        variant: "destructive",
      });
      console.error("Erro ao excluir simulado:", error);
    }
  });

  const getStatusSimulado = (simulado: any) => {
    const now = new Date();
    const inicio = new Date(`${simulado.data_inicio}T${simulado.hora_inicio}`);
    const fim = new Date(`${simulado.data_fim}T${simulado.hora_fim}`);
    
    if (isBefore(now, inicio)) {
      return { status: "Agendado", color: "bg-blue-500" };
    } else if (isAfter(now, inicio) && isBefore(now, fim)) {
      return { status: "Ativo", color: "bg-green-500" };
    } else {
      return { status: "Encerrado", color: "bg-gray-500" };
    }
  };

  const handleEdit = (simulado: any) => {
    setSimuladoEditando(simulado);
    setShowForm(true);
  };

  const handleCancelEdit = () => {
    setSimuladoEditando(null);
    setShowForm(false);
  };

  const handleSuccess = () => {
    setSimuladoEditando(null);
    setShowForm(false);
  };

  if (isLoading) {
    return <div className="text-center py-8">Carregando simulados...</div>;
  }

  if (showForm) {
    return (
      <div className="space-y-4">
        <SimuladoForm 
          simuladoEditando={simuladoEditando}
          onSuccess={handleSuccess}
          onCancelEdit={handleCancelEdit}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-redator-primary">Simulados Cadastrados</h2>
        <Button onClick={() => setShowForm(true)} variant="default" size="sm">
          Novo Simulado
        </Button>
      </div>
      
      {!simulados || simulados.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">Nenhum simulado cadastrado ainda.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {simulados.map((simulado) => {
            const statusInfo = getStatusSimulado(simulado);
            
            return (
              <Card key={simulado.id} className="border-l-4 border-l-redator-primary">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{simulado.titulo}</CardTitle>
                      <p className="text-sm text-gray-600 mb-3">{simulado.frase_tematica}</p>
                      
                      <div className="flex flex-wrap gap-2">
                        <Badge className={`${statusInfo.color} text-white`}>
                          {statusInfo.status}
                        </Badge>
                        
                        {simulado.turmas_autorizadas && simulado.turmas_autorizadas.length > 0 && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {simulado.turmas_autorizadas.length} turma(s)
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(simulado)}
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deletarSimulado.mutate(simulado.id)}
                        disabled={deletarSimulado.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-redator-primary" />
                      <span>
                        Início: {format(new Date(`${simulado.data_inicio}T${simulado.hora_inicio}`), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-redator-primary" />
                      <span>
                        Fim: {format(new Date(`${simulado.data_fim}T${simulado.hora_fim}`), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                  
                  {simulado.turmas_autorizadas && simulado.turmas_autorizadas.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Turmas autorizadas:</p>
                      <div className="flex flex-wrap gap-1">
                        {simulado.turmas_autorizadas.map((turma: string) => (
                          <Badge key={turma} variant="secondary" className="text-xs">
                            {turma === "visitante" ? "Visitantes" : turma}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SimuladoList;
