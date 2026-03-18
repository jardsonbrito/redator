import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { getEixoColors } from '@/utils/eixoTematicoCores';
import { LaboratorioAula } from '@/hooks/useRepertorioLaboratorio';
import { User } from 'lucide-react';

interface LaboratorioAulaCardProps {
  aula: LaboratorioAula;
}

export function LaboratorioAulaCard({ aula }: LaboratorioAulaCardProps) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/repertorio-orientado/laboratorio/${aula.id}`)}
      className="group w-full text-left bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-purple-200 transition-all duration-200 overflow-hidden"
    >
      {/* Imagem do autor */}
      <div className="aspect-square w-full bg-purple-50 overflow-hidden relative">
        {aula.imagem_autor_url ? (
          <img
            src={aula.imagem_autor_url}
            alt={`Foto de ${aula.nome_autor}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-purple-200 flex items-center justify-center">
              <User className="h-10 w-10 text-purple-500" />
            </div>
          </div>
        )}

        {/* Overlay sutil no hover */}
        <div className="absolute inset-0 bg-purple-900/0 group-hover:bg-purple-900/10 transition-colors duration-200" />
      </div>

      {/* Conteúdo */}
      <div className="p-4 space-y-3">
        {/* Título */}
        <div>
          <h3 className="font-bold text-gray-900 text-base leading-tight group-hover:text-purple-700 transition-colors">
            {aula.titulo}
          </h3>
          <p className="text-sm text-gray-500 mt-1 line-clamp-2 leading-relaxed">
            {aula.subtitulo}
          </p>
        </div>

        {/* Eixos */}
        {aula.eixos.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {aula.eixos.slice(0, 3).map((eixo) => {
              const colors = getEixoColors(eixo);
              return (
                <Badge
                  key={eixo}
                  variant="outline"
                  className={`${colors.bg} ${colors.text} ${colors.border} text-xs px-2 py-0.5`}
                >
                  {eixo}
                </Badge>
              );
            })}
            {aula.eixos.length > 3 && (
              <span className="text-xs text-gray-400">+{aula.eixos.length - 3}</span>
            )}
          </div>
        )}

        {/* Botão de acesso */}
        <div className="pt-1">
          <span className="block w-full text-center text-xs font-semibold py-1.5 rounded-lg bg-purple-600 text-white group-hover:bg-purple-700 transition-colors">
            Ver aula
          </span>
        </div>
      </div>
    </button>
  );
}
