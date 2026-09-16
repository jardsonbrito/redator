import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { GuiaTematico } from '@/hooks/useGuiaTematico';

interface GuiaTela6Props {
  guia: GuiaTematico;
  onNext: () => void;
  onBack: () => void;
}

export function GuiaTela6Problematica({ guia, onNext, onBack }: GuiaTela6Props) {
  return (
    <div className="py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Cabeçalho */}
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-gray-900">Problemática central</h2>
        </div>

        {/* Texto da problemática */}
        <div className="border-l-4 border-purple-500 bg-purple-50 rounded-r-xl p-5">
          <p className="text-gray-800 text-base leading-[1.85] text-justify">
            {guia.problematica_central}
          </p>
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
