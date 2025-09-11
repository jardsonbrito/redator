import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, BookOpen } from 'lucide-react';
import { useAulaMutation, useTurmasDisponiveis } from '@/hooks/useDiario';
import type { FormAulaProps } from '@/types/diario';

const aulaSchema = z.object({
  turma: z.string().min(1, 'Turma é obrigatória'),
  data_aula: z.string().min(1, 'Data da aula é obrigatória'),
  conteudo_ministrado: z.string().min(1, 'Conteúdo ministrado é obrigatório'),
  observacoes: z.string().optional(),
});

type FormData = z.infer<typeof aulaSchema>;

export function FormAula({ turma, aula, onSave, onCancel }: FormAulaProps) {
  const { data: turmas } = useTurmasDisponiveis();
  const aulaMutation = useAulaMutation();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<FormData>({
    resolver: zodResolver(aulaSchema),
    defaultValues: {
      turma: turma || aula?.turma || '',
      data_aula: aula?.data_aula || new Date().toISOString().split('T')[0],
      conteudo_ministrado: aula?.conteudo_ministrado || '',
      observacoes: aula?.observacoes || '',
    }
  });

  const onSubmit = async (data: FormData) => {
    try {
      await aulaMutation.mutateAsync({
        ...data,
        ...(aula?.id && { id: aula.id }),
        professor_email: 'admin@redator.com' // TODO: Pegar email do usuário logado
      });
      onSave(data);
    } catch (error) {
      console.error('Erro ao salvar aula:', error);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={onCancel}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                {aula ? 'Editar Aula' : 'Registrar Nova Aula'}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Registre o conteúdo ministrado e observações da aula
              </p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Seletor de Turma */}
            <div className="space-y-2">
              <Label htmlFor="turma">Turma</Label>
              <Select 
                value={watch('turma')} 
                onValueChange={(value) => setValue('turma', value)}
                disabled={!!turma}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma turma" />
                </SelectTrigger>
                <SelectContent>
                  {turmas?.map((turmaOption) => (
                    <SelectItem key={turmaOption.codigo} value={turmaOption.codigo}>
                      {turmaOption.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.turma && (
                <p className="text-sm text-destructive">{errors.turma.message}</p>
              )}
            </div>

            {/* Data da Aula */}
            <div className="space-y-2">
              <Label htmlFor="data_aula">Data da Aula</Label>
              <Input
                id="data_aula"
                type="date"
                {...register('data_aula')}
              />
              {errors.data_aula && (
                <p className="text-sm text-destructive">{errors.data_aula.message}</p>
              )}
            </div>

            {/* Conteúdo Ministrado */}
            <div className="space-y-2">
              <Label htmlFor="conteudo_ministrado">Conteúdo Ministrado</Label>
              <Textarea
                id="conteudo_ministrado"
                placeholder="Descreva o conteúdo que foi ministrado na aula..."
                className="min-h-[120px]"
                {...register('conteudo_ministrado')}
              />
              {errors.conteudo_ministrado && (
                <p className="text-sm text-destructive">{errors.conteudo_ministrado.message}</p>
              )}
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações (Opcional)</Label>
              <Textarea
                id="observacoes"
                placeholder="Observações adicionais sobre a aula, comportamento da turma, etc..."
                className="min-h-[80px]"
                {...register('observacoes')}
              />
              {errors.observacoes && (
                <p className="text-sm text-destructive">{errors.observacoes.message}</p>
              )}
            </div>

            {/* Informações sobre detecção automática */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                Detecção Automática de Etapa
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• O sistema automaticamente vincula a aula à etapa correta baseada na data</li>
                <li>• Certifique-se de que a data está dentro do período de uma etapa configurada</li>
                <li>• Após salvar, você poderá registrar a presença dos alunos</li>
              </ul>
            </div>

            {/* Botões de Ação */}
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || aulaMutation.isPending}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isSubmitting || aulaMutation.isPending ? 'Salvando...' : 'Salvar Aula'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}