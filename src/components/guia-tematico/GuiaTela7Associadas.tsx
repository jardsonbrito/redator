import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { GuiaTematico } from '@/hooks/useGuiaTematico';

interface GuiaTela7Props {
  guia: GuiaTematico;
  onNext: () => void;
  onBack: () => void;
}

function ItemListBlock({ items }: { items: { titulo: string; descricao: string }[] }) {
  return (
    <div className="space-y-5">
      {items.map((item, index) => (
        <div key={index}>
          <p className="text-base font-semibold text-gray-900 mb-1">{item.titulo}</p>
          <p className="text-gray-700 leading-relaxed">{item.descricao}</p>
          {index < items.length - 1 && <hr className="mt-5 border-gray-100" />}
        </div>
      ))}
    </div>
  );
}

export function GuiaTela7Associadas({ guia, onNext, onBack }: GuiaTela7Props) {
  return (
    <div className="py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Cabeçalho */}
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-gray-900">Problemáticas associadas</h2>
        </div>

        <ItemListBlock items={guia.problematicas_associadas} />

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
