import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LaboratorioAula as AulaType } from '@/hooks/useRepertorioLaboratorio';
import { LaboratorioTela1 } from './LaboratorioTela1';
import { LaboratorioTela2 } from './LaboratorioTela2';
import { LaboratorioTela3 } from './LaboratorioTela3';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Step = 1 | 2 | 3;

const STEP_LABELS: Record<Step, string> = {
  1: 'Contexto',
  2: 'Repertório',
  3: 'Aplicação',
};

// Chave de sessionStorage para persistir step entre refreshes
function stepKey(aulaId: string) {
  return `lab_step_${aulaId}`;
}

export function LaboratorioAulaView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Persistência do step via sessionStorage
  const savedStep = id ? sessionStorage.getItem(stepKey(id)) : null;
  const [step, setStep] = useState<Step>(
    savedStep ? (Math.min(Math.max(parseInt(savedStep), 1), 3) as Step) : 1
  );

  const { data: aula, isLoading, error } = useQuery({
    queryKey: ['repertorio-laboratorio-aula', id],
    queryFn: async (): Promise<AulaType> => {
      const { data, error } = await supabase
        .from('repertorio_laboratorio')
        .select('*')
        .eq('id', id!)
        .single();

      if (error) throw error;
      return data as AulaType;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });

  // Persiste o step atual no sessionStorage
  useEffect(() => {
    if (id) {
      sessionStorage.setItem(stepKey(id), String(step));
    }
  }, [step, id]);

  // Limpa o step salvo ao sair (quando componente é desmontado)
  useEffect(() => {
    return () => {
      if (id) sessionStorage.removeItem(stepKey(id));
    };
  }, [id]);

  // Scroll to top a cada mudança de step
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const handleNext = () => {
    if (step < 3) setStep((s) => (s + 1) as Step);
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => (s - 1) as Step);
  };

  const handleConcluir = () => {
    if (id) sessionStorage.removeItem(stepKey(id));
    toast.success('Bom trabalho.', { description: 'Aula concluída.' });
    navigate('/repertorio-orientado?tab=laboratorio');
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

  if (error || !aula) {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4 text-center space-y-4">
        <p className="text-gray-500">Aula não encontrada.</p>
        <Button variant="ghost" onClick={() => navigate('/repertorio-orientado?tab=laboratorio')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao Laboratório
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Topo da aula */}
      <div className="border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/repertorio-orientado?tab=laboratorio')}
            className="gap-2 text-gray-500 hover:text-gray-800 shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Laboratório</span>
          </Button>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{aula.titulo}</p>
          </div>

          {/* Stepper */}
          <div className="flex items-center gap-1 shrink-0">
            {([1, 2, 3] as Step[]).map((s, idx) => (
              <div key={s} className="flex items-center gap-1">
                {idx > 0 && (
                  <div
                    className={cn(
                      'h-px w-6 transition-colors',
                      step > s - 1 ? 'bg-purple-400' : 'bg-gray-200'
                    )}
                  />
                )}
                <div className="flex flex-col items-center gap-0.5">
                  <div
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-all',
                      step === s
                        ? 'bg-purple-600 text-white'
                        : step > s
                        ? 'bg-purple-200 text-purple-700'
                        : 'bg-gray-100 text-gray-400'
                    )}
                  >
                    {step > s ? <CheckCircle className="h-3.5 w-3.5" /> : s}
                  </div>
                  <span
                    className={cn(
                      'hidden sm:block text-[10px] leading-none transition-colors',
                      step === s ? 'text-purple-600 font-medium' : 'text-gray-400'
                    )}
                  >
                    {STEP_LABELS[s]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Conteúdo da tela atual */}
      <div className="transition-opacity duration-200">
        {step === 1 && (
          <LaboratorioTela1
            fraseTematica={aula.frase_tematica}
            eixos={aula.eixos}
            onNext={handleNext}
          />
        )}
        {step === 2 && (
          <LaboratorioTela2
            nomeAutor={aula.nome_autor}
            descricaoAutor={aula.descricao_autor}
            obraReferencia={aula.obra_referencia}
            ideiacEntral={aula.ideia_central}
            imagemAutorUrl={aula.imagem_autor_url}
            eixos={aula.eixos}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}
        {step === 3 && (
          <LaboratorioTela3
            aula={aula}
            onBack={handleBack}
            onConcluir={handleConcluir}
          />
        )}
      </div>
    </div>
  );
}
