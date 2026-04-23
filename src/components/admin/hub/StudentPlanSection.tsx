import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { usePlanOverrides } from '@/hooks/usePlanOverrides';
import { useFuncionalidades } from '@/hooks/usePlansAdmin';
import { Settings2, RotateCcw, User } from 'lucide-react';

interface StudentPlanSectionProps {
  studentId: string;
  plano: string | null;
}

export function StudentPlanSection({ studentId, plano }: StudentPlanSectionProps) {
  const { toast } = useToast();
  const [savingStates, setSavingStates] = useState<Record<string, boolean>>({});

  const { data: funcionalidades = [] } = useFuncionalidades();

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
          {funcionalidades.map((f) => {
            const isEnabled = isFunctionalityEnabled(f.chave);
            const isCustom = overrides[f.chave] !== undefined;
            const isSaving = savingStates[f.chave];
            return (
              <button
                key={f.chave}
                onClick={() => toggleFunctionality(f.chave)}
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
                {f.nome_exibicao}
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
