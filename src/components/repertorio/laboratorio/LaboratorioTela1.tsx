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
    <div className="flex flex-col items-center justify-center min-h-[480px] py-12 px-4">
      <div className="max-w-2xl w-full mx-auto space-y-10 text-center">
        {/* Ícone decorativo */}
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center">
            <Quote className="h-7 w-7 text-purple-600" />
          </div>
        </div>

        {/* Frase temática em destaque */}
        <div className="space-y-6">
          <p className="text-sm font-medium text-purple-600 uppercase tracking-widest">
            Contexto temático
          </p>
          <blockquote className="text-2xl sm:text-3xl font-semibold text-gray-900 leading-relaxed">
            "{fraseTematica}"
          </blockquote>
        </div>

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

        {/* Separador */}
        <div className="w-16 h-px bg-gray-200 mx-auto" />

        {/* Botão de avanço */}
        <Button
          onClick={onNext}
          size="lg"
          className="gap-2 px-8"
        >
          Conhecer o repertório
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
