import { Button } from '@/components/ui/button';
import { ChevronRight, Map } from 'lucide-react';
import { GuiaTematico } from '@/hooks/useGuiaTematico';
import { getGuiaCoverUrl } from '@/utils/guiaTematicoImageUtils';

const STEP_LABELS = [
  'Análise da frase temática',
  'Questões norteadoras',
  'Interpretação do tema',
  'Vocabulário temático',
  'Problemática central',
  'Problemáticas associadas',
  'Propostas de solução',
];

interface GuiaTelaCapaProps {
  guia: GuiaTematico;
  onNext: () => void;
  onGoToStep: (step: number) => void;
}

export function GuiaTelaCapa({ guia, onNext, onGoToStep }: GuiaTelaCapaProps) {
  return (
    <div className="py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Imagem de capa */}
        <div className="rounded-xl overflow-hidden shadow-sm">
          <img
            src={getGuiaCoverUrl(guia)}
            alt={`Capa: ${guia.frase_tematica}`}
            className="w-full h-48 sm:h-56 object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/lovable-uploads/66db3418-766f-47b9-836b-07a6a228a79c.png';
            }}
          />
        </div>

        {/* Ícone + label + frase */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <Map className="h-5 w-5 text-purple-600" />
            <span className="text-xs font-semibold text-purple-600 uppercase tracking-widest">
              Guia Temático
            </span>
          </div>
          <blockquote className="text-2xl sm:text-3xl font-bold text-gray-900 leading-snug">
            "{guia.frase_tematica}"
          </blockquote>
        </div>

        {/* Roteiro do percurso */}
        <div className="bg-purple-50 border border-purple-100 rounded-xl p-5 space-y-3">
          <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">
            O que este guia lhe traz
          </p>
          <ol className="space-y-2">
            {STEP_LABELS.map((label, index) => (
              <li
                key={index}
                className="flex items-center gap-3 cursor-pointer group"
                onClick={() => onGoToStep(index + 2)}
              >
                <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                  {index + 1}
                </span>
                <span className="text-sm text-gray-700 group-hover:text-purple-700 group-hover:underline transition-colors">
                  {label}
                </span>
              </li>
            ))}
          </ol>
        </div>

        {/* Botão de início */}
        <div className="flex justify-center pt-2">
          <Button onClick={onNext} size="lg" className="gap-2 px-10">
            Iniciar percurso
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
