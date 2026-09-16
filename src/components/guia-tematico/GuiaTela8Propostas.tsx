import { Button } from '@/components/ui/button';
import { ChevronLeft, CheckCircle2 } from 'lucide-react';
import { GuiaTematico } from '@/hooks/useGuiaTematico';

interface GuiaTela8Props {
  guia: GuiaTematico;
  onBack: () => void;
  onConcluir: () => void;
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

export function GuiaTela8Propostas({ guia, onBack, onConcluir }: GuiaTela8Props) {
  return (
    <div className="py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Cabeçalho */}
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-gray-900">Propostas de solução</h2>
        </div>

        <ItemListBlock items={guia.propostas_solucao} />

        {/* Navegação */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100">
          <Button variant="ghost" onClick={onBack} className="gap-2 text-gray-500 w-full sm:w-auto">
            <ChevronLeft className="h-4 w-4" />
            Voltar
          </Button>
          <Button
            onClick={onConcluir}
            size="lg"
            className="gap-2 px-8 bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
          >
            <CheckCircle2 className="h-5 w-5" />
            Concluir guia
          </Button>
        </div>
      </div>
    </div>
  );
}
