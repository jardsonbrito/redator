import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { GuiaTematico } from '@/hooks/useGuiaTematico';

interface GuiaTela2Props {
  guia: GuiaTematico;
  onNext: () => void;
  onBack: () => void;
}

export function GuiaTela2FraseTematica({ guia, onNext, onBack }: GuiaTela2Props) {
  return (
    <div className="py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Cabeçalho */}
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-gray-900">Análise da frase temática</h2>
        </div>

        {/* Comando do tema */}
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 px-5 py-2.5 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-400" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
              Comando do tema
            </span>
          </div>
          <div className="px-5 py-4">
            <p className="text-gray-800 leading-relaxed">{guia.comando_tema}</p>
          </div>
        </div>

        {/* Núcleo temático */}
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 px-5 py-2.5 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-400" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
              Núcleo temático
            </span>
          </div>
          <div className="px-5 py-4">
            <p className="text-gray-800 leading-relaxed font-medium">{guia.nucleo_tematico}</p>
          </div>
        </div>

        {/* Contexto */}
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 px-5 py-2.5 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
              Contexto
            </span>
          </div>
          <div className="px-5 py-4">
            <p className="text-gray-800 leading-relaxed">{guia.contexto}</p>
          </div>
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
