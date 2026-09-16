import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { GuiaTematico } from '@/hooks/useGuiaTematico';

interface GuiaTela4Props {
  guia: GuiaTematico;
  onNext: () => void;
  onBack: () => void;
}

export function GuiaTela4Interpretacao({ guia, onNext, onBack }: GuiaTela4Props) {
  return (
    <div className="py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Cabeçalho */}
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-gray-900">Interpretação do tema</h2>
        </div>

        {/* Texto interpretativo */}
        <div className="prose max-w-none">
          <p className="text-gray-800 text-base leading-[1.85] text-justify">
            {guia.interpretacao}
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
