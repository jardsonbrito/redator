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

function contarPalavras(texto: string): number {
  return texto.trim().split(/\s+/).filter(Boolean).length;
}

function contarPeriodos(texto: string): number {
  return (texto.match(/[^.!?]*[.!?]+/g) || []).filter((s) => s.trim().length > 0).length;
}

export function LaboratorioTela3({ aula, onBack, onConcluir }: LaboratorioTela3Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const palavras = contarPalavras(aula.paragrafo_modelo);
  const periodos = contarPeriodos(aula.paragrafo_modelo);

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

        {/* Parágrafo — estilo folha de redação */}
        <div className="rounded-xl overflow-hidden shadow-sm border border-gray-200">
          {/* Cabeçalho da folha */}
          <div className="bg-gray-50 border-b border-gray-200 px-5 py-2.5 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-400" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-widest">
              Parágrafo
            </span>
          </div>

          {/* Corpo — papel limpo com margem lateral */}
          <div className="relative bg-white">
            {/* Margem esquerda decorativa */}
            <div
              className="absolute top-0 bottom-0 left-10 w-px bg-rose-200 opacity-60"
              aria-hidden="true"
            />

            <p
              className="relative text-gray-800 text-base leading-[1.9] font-light tracking-wide text-justify pl-14 pr-6 sm:pr-8 py-5"
              style={{ textIndent: '2em' }}
            >
              {aula.paragrafo_modelo}
            </p>
          </div>

          {/* Rodapé com contadores */}
          <div className="border-t border-gray-100 px-6 py-3 flex gap-6 bg-gray-50">
            <span className="text-xs text-gray-500">
              <span className="font-semibold text-gray-800">{palavras}</span> palavras
            </span>
            <span className="text-xs text-gray-500">
              <span className="font-semibold text-gray-800">{periodos}</span>{' '}
              {periodos === 1 ? 'período sintático' : 'períodos sintáticos'}
            </span>
          </div>
        </div>

        {/* Comentário do professor — separação reforçada */}
        {aula.observacao_paragrafo && (
          <div className="relative">
            {/* Conector visual */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 bg-white px-2">análise do professor</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-2">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                Comentário
              </p>
              <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-wrap">
                {aula.observacao_paragrafo}
              </p>
            </div>
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
            <Button
              onClick={() => setModalOpen(true)}
              size="lg"
              className="gap-2 px-6 w-full sm:w-auto"
            >
              <PenLine className="h-4 w-4" />
              Aplicar em uma redação
            </Button>

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

      <AplicarRedacaoModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        aula={aula}
      />
    </div>
  );
}
