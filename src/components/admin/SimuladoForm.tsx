
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

interface SimuladoFormData {
  titulo: string;
  frase_tematica: string;
  data_inicio: string;
  hora_inicio: string;
  data_fim: string;
  hora_fim: string;
  turmas_autorizadas: string[];
}

const SimuladoForm = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [turmasSelecionadas, setTurmasSelecionadas] = useState<string[]>([]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SimuladoFormData>();

  const turmasDisponiveis = [
    { value: "LRA2025", label: "Turma A (LRA2025)" },
    { value: "LRB2025", label: "Turma B (LRB2025)" },
    { value: "LRC2025", label: "Turma C (LRC2025)" },
    { value: "LRD2025", label: "Turma D (LRD2025)" },
    { value: "LRE2025", label: "Turma E (LRE2025)" },
    { value: "visitante", label: "Visitante" }
  ];

  const criarSimulado = useMutation({
    mutationFn: async (dadosSimulado: SimuladoFormData) => {
      const permiteVisitante = turmasSelecionadas.includes("visitante");
      
      console.log('Dados do simulado para inserir:', {
        titulo: dadosSimulado.titulo,
        frase_tematica: dadosSimulado.frase_tematica,
        data_inicio: dadosSimulado.data_inicio,
        hora_inicio: dadosSimulado.hora_inicio,
        data_fim: dadosSimulado.data_fim,
        hora_fim: dadosSimulado.hora_fim,
        turmas_autorizadas: turmasSelecionadas,
        permite_visitante: permiteVisitante,
        ativo: true
      });

      const { data, error } = await supabase
        .from('simulados')
        .insert([{
          titulo: dadosSimulado.titulo,
          frase_tematica: dadosSimulado.frase_tematica,
          data_inicio: dadosSimulado.data_inicio,
          hora_inicio: dadosSimulado.hora_inicio,
          data_fim: dadosSimulado.data_fim,
          hora_fim: dadosSimulado.hora_fim,
          turmas_autorizadas: turmasSelecionadas,
          permite_visitante: permiteVisitante,
          ativo: true
        }])
        .select();
      
      if (error) {
        console.error('Erro detalhado ao criar simulado:', error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Simulado criado com sucesso!",
        description: "O simulado foi cadastrado e está disponível para as turmas selecionadas.",
      });
      reset();
      setTurmasSelecionadas([]);
      queryClient.invalidateQueries({ queryKey: ['simulados'] });
      queryClient.invalidateQueries({ queryKey: ['admin-simulados'] });
    },
    onError: (error: any) => {
      console.error("Erro detalhado ao criar simulado:", error);
      toast({
        title: "Erro ao criar simulado",
        description: `Erro: ${error.message || 'Verifique os dados e tente novamente.'}`,
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: SimuladoFormData) => {
    if (turmasSelecionadas.length === 0) {
      toast({
        title: "Selecione pelo menos uma turma",
        description: "É necessário selecionar pelo menos uma turma para o simulado.",
        variant: "destructive",
      });
      return;
    }

    // Validar se a data/hora de fim é posterior à de início
    const inicio = new Date(`${data.data_inicio}T${data.hora_inicio}`);
    const fim = new Date(`${data.data_fim}T${data.hora_fim}`);
    
    if (fim <= inicio) {
      toast({
        title: "Datas inválidas",
        description: "A data/hora de término deve ser posterior à de início.",
        variant: "destructive",
      });
      return;
    }

    criarSimulado.mutate(data);
  };

  const handleTurmaChange = (turma: string, checked: boolean) => {
    if (checked) {
      setTurmasSelecionadas([...turmasSelecionadas, turma]);
    } else {
      setTurmasSelecionadas(turmasSelecionadas.filter(t => t !== turma));
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Cadastrar Novo Simulado</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <Label htmlFor="titulo">Título do Simulado *</Label>
            <Input
              id="titulo"
              {...register("titulo", { required: "Título é obrigatório" })}
              placeholder="Ex: Simulado ENEM 2025 - 1ª Aplicação"
            />
            {errors.titulo && (
              <span className="text-red-500 text-sm">{errors.titulo.message}</span>
            )}
          </div>

          <div>
            <Label htmlFor="frase_tematica">Frase Temática *</Label>
            <Textarea
              id="frase_tematica"
              {...register("frase_tematica", { required: "Frase temática é obrigatória" })}
              placeholder="Ex: Os desafios da educação digital no Brasil contemporâneo"
              className="min-h-[100px]"
            />
            {errors.frase_tematica && (
              <span className="text-red-500 text-sm">{errors.frase_tematica.message}</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="data_inicio">Data de Início *</Label>
              <Input
                id="data_inicio"
                type="date"
                {...register("data_inicio", { required: "Data de início é obrigatória" })}
              />
              {errors.data_inicio && (
                <span className="text-red-500 text-sm">{errors.data_inicio.message}</span>
              )}
            </div>

            <div>
              <Label htmlFor="hora_inicio">Hora de Início *</Label>
              <Input
                id="hora_inicio"
                type="time"
                {...register("hora_inicio", { required: "Hora de início é obrigatória" })}
              />
              {errors.hora_inicio && (
                <span className="text-red-500 text-sm">{errors.hora_inicio.message}</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="data_fim">Data de Término *</Label>
              <Input
                id="data_fim"
                type="date"
                {...register("data_fim", { required: "Data de término é obrigatória" })}
              />
              {errors.data_fim && (
                <span className="text-red-500 text-sm">{errors.data_fim.message}</span>
              )}
            </div>

            <div>
              <Label htmlFor="hora_fim">Hora de Término *</Label>
              <Input
                id="hora_fim"
                type="time"
                {...register("hora_fim", { required: "Hora de término é obrigatória" })}
              />
              {errors.hora_fim && (
                <span className="text-red-500 text-sm">{errors.hora_fim.message}</span>
              )}
            </div>
          </div>

          <div>
            <Label>Turmas Autorizadas *</Label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {turmasDisponiveis.map((turma) => (
                <div key={turma.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={turma.value}
                    checked={turmasSelecionadas.includes(turma.value)}
                    onCheckedChange={(checked) => handleTurmaChange(turma.value, checked as boolean)}
                  />
                  <Label htmlFor={turma.value} className="text-sm">
                    {turma.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-redator-primary hover:bg-redator-primary/90"
            disabled={criarSimulado.isPending}
          >
            {criarSimulado.isPending ? "Criando..." : "Publicar Simulado"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default SimuladoForm;
