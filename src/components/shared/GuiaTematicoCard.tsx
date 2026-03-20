import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Map } from 'lucide-react';
import { GuiaTematico } from '@/hooks/useGuiaTematico';
import { getGuiaCoverUrl } from '@/utils/guiaTematicoImageUtils';

interface GuiaTematicoCardProps {
  guia: GuiaTematico;
}

export function GuiaTematicoCard({ guia }: GuiaTematicoCardProps) {
  const navigate = useNavigate();

  const handleAcessar = () => {
    sessionStorage.removeItem(`guia_step_${guia.id}`);
    navigate(`/guia-tematico/${guia.id}`);
  };

  return (
    <Card className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 border-gray-200 flex flex-col h-full">
      {/* Imagem de capa */}
      <div className="w-full h-40 sm:h-44 overflow-hidden">
        <img
          src={getGuiaCoverUrl(guia)}
          alt={`Capa do guia: ${guia.frase_tematica}`}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = '/lovable-uploads/66db3418-766f-47b9-836b-07a6a228a79c.png';
          }}
        />
      </div>

      {/* Conteúdo */}
      <div className="p-4 flex-1 flex flex-col">
        {/* Ícone + label */}
        <div className="flex items-center gap-1.5 mb-2">
          <Map className="h-4 w-4 text-purple-600 shrink-0" />
          <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">
            Guia Temático
          </span>
        </div>

        {/* Frase temática */}
        <p className="text-sm font-semibold text-gray-900 line-clamp-3 leading-snug flex-1">
          "{guia.frase_tematica}"
        </p>
      </div>

      {/* Rodapé */}
      <div className="px-4 py-3 border-t border-gray-100 mt-auto">
        <Button
          onClick={handleAcessar}
          className="w-full bg-purple-600 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-purple-700 transition-all duration-200 shadow-sm hover:shadow-md"
        >
          Acessar Guia
        </Button>
      </div>
    </Card>
  );
}
