import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGuia } from '@/hooks/useGuiaTematico';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import { useProfessorAuth } from '@/hooks/useProfessorAuth';
import { supabase } from '@/integrations/supabase/client';
import { GuiaTelaCapa } from './GuiaTelaCapa';
import { GuiaTela2FraseTematica } from './GuiaTela2FraseTematica';
import { GuiaTela3Perguntas } from './GuiaTela3Perguntas';
import { GuiaTela4Interpretacao } from './GuiaTela4Interpretacao';
import { GuiaTela5Vocabulario } from './GuiaTela5Vocabulario';
import { GuiaTela6Problematica } from './GuiaTela6Problematica';
import { GuiaTela7Associadas } from './GuiaTela7Associadas';
import { GuiaTela8Propostas } from './GuiaTela8Propostas';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

const TOTAL_STEPS = 8;

const STEP_LABELS: Record<Step, string> = {
  1: 'Capa',
  2: 'Análise da frase temática',
  3: 'Questões norteadoras',
  4: 'Interpretação do tema',
  5: 'Vocabulário temático',
  6: 'Problemática central',
  7: 'Problemáticas associadas',
  8: 'Propostas de solução',
};

function stepKey(guiaId: string) {
  return `guia_step_${guiaId}`;
}

export function GuiaTematicoView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { studentData } = useStudentAuth();
  const { professor } = useProfessorAuth();
  const guiaBaseUrl = professor ? '/professor/guia-tematico' : '/guia-tematico';

  const savedStep = id ? sessionStorage.getItem(stepKey(id)) : null;
  const [step, setStep] = useState<Step>(
    savedStep ? (Math.min(Math.max(parseInt(savedStep), 1), TOTAL_STEPS) as Step) : 1
  );

  const { data: guia, isLoading, error } = useGuia(id);

  useEffect(() => {
    if (id) sessionStorage.setItem(stepKey(id), String(step));
  }, [step, id]);

  useEffect(() => {
    return () => {
      if (id) sessionStorage.removeItem(stepKey(id));
    };
  }, [id]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const handleNext = () => {
    if (step < TOTAL_STEPS) setStep((s) => (s + 1) as Step);
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => (s - 1) as Step);
  };

  const handleGoToStep = (targetStep: number) => {
    setStep(targetStep as Step);
  };

  const handleConcluir = async () => {
    // Registra a conclusão no banco
    const email = studentData?.email?.toLowerCase().trim();
    if (id && email) {
      try {
        await (supabase as any).from('guias_tematicos_conclusoes').upsert(
          { aluno_email: email, guia_id: id },
          { onConflict: 'aluno_email,guia_id', ignoreDuplicates: true }
        );
      } catch {
        // Não bloqueia a UX em caso de erro
      }
    }

    if (id) sessionStorage.removeItem(stepKey(id));
    toast.success('Percurso concluído!', { description: 'Bom trabalho.' });
    navigate(guiaBaseUrl);
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto py-10 px-4 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !guia) {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4 text-center space-y-4">
        <p className="text-gray-500">Guia não encontrado.</p>
        <Button variant="ghost" onClick={() => navigate(guiaBaseUrl)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao Guia Temático
        </Button>
      </div>
    );
  }

  const progressPercent = (step / TOTAL_STEPS) * 100;

  return (
    <div className="min-h-screen bg-background">
      {/* Header fixo com progresso */}
      <div className="border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(guiaBaseUrl)}
            className="gap-2 text-gray-500 hover:text-gray-800 shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Guia Temático</span>
          </Button>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{guia.frase_tematica}</p>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-20 sm:w-28 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-600 transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 tabular-nums">{step}/{TOTAL_STEPS}</span>
            </div>
            {step > 1 && (
              <p className="text-[10px] font-medium text-purple-600 hidden sm:block">
                {STEP_LABELS[step]}
              </p>
            )}
          </div>
        </div>
      </div>

      {step === 1 && <GuiaTelaCapa guia={guia} onNext={handleNext} onGoToStep={handleGoToStep} />}
      {step === 2 && <GuiaTela2FraseTematica guia={guia} onNext={handleNext} onBack={handleBack} />}
      {step === 3 && <GuiaTela3Perguntas guia={guia} onNext={handleNext} onBack={handleBack} />}
      {step === 4 && <GuiaTela4Interpretacao guia={guia} onNext={handleNext} onBack={handleBack} />}
      {step === 5 && <GuiaTela5Vocabulario guia={guia} onNext={handleNext} onBack={handleBack} />}
      {step === 6 && <GuiaTela6Problematica guia={guia} onNext={handleNext} onBack={handleBack} />}
      {step === 7 && <GuiaTela7Associadas guia={guia} onNext={handleNext} onBack={handleBack} />}
      {step === 8 && <GuiaTela8Propostas guia={guia} onBack={handleBack} onConcluir={handleConcluir} />}
    </div>
  );
}
