import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { GuiaTematico } from '@/hooks/useGuiaTematico';

interface GuiaTela3Props {
  guia: GuiaTematico;
  onNext: () => void;
  onBack: () => void;
}

export function GuiaTela3Perguntas({ guia, onNext, onBack }: GuiaTela3Props) {
  return (
    <div className="py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Cabeçalho */}
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-gray-900">Questões norteadoras</h2>
        </div>

        {/* Lista numerada */}
        <div className="space-y-4">
          {guia.perguntas_norteadoras.map((pergunta, index) => (
            <div key={index} className="flex gap-4 items-start">
              <span className="w-7 h-7 rounded-full bg-purple-600 text-white text-sm font-bold flex items-center justify-center shrink-0 mt-0.5">
                {index + 1}
              </span>
              <p className="text-gray-800 leading-relaxed text-base pt-0.5">{pergunta}</p>
            </div>
          ))}
        </div>

        {/* Navegação */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <Button variant="ghost" onClick={onBack} className="gap-2 text-gray-500">
            <ChevronLeft className="h-4 w-4" />
            Voltar
          </Button>
          <Button onClick={onNext} size="lg" className="gap-2 px-8">
            Próximo
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
