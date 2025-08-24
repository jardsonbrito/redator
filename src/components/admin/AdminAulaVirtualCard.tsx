import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Calendar, Clock, ExternalLink, Trash2, Power, PowerOff, Edit, Radio, BarChart3, Video } from "lucide-react";
import { computeStatus } from "@/utils/aulaStatus";

interface AulaVirtual {
  id: string;
  titulo: string;
  descricao: string;
  data_aula: string;
  horario_inicio: string;
  horario_fim: string;
  turmas_autorizadas: string[];
  imagem_capa_url: string;
  link_meet: string;
  abrir_aba_externa: boolean;
  ativo: boolean;
  criado_em: string;
  eh_aula_ao_vivo?: boolean;
  status_transmissao?: string;
}

interface AdminAulaVirtualCardProps {
  aula: AulaVirtual;
  onEdit?: (aula: AulaVirtual) => void;
  onToggleStatus: (id: string, currentStatus: boolean) => void;
  onDelete: (id: string) => void;
  onOpenFrequencia: (aula: AulaVirtual) => void;
}

export const AdminAulaVirtualCard = ({ 
  aula, 
  onEdit, 
  onToggleStatus, 
  onDelete,
  onOpenFrequencia 
}: AdminAulaVirtualCardProps) => {
  
  const getStatusBadge = () => {
    if (!aula.eh_aula_ao_vivo) return null;
    
    try {
      if (!aula.data_aula || !aula.horario_inicio || !aula.horario_fim) {
        return null;
      }

      const dateParts = aula.data_aula.split('-');
      if (dateParts.length !== 3) {
        return null;
      }

      const [year, month, day] = dateParts;
      const formattedDate = `${day}/${month}/${year}`;
      
      if (!aula.horario_inicio.includes(':') || !aula.horario_fim.includes(':')) {
        return null;
      }

      const status = computeStatus({
        data_aula: formattedDate,
        horario_inicio: aula.horario_inicio,
        horario_fim: aula.horario_fim
      });

      const statusMap = {
        'agendada': { text: 'Agendada', variant: 'secondary' as const },
        'ao_vivo': { text: 'AO VIVO', variant: 'destructive' as const },
        'encerrada': { text: 'Encerrada', variant: 'outline' as const },
        'indefinido': { text: 'Indefinido', variant: 'outline' as const }
      };

      const currentStatus = statusMap[status] || statusMap['indefinido'];
      
      return (
        <Badge variant={currentStatus.variant} className="text-xs">
          {status === 'ao_vivo' && <Radio className="w-3 h-3 mr-1" />}
          {currentStatus.text}
        </Badge>
      );
    } catch (error) {
      console.error('Erro ao calcular status da aula:', error);
      return null;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString + 'T00:00:00').toLocaleDateString('pt-BR', { 
        timeZone: 'America/Sao_Paulo' 
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        {/* Cover Image */}
        {aula.imagem_capa_url && (
          <div className="relative h-48 bg-gradient-to-br from-primary/10 to-secondary/10">
            <img
              src={aula.imagem_capa_url}
              alt={aula.titulo}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </div>
        )}
        
        {/* Card Content */}
        <div className="p-4 space-y-3">
          {/* Header with Status Badges */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-start gap-2">
              {getStatusBadge()}
              {aula.eh_aula_ao_vivo && (
                <Badge variant="secondary" className="text-xs">
                  <Radio className="w-3 h-3 mr-1" />
                  Ao Vivo
                </Badge>
              )}
              <Badge variant={aula.ativo ? "default" : "secondary"} className="text-xs">
                {aula.ativo ? "Ativa" : "Inativa"}
              </Badge>
            </div>
            
            <h3 className="font-semibold text-lg leading-tight line-clamp-2">
              {aula.titulo}
            </h3>
            
            {aula.descricao && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {aula.descricao}
              </p>
            )}
          </div>

          {/* Date and Time */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-primary" />
              <span>{formatDate(aula.data_aula)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{aula.horario_inicio} - {aula.horario_fim}</span>
            </div>
          </div>

          {/* Platform Type */}
          <div className="flex items-center gap-2">
            <Badge variant={aula.abrir_aba_externa ? "default" : "secondary"} className="text-xs">
              {aula.abrir_aba_externa ? (
                <>
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Externa
                </>
              ) : (
                <>
                  <Video className="w-3 h-3 mr-1" />
                  Embutida
                </>
              )}
            </Badge>
          </div>

          {/* Authorized Classes */}
          {aula.turmas_autorizadas.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">Turmas Autorizadas:</span>
              <div className="flex flex-wrap gap-1">
                {aula.turmas_autorizadas.slice(0, 3).map((turma) => (
                  <Badge key={turma} variant="outline" className="text-xs">
                    {turma}
                  </Badge>
                ))}
                {aula.turmas_autorizadas.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{aula.turmas_autorizadas.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Creation Date */}
          <div className="text-xs text-muted-foreground pt-2 border-t">
            Criado em: {new Date(aula.criado_em).toLocaleDateString('pt-BR')}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-2">
            {aula.eh_aula_ao_vivo && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenFrequencia(aula)}
                className="flex-1 min-w-[120px]"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Frequência
              </Button>
            )}
            
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(aula)}
                className="flex-1 min-w-[100px]"
              >
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onToggleStatus(aula.id, aula.ativo)}
              className="flex-1 min-w-[100px]"
            >
              {aula.ativo ? (
                <>
                  <PowerOff className="w-4 h-4 mr-2" />
                  Desativar
                </>
              ) : (
                <>
                  <Power className="w-4 h-4 mr-2" />
                  Ativar
                </>
              )}
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1 min-w-[100px]">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza de que deseja excluir a aula "{aula.titulo}"? 
                    Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(aula.id)}>
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};