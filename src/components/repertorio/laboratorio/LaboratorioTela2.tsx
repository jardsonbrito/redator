import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getEixoColors } from '@/utils/eixoTematicoCores';
import { ChevronLeft, ChevronRight, BookOpen, User } from 'lucide-react';

interface LaboratorioTela2Props {
  nomeAutor: string;
  descricaoAutor: string;
  obraReferencia: string;
  ideiacEntral: string;
  imagemAutorUrl: string | null;
  eixos: string[];
  onNext: () => void;
  onBack: () => void;
}

export function LaboratorioTela2({
  nomeAutor,
  descricaoAutor,
  obraReferencia,
  ideiacEntral,
  imagemAutorUrl,
  eixos,
  onNext,
  onBack,
}: LaboratorioTela2Props) {
  return (
    <div className="py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Layout dividido: texto + imagem */}
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Bloco de texto (lado esquerdo) */}
          <div className="flex-1 space-y-6 min-w-0">
            {/* Nome do autor */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-purple-600 uppercase tracking-widest">
                Repertório
              </p>
              <h2 className="text-3xl font-bold text-gray-900">{nomeAutor}</h2>
            </div>

            {/* Descrição do autor */}
            <p className="text-gray-600 leading-relaxed text-base">{descricaoAutor}</p>

            {/* Obra de referência */}
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-gray-400 shrink-0" />
              <span className="text-sm font-medium text-gray-700">{obraReferencia}</span>
            </div>

            {/* Eixos */}
            {eixos.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {eixos.map((eixo) => {
                  const colors = getEixoColors(eixo);
                  return (
                    <Badge
                      key={eixo}
                      variant="outline"
                      className={`${colors.bg} ${colors.text} ${colors.border} text-xs`}
                    >
                      {eixo}
                    </Badge>
                  );
                })}
              </div>
            )}

            {/* Ideia central em destaque */}
            <div className={`border-l-4 border-purple-500 bg-purple-50 rounded-r-lg p-4 space-y-1`}>
              <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">
                Ideia central
              </p>
              <p className="text-gray-800 leading-relaxed">{ideiacEntral}</p>
            </div>
          </div>

          {/* Imagem do autor (lado direito) */}
          <div className="md:w-44 flex-shrink-0 flex flex-col items-center gap-3">
            {imagemAutorUrl ? (
              <img
                src={imagemAutorUrl}
                alt={`Foto de ${nomeAutor}`}
                className="w-36 h-36 md:w-44 md:h-44 rounded-xl object-cover shadow-md"
              />
            ) : (
              <div className="w-36 h-36 md:w-44 md:h-44 rounded-xl bg-purple-100 flex items-center justify-center shadow-md">
                <User className="h-16 w-16 text-purple-400" />
              </div>
            )}
            <p className="text-xs text-gray-500 text-center leading-tight">{nomeAutor}</p>
          </div>
        </div>

        {/* Navegação */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <Button variant="ghost" onClick={onBack} className="gap-2 text-gray-500">
            <ChevronLeft className="h-4 w-4" />
            Voltar
          </Button>
          <Button onClick={onNext} size="lg" className="gap-2 px-8">
            Ver a aplicação
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
