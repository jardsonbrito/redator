import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { usePlanOverrides } from '@/hooks/usePlanOverrides';
import { Settings2, RotateCcw, User } from 'lucide-react';

const FUNCTIONALITY_LABELS: Record<string, string> = {
  temas: 'Temas',
  enviar_tema_livre: 'Enviar Tema Livre',
  exercicios: 'Exercícios',
  simulados: 'Simulados',
  lousa: 'Lousa',
  biblioteca: 'Biblioteca',
  redacoes_exemplares: 'Redações Exemplares',
  aulas_ao_vivo: 'Aulas ao Vivo',
  videoteca: 'Videoteca',
  aulas_gravadas: 'Aulas Gravadas',
  diario_online: 'Diário Online',
  gamificacao: 'Gamificação',
  top_5: 'Top 5',
  minhas_conquistas: 'Minhas Conquistas',
  jarvis: 'Jarvis',
};

interface StudentPlanSectionProps {
  studentId: string;
  plano: 'Liderança' | 'Lapidação' | 'Largada' | 'Bolsista' | null;
}

export function StudentPlanSection({ studentId, plano }: StudentPlanSectionProps) {
  const { toast } = useToast();
  const [savingStates, setSavingStates] = useState<Record<string, boolean>>({});

  const {
    overrides,
    isFunctionalityEnabled,
    updateFunctionalityOverride,
    resetAllOverrides,
    hasCustomizations,
  } = usePlanOverrides({ studentId, plano });

  const toggleFunctionality = async (functionality: string) => {
    if (!plano) {
      toast({ title: 'Aluno sem plano ativo', variant: 'destructive' });
      return;
    }
    const newValue = !isFunctionalityEnabled(functionality);
    setSavingStates((prev) => ({ ...prev, [functionality]: true }));
    try {
      await updateFunctionalityOverride(functionality, newValue);
    } finally {
      setTimeout(() => setSavingStates((prev) => ({ ...prev, [functionality]: false })), 500);
    }
  };

  if (!plano) {
    return (
      <div className="text-center text-muted-foreground py-12">
        <User className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p>Aluno sem plano ativo. Configure uma assinatura primeiro.</p>
      </div>
    );
  }

  return (
    <Card className="border-gray-200/50">
      <CardHeader className="border-b border-gray-200/50 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Settings2 className="h-4 w-4 text-primary" />
            Controle de Funcionalidades
            <Badge variant="outline" className="text-xs">{plano}</Badge>
          </CardTitle>
          {hasCustomizations() && (
            <Button size="sm" variant="outline" onClick={resetAllOverrides}>
              <RotateCcw className="w-3 h-3 mr-1" />
              Resetar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.entries(FUNCTIONALITY_LABELS).map(([key, label]) => {
            const isEnabled = isFunctionalityEnabled(key);
            const isCustom = overrides[key] !== undefined;
            const isSaving = savingStates[key];
            return (
              <button
                key={key}
                onClick={() => toggleFunctionality(key)}
                disabled={isSaving}
                className={`
                  relative p-2.5 text-xs rounded-lg transition-all text-center border-2 font-medium
                  ${isEnabled
                    ? isCustom
                      ? 'bg-orange-100 text-orange-800 border-orange-300'
                      : 'bg-green-100 text-green-800 border-green-300'
                    : isCustom
                      ? 'bg-red-100 text-red-800 border-red-300'
                      : 'bg-gray-100 text-gray-600 border-gray-300'
                  }
                  ${isSaving ? 'opacity-70 cursor-wait' : 'hover:scale-105 hover:shadow-sm'}
                  disabled:hover:scale-100
                `}
              >
                {isSaving && (
                  <div className="absolute top-1 right-1">
                    <div className="w-2.5 h-2.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {label}
                {isCustom && !isSaving && (
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mx-auto mt-1" />
                )}
              </button>
            );
          })}
        </div>
        {hasCustomizations() && (
          <p className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded p-2 mt-3">
            Este aluno possui customizações que sobrescrevem o padrão do plano {plano}.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
