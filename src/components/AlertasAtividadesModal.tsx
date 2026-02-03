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
import { Video, NotebookPen, Presentation, Bell, ChevronRight, Calendar, Radio } from 'lucide-react';
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
};

const LABEL_MAP: Record<string, string> = {
  aula_ao_vivo: 'AO VIVO AGORA',
  aula_hoje: 'Hoje',
  aula_agendada: 'Agendada',
  exercicio: 'Exercício',
  lousa: 'Lousa',
};

const COLOR_MAP: Record<string, string> = {
  aula_ao_vivo: 'bg-red-500 text-white border-red-600 animate-pulse',
  aula_hoje: 'bg-orange-100 text-orange-800 border-orange-200',
  aula_agendada: 'bg-blue-100 text-blue-800 border-blue-200',
  exercicio: 'bg-green-100 text-green-800 border-green-200',
  lousa: 'bg-purple-100 text-purple-800 border-purple-200',
};

const CARD_COLOR_MAP: Record<string, string> = {
  aula_ao_vivo: 'border-red-400 bg-red-50',
  aula_hoje: 'border-orange-300 bg-orange-50',
  aula_agendada: 'border-blue-200 bg-blue-50',
  exercicio: 'border-green-200 bg-green-50',
  lousa: 'border-purple-200 bg-purple-50',
};

// Função para gerar chave de armazenamento baseada no tipo de alerta
const getStorageKey = (email: string, tipo: string, id: string): string => {
  const hoje = new Date().toDateString();

  switch (tipo) {
    case 'aula_ao_vivo':
      // Aula ao vivo: mostrar SEMPRE durante a aula (não armazena)
      return ''; // Retorna vazio para não armazenar
    case 'aula_hoje':
      // Aula hoje: mostrar uma vez por dia
      return `alerta-${email}-${tipo}-${id}-${hoje}`;
    case 'aula_agendada':
      // Aula agendada: mostrar uma vez (até ser vista)
      return `alerta-${email}-${tipo}-${id}`;
    default:
      // Exercícios e Lousa: mostrar uma vez por dia
      return `alerta-${email}-${tipo}-${id}-${hoje}`;
  }
};

export function AlertasAtividadesModal({ turma, userType, email }: AlertasAtividadesModalProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [alertasParaMostrar, setAlertasParaMostrar] = useState<AlertaAtividade[]>([]);

  const { data: alertas, isLoading } = useAlertasAtividades({
    turma,
    userType,
    enabled: !!email,
  });

  useEffect(() => {
    if (isLoading || !alertas || alertas.length === 0) return;

    // Filtrar alertas que ainda não foram mostrados
    const novosAlertas = alertas.filter((alerta) => {
      const storageKey = getStorageKey(email, alerta.tipo, alerta.id);

      // Aula ao vivo: sempre mostrar
      if (storageKey === '') return true;

      // Verificar se já foi mostrado
      const jaMostrado = localStorage.getItem(storageKey);
      return !jaMostrado;
    });

    if (novosAlertas.length > 0) {
      setAlertasParaMostrar(novosAlertas);
      setIsOpen(true);
    }
  }, [alertas, isLoading, email]);

  const handleConfirmar = () => {
    // Marcar alertas como mostrados
    alertasParaMostrar.forEach((alerta) => {
      const storageKey = getStorageKey(email, alerta.tipo, alerta.id);
      if (storageKey) {
        localStorage.setItem(storageKey, 'true');
      }
    });

    setIsOpen(false);
  };

  const handleIrParaAtividade = (alerta: AlertaAtividade) => {
    // Marcar este alerta específico como mostrado
    const storageKey = getStorageKey(email, alerta.tipo, alerta.id);
    if (storageKey) {
      localStorage.setItem(storageKey, 'true');
    }

    setIsOpen(false);
    navigate(alerta.path);
  };

  const getDescricaoModal = () => {
    const temAulaAoVivo = alertasParaMostrar.some(a => a.tipo === 'aula_ao_vivo');
    const temAulaHoje = alertasParaMostrar.some(a => a.tipo === 'aula_hoje');

    if (temAulaAoVivo) {
      return 'Há uma aula ao vivo acontecendo agora! Entre para participar.';
    }
    if (temAulaHoje) {
      return 'Você tem atividades programadas para hoje!';
    }
    return 'Você tem novas atividades disponíveis!';
  };

  const renderAlertaInfo = (alerta: AlertaAtividade) => {
    switch (alerta.tipo) {
      case 'aula_ao_vivo':
        return (
          <>
            <p className="font-semibold text-sm text-red-800">{alerta.titulo}</p>
            <p className="text-xs text-red-600 font-medium">
              Acontecendo agora • {alerta.horario}
            </p>
          </>
        );
      case 'aula_hoje':
        return (
          <>
            <p className="font-medium text-sm">{alerta.titulo}</p>
            <p className="text-xs text-muted-foreground">
              Hoje às {alerta.horario}
            </p>
          </>
        );
      case 'aula_agendada':
        return (
          <>
            <p className="font-medium text-sm">{alerta.titulo}</p>
            <p className="text-xs text-muted-foreground">
              {alerta.data} às {alerta.horario}
            </p>
          </>
        );
      default:
        return (
          <>
            <p className="font-medium text-sm">{alerta.titulo}</p>
          </>
        );
    }
  };

  if (alertasParaMostrar.length === 0) return null;

  const temAulaAoVivo = alertasParaMostrar.some(a => a.tipo === 'aula_ao_vivo');

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className={`sm:max-w-md ${temAulaAoVivo ? 'border-red-300' : ''}`}>
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${temAulaAoVivo ? 'text-red-600' : 'text-[#3F0077]'}`}>
            {temAulaAoVivo ? (
              <Radio className="h-5 w-5 animate-pulse" />
            ) : (
              <Bell className="h-5 w-5" />
            )}
            {temAulaAoVivo ? 'Aula ao Vivo!' : 'Atividades Disponíveis'}
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            {getDescricaoModal()}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3 max-h-[300px] overflow-y-auto">
          {alertasParaMostrar.map((alerta) => {
            const Icon = ICON_MAP[alerta.tipo] || Bell;
            const label = LABEL_MAP[alerta.tipo] || alerta.tipo;
            const colorClass = COLOR_MAP[alerta.tipo] || 'bg-gray-100 text-gray-800';
            const cardColorClass = CARD_COLOR_MAP[alerta.tipo] || 'border-gray-200 bg-gray-50';

            return (
              <div
                key={`${alerta.tipo}-${alerta.id}`}
                className={`flex items-center justify-between p-3 rounded-lg border-2 hover:opacity-90 transition-all cursor-pointer ${cardColorClass}`}
                onClick={() => handleIrParaAtividade(alerta)}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <Badge variant="outline" className={`text-xs mb-1 ${colorClass}`}>
                      {label}
                    </Badge>
                    {renderAlertaInfo(alerta)}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button
            onClick={handleConfirmar}
            className={`w-full ${temAulaAoVivo ? 'bg-red-600 hover:bg-red-700' : 'bg-[#3F0077] hover:bg-[#662F96]'}`}
          >
            OK, entendi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
