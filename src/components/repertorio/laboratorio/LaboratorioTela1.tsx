import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getEixoColors } from '@/utils/eixoTematicoCores';
import { ChevronRight, Quote } from 'lucide-react';

interface LaboratorioTela1Props {
  fraseTematica: string;
  eixos: string[];
  onNext: () => void;
}

export function LaboratorioTela1({ fraseTematica, eixos, onNext }: LaboratorioTela1Props) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4">
      <div className="max-w-xl w-full mx-auto space-y-6 text-center">

        {/* Ícone + Rótulo compactos */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
            <Quote className="h-5 w-5 text-purple-600" />
          </div>
          <p className="text-xs font-medium text-purple-600 uppercase tracking-widest">
            Frase temática
          </p>
        </div>

        {/* Frase temática — tamanho reduzido */}
        <blockquote className="text-xl sm:text-2xl font-semibold text-gray-900 leading-relaxed">
          "{fraseTematica}"
        </blockquote>

        {/* Eixos */}
        {eixos.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2">
            {eixos.map((eixo) => {
              const colors = getEixoColors(eixo);
              return (
                <Badge
                  key={eixo}
                  variant="outline"
                  className={`${colors.bg} ${colors.text} ${colors.border} px-3 py-1 text-sm font-medium`}
                >
                  {eixo}
                </Badge>
              );
            })}
          </div>
        )}

        {/* Botão de avanço */}
        <Button onClick={onNext} size="lg" className="gap-2 px-8">
          Conhecer o repertório
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
