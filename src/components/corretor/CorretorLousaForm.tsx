import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, Send } from 'lucide-react';
import { DateTimePicker } from '@/components/ui/datetime-picker-custom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCorretorAuth } from '@/hooks/useCorretorAuth';

const lousaSchema = z.object({
  titulo: z.string().min(1, 'Título é obrigatório'),
  enunciado: z.string().min(1, 'Enunciado é obrigatório'),
  turmas: z.array(z.string()).min(1, 'Pelo menos uma turma deve ser selecionada'),
  permite_visitante: z.boolean().default(false),
  inicio_em: z.date().optional(),
  fim_em: z.date().optional(),
  capa_url: z.string().url('URL inválida').optional().or(z.literal('')),
  ativo: z.boolean().default(true)
}).refine((data) => {
  if (data.inicio_em && data.fim_em && data.inicio_em >= data.fim_em) {
    return false;
  }
  return true;
}, {
  message: "Data de início deve ser anterior à data fim"
});

type LousaFormData = z.infer<typeof lousaSchema>;

interface CorretorLousaFormProps {
  onSuccess?: () => void;
  editData?: any;
}

const TURMAS = ['A', 'B', 'C', 'D', 'E'];

export default function CorretorLousaForm({ onSuccess, editData }: CorretorLousaFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { corretor } = useCorretorAuth();

  const form = useForm<LousaFormData>({
    resolver: zodResolver(lousaSchema),
    defaultValues: {
      titulo: editData?.titulo || '',
      enunciado: editData?.enunciado || '',
      turmas: editData?.turmas || [],
      permite_visitante: editData?.permite_visitante || false,
      inicio_em: editData?.inicio_em ? new Date(editData.inicio_em) : undefined,
      fim_em: editData?.fim_em ? new Date(editData.fim_em) : undefined,
      capa_url: editData?.capa_url || '',
      ativo: editData?.ativo ?? true
    }
  });

  const handleSubmit = async (data: LousaFormData, status: 'draft' | 'active') => {
    if (!corretor?.email) {
      toast({
        title: 'Erro',
        description: 'Erro de autenticação. Faça login novamente.',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      let result;

      if (editData) {
        // Atualizar lousa existente
        const { data: rpcResult, error } = await supabase.rpc('update_corretor_lousa', {
          corretor_email: corretor.email,
          lousa_id: editData.id,
          lousa_titulo: data.titulo,
          lousa_enunciado: data.enunciado,
          lousa_turmas: data.turmas,
          lousa_permite_visitante: data.permite_visitante,
          lousa_ativo: data.ativo,
          lousa_status: status,
          lousa_capa_url: data.capa_url || null,
          lousa_inicio_em: data.inicio_em?.toISOString() || null,
          lousa_fim_em: data.fim_em?.toISOString() || null
        });

        if (error) throw error;
        result = rpcResult;
      } else {
        // Criar nova lousa
        const { data: rpcResult, error } = await supabase.rpc('create_corretor_lousa', {
          corretor_email: corretor.email,
          lousa_titulo: data.titulo,
          lousa_enunciado: data.enunciado,
          lousa_turmas: data.turmas,
          lousa_permite_visitante: data.permite_visitante,
          lousa_ativo: data.ativo,
          lousa_status: status,
          lousa_capa_url: data.capa_url || null,
          lousa_inicio_em: data.inicio_em?.toISOString() || null,
          lousa_fim_em: data.fim_em?.toISOString() || null
        });

        if (error) throw error;
        result = rpcResult;
      }

      // Verificar resultado da RPC
      if (!result?.success) {
        throw new Error(result?.error || 'Erro ao salvar lousa');
      }

      toast({
        title: 'Sucesso!',
        description: `Lousa ${status === 'draft' ? 'salva como rascunho' : 'publicada'} com sucesso.`
      });

      // Limpar formulário se for criação
      if (!editData) {
        form.reset();
      }

      onSuccess?.();
    } catch (error) {
      console.error('Erro ao salvar lousa:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar lousa. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            📝
          </div>
          {editData ? 'Editar Lousa' : 'Nova Lousa'}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          A lousa será automaticamente atribuída a você como responsável
        </p>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form className="space-y-6">
            {/* Título */}
            <FormField
              control={form.control}
              name="titulo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título da Lousa *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Reescreva a concordância" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Enunciado */}
            <FormField
              control={form.control}
              name="enunciado"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Enunciado *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descreva aqui o exercício que os alunos devem realizar..."
                      className="min-h-[120px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Turmas e Visitantes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="turmas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Turmas Autorizadas *</FormLabel>
                    <div className="grid grid-cols-3 gap-2">
                      {TURMAS.map((turma) => (
                        <div key={turma} className="flex items-center space-x-2">
                          <Checkbox
                            id={`turma-${turma}`}
                            checked={field.value.includes(turma)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                field.onChange([...field.value, turma]);
                              } else {
                                field.onChange(field.value.filter(t => t !== turma));
                              }
                            }}
                          />
                          <label htmlFor={`turma-${turma}`} className="text-sm font-medium">
                            Turma {turma}
                          </label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="permite_visitante"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Permitir Visitantes</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Visitantes podem acessar esta lousa
                      </div>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Período de Disponibilidade */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="inicio_em"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data e Hora de Início (Opcional)</FormLabel>
                     <FormControl>
                       <DateTimePicker
                         selected={field.value}
                         onChange={field.onChange}
                         placeholder="Selecione data e hora de início"
                         minDate={new Date()}
                       />
                     </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fim_em"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data e Hora de Fim (Opcional)</FormLabel>
                     <FormControl>
                       <DateTimePicker
                         selected={field.value}
                         onChange={field.onChange}
                         placeholder="Selecione data e hora de fim"
                         minDate={new Date()}
                       />
                     </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* URL da Capa */}
            <FormField
              control={form.control}
              name="capa_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL da Imagem de Capa (Opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://exemplo.com/imagem.jpg" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Status Ativo */}
            <FormField
              control={form.control}
              name="ativo"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Ativo</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Lousa ativa pode ser acessada pelos alunos
                    </div>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Botões */}
            <div className="flex gap-4 pt-6">
              <Button 
                type="button"
                variant="outline" 
                onClick={() => form.handleSubmit((data) => handleSubmit(data, 'draft'))()}
                disabled={isSubmitting}
              >
                <Save className="w-4 h-4 mr-2" />
                Salvar Rascunho
              </Button>
              
              <Button 
                type="button"
                onClick={() => form.handleSubmit((data) => handleSubmit(data, 'active'))()}
                disabled={isSubmitting}
              >
                <Send className="w-4 h-4 mr-2" />
                Publicar
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}