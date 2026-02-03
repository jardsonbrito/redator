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
import { Video, NotebookPen, Presentation, Bell, ChevronRight } from 'lucide-react';
import { useAlertasAtividades, AlertaAtividade } from '@/hooks/useAlertasAtividades';

interface AlertasAtividadesModalProps {
  turma: string | null;
  userType: string;
  email: string;
}

const ICON_MAP = {
  aula_ao_vivo: Video,
  exercicio: NotebookPen,
  lousa: Presentation,
};

const LABEL_MAP = {
  aula_ao_vivo: 'Aula ao Vivo',
  exercicio: 'Exercício',
  lousa: 'Lousa',
};

const COLOR_MAP = {
  aula_ao_vivo: 'bg-red-100 text-red-800 border-red-200',
  exercicio: 'bg-blue-100 text-blue-800 border-blue-200',
  lousa: 'bg-purple-100 text-purple-800 border-purple-200',
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

    // Chave única por sessão para este usuário
    const sessionKey = `alertas-mostrados-${email}-${new Date().toDateString()}`;
    const alertasMostrados = JSON.parse(sessionStorage.getItem(sessionKey) || '[]');

    // Filtrar alertas que ainda não foram mostrados hoje
    const novosAlertas = alertas.filter(
      (alerta) => !alertasMostrados.includes(`${alerta.tipo}-${alerta.id}`)
    );

    if (novosAlertas.length > 0) {
      setAlertasParaMostrar(novosAlertas);
      setIsOpen(true);
    }
  }, [alertas, isLoading, email]);

  const handleConfirmar = () => {
    // Marcar todos os alertas como mostrados na sessão
    const sessionKey = `alertas-mostrados-${email}-${new Date().toDateString()}`;
    const alertasMostrados = JSON.parse(sessionStorage.getItem(sessionKey) || '[]');

    const novosIds = alertasParaMostrar.map((a) => `${a.tipo}-${a.id}`);
    sessionStorage.setItem(sessionKey, JSON.stringify([...alertasMostrados, ...novosIds]));

    setIsOpen(false);
  };

  const handleIrParaAtividade = (path: string) => {
    handleConfirmar();
    navigate(path);
  };

  if (alertasParaMostrar.length === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#3F0077]">
            <Bell className="h-5 w-5" />
            Atividades Disponíveis
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            {alertasParaMostrar.length === 1
              ? 'Há uma atividade disponível para você agora!'
              : `Há ${alertasParaMostrar.length} atividades disponíveis para você agora!`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3 max-h-[300px] overflow-y-auto">
          {alertasParaMostrar.map((alerta) => {
            const Icon = ICON_MAP[alerta.tipo];
            const label = LABEL_MAP[alerta.tipo];
            const colorClass = COLOR_MAP[alerta.tipo];

            return (
              <div
                key={`${alerta.tipo}-${alerta.id}`}
                className="flex items-center justify-between p-3 rounded-lg border bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => handleIrParaAtividade(alerta.path)}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-xs ${colorClass}`}>
                        {label}
                      </Badge>
                    </div>
                    <p className="font-medium text-sm mt-1">{alerta.titulo}</p>
                    {alerta.horario && (
                      <p className="text-xs text-muted-foreground">{alerta.horario}</p>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button
            onClick={handleConfirmar}
            className="w-full bg-[#3F0077] hover:bg-[#662F96]"
          >
            OK, entendi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
