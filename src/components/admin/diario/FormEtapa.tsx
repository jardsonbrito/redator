import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Calendar } from 'lucide-react';
import { useEtapaMutation, useTurmasDisponiveis } from '@/hooks/useDiario';
import { NUMEROS_ETAPAS, NOMES_ETAPAS } from '@/types/diario';
import type { FormEtapaProps } from '@/types/diario';

const etapaSchema = z.object({
  nome: z.string().min(1, 'Nome da etapa é obrigatório'),
  numero: z.number().min(1).max(4, 'Número deve estar entre 1 e 4'),
  data_inicio: z.string().min(1, 'Data de início é obrigatória'),
  data_fim: z.string().min(1, 'Data de fim é obrigatória'),
  turma: z.string().min(1, 'Turma é obrigatória'),
}).refine((data) => {
  return new Date(data.data_fim) > new Date(data.data_inicio);
}, {
  message: 'Data de fim deve ser posterior à data de início',
  path: ['data_fim'],
});

type FormData = z.infer<typeof etapaSchema>;

export function FormEtapa({ turma, etapa, onSave, onCancel }: FormEtapaProps) {
  const [selectedNumero, setSelectedNumero] = useState<number>(etapa?.numero || 1);
  const { data: turmas } = useTurmasDisponiveis();
  const etapaMutation = useEtapaMutation();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<FormData>({
    resolver: zodResolver(etapaSchema),
    defaultValues: {
      nome: etapa?.nome || NOMES_ETAPAS[0],
      numero: etapa?.numero || 1,
      data_inicio: etapa?.data_inicio || '',
      data_fim: etapa?.data_fim || '',
      turma: turma || etapa?.turma || '',
    }
  });

  // Atualizar nome quando número muda
  useEffect(() => {
    const nomeEtapa = NOMES_ETAPAS[selectedNumero - 1];
    setValue('nome', nomeEtapa);
    setValue('numero', selectedNumero);
  }, [selectedNumero, setValue]);

  const onSubmit = async (data: FormData) => {
    try {
      await etapaMutation.mutateAsync({
        ...data,
        ...(etapa?.id && { id: etapa.id })
      });
      onSave(data);
    } catch (error) {
      console.error('Erro ao salvar etapa:', error);
    }
  };

  const watchedDataInicio = watch('data_inicio');

  // A data de fim deve ser definida manualmente pelo professor
  // Não há duração fixa para as etapas - pode ser 2, 3 ou mais meses

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
                <Calendar className="w-5 h-5" />
                {etapa ? 'Editar Etapa' : 'Nova Etapa'}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure o período e detalhes da etapa de estudo
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

            {/* Seletor de Número da Etapa */}
            <div className="space-y-2">
              <Label>Número da Etapa</Label>
              <div className="grid grid-cols-4 gap-2">
                {NUMEROS_ETAPAS.map((numero) => (
                  <Button
                    key={numero}
                    type="button"
                    variant={selectedNumero === numero ? "default" : "outline"}
                    onClick={() => setSelectedNumero(numero)}
                    className="h-12"
                  >
                    {numero}ª
                  </Button>
                ))}
              </div>
            </div>

            {/* Nome da Etapa (readonly, preenchido automaticamente) */}
            <div className="space-y-2">
              <Label htmlFor="nome">Nome da Etapa</Label>
              <Input
                id="nome"
                {...register('nome')}
                readOnly
                className="bg-muted"
              />
              {errors.nome && (
                <p className="text-sm text-destructive">{errors.nome.message}</p>
              )}
            </div>

            {/* Datas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="data_inicio">Data de Início</Label>
                <Input
                  id="data_inicio"
                  type="date"
                  {...register('data_inicio')}
                />
                {errors.data_inicio && (
                  <p className="text-sm text-destructive">{errors.data_inicio.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_fim">Data de Fim</Label>
                <Input
                  id="data_fim"
                  type="date"
                  {...register('data_fim')}
                />
                {errors.data_fim && (
                  <p className="text-sm text-destructive">{errors.data_fim.message}</p>
                )}
              </div>
            </div>

            {/* Dica sobre duração flexível */}
            <div className="text-sm text-muted-foreground bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-2">
                <span className="text-amber-600 dark:text-amber-400 mt-0.5">💡</span>
                <div>
                  <strong className="text-amber-900 dark:text-amber-100">Duração totalmente flexível:</strong>
                  <span className="text-amber-800 dark:text-amber-200 ml-1">
                    Configure o período que funcionar melhor para sua escola - pode ser 2, 3, 4 meses ou qualquer outra duração.
                  </span>
                </div>
              </div>
            </div>

            {/* Informações sobre a etapa */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                Sobre as Etapas
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Cada etapa pode ter duração flexível (2, 3 ou mais meses)</li>
                <li>• O sistema considera apenas atividades dentro do período da etapa</li>
                <li>• Aulas serão automaticamente vinculadas à etapa baseada na data</li>
                <li>• Não pode haver sobreposição de períodos para a mesma turma</li>
              </ul>
            </div>

            {/* Botões de Ação */}
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || etapaMutation.isPending}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isSubmitting || etapaMutation.isPending ? 'Salvando...' : 'Salvar Etapa'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}