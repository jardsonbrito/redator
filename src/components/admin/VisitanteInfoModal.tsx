import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Calendar, FileText, Clock, Hash } from "lucide-react";

interface Visitante {
  id: string;
  nome: string;
  email: string;
  turma: string;
  created_at: string;
  ativo: boolean;
  tipo?: 'visitante';
  ultimo_acesso?: string;
  total_redacoes?: number;
  session_id?: string;
  whatsapp?: string;
}

interface VisitanteInfoModalProps {
  visitante: Visitante | null;
  isOpen: boolean;
  onClose: () => void;
  onMigrar?: (visitante: Visitante) => void;
}

export const VisitanteInfoModal = ({ visitante, isOpen, onClose, onMigrar }: VisitanteInfoModalProps) => {
  if (!visitante) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    // Você pode adicionar um toast aqui se quiser feedback visual
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-redator-primary">
            <User className="w-5 h-5" />
            Informações do Visitante
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Nome e Status */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">{visitante.nome}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={visitante.ativo ? "default" : "secondary"} className="text-xs">
                  {visitante.ativo ? "Ativo" : "Inativo"}
                </Badge>
                <Badge variant="outline" className="text-xs bg-teal-50 text-teal-700 border-teal-200">
                  Visitante
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Informações de Contato */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-500" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">E-mail</p>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{visitante.email}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(visitante.email, "E-mail")}
                    className="h-6 px-2 text-xs"
                  >
                    Copiar
                  </Button>
                </div>
              </div>
            </div>

            {visitante.whatsapp && (
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-gray-500" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600">WhatsApp</p>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{visitante.whatsapp}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(visitante.whatsapp!, "WhatsApp")}
                      className="h-6 px-2 text-xs"
                    >
                      Copiar
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Estatísticas de Uso */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600">Total de Redações</p>
                <p className="font-semibold text-lg text-redator-primary">{visitante.total_redacoes || 0}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600">Primeiro Acesso</p>
                <p className="font-medium text-sm">{formatDate(visitante.created_at)}</p>
              </div>
            </div>

            {visitante.ultimo_acesso && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">Último Acesso</p>
                  <p className="font-medium text-sm">{formatDate(visitante.ultimo_acesso)}</p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Informações Técnicas */}
          {visitante.session_id && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Session ID</p>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-white px-2 py-1 rounded border font-mono flex-1">
                  {visitante.session_id.slice(0, 20)}...
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(visitante.session_id!, "Session ID")}
                  className="h-6 px-2 text-xs"
                >
                  Copiar
                </Button>
              </div>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                if (onMigrar) {
                  onClose(); // Fechar modal de info antes de abrir modal de migração
                  onMigrar(visitante);
                } else {
                  alert(`Funcionalidade de migração em desenvolvimento.\n\nDados do visitante:\n- Nome: ${visitante.nome}\n- Email: ${visitante.email}\n- Redações: ${visitante.total_redacoes || 0}`);
                }
              }}
              className="flex-1 text-blue-600 hover:text-blue-700"
            >
              Migrar para Aluno
            </Button>
            <Button variant="outline" onClick={onClose} className="flex-1">
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};