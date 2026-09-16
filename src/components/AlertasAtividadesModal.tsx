import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Video, NotebookPen, Presentation, Bell, ChevronRight, Calendar, Radio, PenLine } from 'lucide-react';
import { useAlertasAtividades, AlertaAtividade } from '@/hooks/useAlertasAtividades';

interface AlertasAtividadesModalProps {
  turma: string | null;
  userType: string;
  email: string;
}

const ICON_MAP: Record<string, typeof Video> = {
  aula_ao_vivo: Radio,
  aula_hoje: Calendar,
  aula_agendada: Video,
  exercicio: NotebookPen,
  lousa: Presentation,
  tema: PenLine,
};

const LABEL_MAP: Record<string, string> = {
  aula_ao_vivo: 'AO VIVO AGORA',
  aula_hoje: 'Hoje',
  aula_agendada: 'Agendada',
  exercicio: 'Exercício',
  lousa: 'Lousa',
  tema: 'Novo Tema',
};

const COLOR_MAP: Record<string, string> = {
  aula_ao_vivo: 'bg-red-500 text-white border-red-600 animate-pulse',
  aula_hoje: 'bg-orange-100 text-orange-800 border-orange-200',
  aula_agendada: 'bg-blue-100 text-blue-800 border-blue-200',
  exercicio: 'bg-green-100 text-green-800 border-green-200',
  lousa: 'bg-purple-100 text-purple-800 border-purple-200',
  tema: 'bg-amber-100 text-amber-800 border-amber-200',
};

const CARD_COLOR_MAP: Record<string, string> = {
  aula_ao_vivo: 'border-red-400 bg-red-50',
  aula_hoje: 'border-orange-300 bg-orange-50',
  aula_agendada: 'border-blue-200 bg-blue-50',
  exercicio: 'border-green-200 bg-green-50',
  lousa: 'border-purple-200 bg-purple-50',
  tema: 'border-amber-200 bg-amber-50',
};

const getStorageKey = (email: string, tipo: string, id: string): string => {
  const hoje = new Date().toDateString();

  switch (tipo) {
    case 'aula_ao_vivo':
      return '';
    case 'aula_hoje':
      return `alerta-${email}-${tipo}-${id}-${hoje}`;
    case 'aula_agendada':
      return `alerta-${email}-${tipo}-${id}`;
    case 'tema':
      return `alerta-${email}-${tipo}-${id}-${hoje}`;
    default:
      return `alerta-${email}-${tipo}-${id}-${hoje}`;
  }
};

const markAsSeen = (email: string, alerta: AlertaAtividade) => {
  const storageKey = getStorageKey(email, alerta.tipo, alerta.id);
  if (storageKey) localStorage.setItem(storageKey, 'true');
};

export function AlertasAtividadesModal({ turma, userType, email }: AlertasAtividadesModalProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [alertasParaMostrar, setAlertasParaMostrar] = useState<AlertaAtividade[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const { data: alertas, isLoading } = useAlertasAtividades({
    turma,
    userType,
    email,
    enabled: !!email,
  });

  useEffect(() => {
    if (isLoading || !alertas || alertas.length === 0) return;

    const novosAlertas = alertas.filter((alerta) => {
      const storageKey = getStorageKey(email, alerta.tipo, alerta.id);
      if (storageKey === '') return true;
      return !localStorage.getItem(storageKey);
    });

    if (novosAlertas.length > 0) {
      setAlertasParaMostrar(novosAlertas);
      setCurrentIndex(0);
      setIsOpen(true);
    }
  }, [alertas, isLoading, email]);

  const currentAlerta = alertasParaMostrar[currentIndex];
  const total = alertasParaMostrar.length;
  const isLast = currentIndex === total - 1;

  const handleAvancar = () => {
    markAsSeen(email, currentAlerta);
    if (isLast) {
      setIsOpen(false);
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  const handleIrParaAtividade = (alerta: AlertaAtividade) => {
    markAsSeen(email, alerta);
    setIsOpen(false);
    navigate(alerta.path);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      alertasParaMostrar.slice(currentIndex).forEach((alerta) => markAsSeen(email, alerta));
    }
    setIsOpen(open);
  };

  if (!currentAlerta) return null;

  const temAulaAoVivo = currentAlerta.tipo === 'aula_ao_vivo';
  const Icon = ICON_MAP[currentAlerta.tipo] || Bell;
  const label = LABEL_MAP[currentAlerta.tipo] || currentAlerta.tipo;
  const colorClass = COLOR_MAP[currentAlerta.tipo] || 'bg-gray-100 text-gray-800';
  const cardColorClass = CARD_COLOR_MAP[currentAlerta.tipo] || 'border-gray-200 bg-gray-50';

  const getDescricaoModal = () => {
    if (currentAlerta.tipo === 'aula_ao_vivo') return 'Há uma aula ao vivo acontecendo agora! Entre para participar.';
    if (currentAlerta.tipo === 'aula_hoje') return 'Você tem uma atividade programada para hoje!';
    return 'Você tem uma nova atividade disponível!';
  };

  const renderAlertaInfo = (alerta: AlertaAtividade) => {
    switch (alerta.tipo) {
      case 'aula_ao_vivo':
        return (
          <>
            <p className="font-semibold text-sm text-red-800">{alerta.titulo}</p>
            <p className="text-xs text-red-600 font-medium">Acontecendo agora • {alerta.horario}</p>
          </>
        );
      case 'aula_hoje':
        return (
          <>
            <p className="font-medium text-sm">{alerta.titulo}</p>
            <p className="text-xs text-muted-foreground">Hoje às {alerta.horario}</p>
          </>
        );
      case 'aula_agendada':
        return (
          <>
            <p className="font-medium text-sm">{alerta.titulo}</p>
            <p className="text-xs text-muted-foreground">{alerta.data} às {alerta.horario}</p>
          </>
        );
      case 'tema':
        return (
          <>
            <p className="font-medium text-sm">{alerta.titulo}</p>
            <p className="text-xs text-muted-foreground">Novo tema disponível — escreva sua redação!</p>
          </>
        );
      default:
        return <p className="font-medium text-sm">{alerta.titulo}</p>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className={`sm:max-w-md ${temAulaAoVivo ? 'border-red-300' : ''}`}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className={`flex items-center gap-2 ${temAulaAoVivo ? 'text-red-600' : 'text-[#3F0077]'}`}>
              {temAulaAoVivo ? (
                <Radio className="h-5 w-5 animate-pulse" />
              ) : (
                <Bell className="h-5 w-5" />
              )}
              {temAulaAoVivo ? 'Aula ao Vivo!' : 'Atividades Disponíveis'}
            </DialogTitle>
            {total > 1 && (
              <span className="text-xs text-muted-foreground font-medium">
                {currentIndex + 1} de {total}
              </span>
            )}
          </div>
          <DialogDescription className="text-base pt-2">
            {getDescricaoModal()}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div
            className={`flex items-center justify-between p-3 rounded-lg border-2 hover:opacity-90 transition-all cursor-pointer ${cardColorClass}`}
            onClick={() => handleIrParaAtividade(currentAlerta)}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${colorClass}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <Badge variant="outline" className={`text-xs mb-1 ${colorClass}`}>
                  {label}
                </Badge>
                {renderAlertaInfo(currentAlerta)}
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>

        {total > 1 && (
          <div className="flex justify-center gap-1.5 pb-1">
            {alertasParaMostrar.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === currentIndex ? 'w-4 bg-[#3F0077]' : 'w-1.5 bg-gray-200'
                }`}
              />
            ))}
          </div>
        )}

        <DialogFooter>
          <Button
            onClick={handleAvancar}
            className={`w-full ${temAulaAoVivo ? 'bg-red-600 hover:bg-red-700' : 'bg-[#3F0077] hover:bg-[#662F96]'}`}
          >
            {isLast ? 'OK, entendi' : 'Próximo →'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
