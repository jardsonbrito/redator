import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, PenLine, CheckCircle2 } from 'lucide-react';
import { LaboratorioAula } from '@/hooks/useRepertorioLaboratorio';
import { AplicarRedacaoModal } from './AplicarRedacaoModal';

interface LaboratorioTela3Props {
  aula: LaboratorioAula;
  onBack: () => void;
  onConcluir: () => void;
}

export function LaboratorioTela3({ aula, onBack, onConcluir }: LaboratorioTela3Props) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Cabeçalho da tela */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-purple-600 uppercase tracking-widest">
            Aplicação prática
          </p>
          <h2 className="text-2xl font-bold text-gray-900">Parágrafo modelo (ENEM)</h2>
          <p className="text-gray-500 text-sm">
            Veja como o repertório de{' '}
            <span className="font-medium text-gray-700">{aula.nome_autor}</span> é aplicado em um
            parágrafo real no padrão ENEM.
          </p>
        </div>

        {/* Parágrafo em destaque */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 sm:p-8">
          <p className="text-gray-800 text-base sm:text-lg leading-[1.9] font-light tracking-wide">
            {aula.paragrafo_modelo}
          </p>
        </div>

        {/* Observação didática do professor */}
        {aula.observacao_paragrafo && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-2">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
              Comentário do professor
            </p>
            <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-wrap">
              {aula.observacao_paragrafo}
            </p>
          </div>
        )}

        {/* Referência compacta */}
        <div className="flex items-center gap-2 text-sm text-gray-500 border-l-2 border-purple-200 pl-3">
          <span className="font-medium text-gray-700">{aula.nome_autor}</span>
          <span>·</span>
          <span className="italic">{aula.obra_referencia}</span>
        </div>

        {/* Ações */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100">
          <Button variant="ghost" onClick={onBack} className="gap-2 text-gray-500 w-full sm:w-auto">
            <ChevronLeft className="h-4 w-4" />
            Voltar
          </Button>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {/* Botão principal: Aplicar em uma redação */}
            <Button
              onClick={() => setModalOpen(true)}
              size="lg"
              className="gap-2 px-6 w-full sm:w-auto"
            >
              <PenLine className="h-4 w-4" />
              Aplicar em uma redação
            </Button>

            {/* Concluir aula */}
            <Button
              variant="outline"
              size="lg"
              onClick={onConcluir}
              className="gap-2 border-green-200 text-green-700 hover:bg-green-50 w-full sm:w-auto"
            >
              <CheckCircle2 className="h-4 w-4" />
              Concluir aula
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de aplicação */}
      <AplicarRedacaoModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        aula={aula}
      />
    </div>
  );
}
