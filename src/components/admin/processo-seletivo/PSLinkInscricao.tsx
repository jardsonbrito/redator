import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  Link2,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  Users,
  Info
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface PSLinkInscricaoProps {
  formularioId: string;
  titulo: string;
  turmaProcesso: string | null;
  inscricoesAbertas: boolean;
  totalCandidatos?: number;
}

export const PSLinkInscricao: React.FC<PSLinkInscricaoProps> = ({
  formularioId,
  titulo,
  turmaProcesso,
  inscricoesAbertas,
  totalCandidatos = 0
}) => {
  const [copied, setCopied] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  const baseUrl = window.location.origin;
  const linkInscricao = `${baseUrl}/processo-seletivo/inscricao/${formularioId}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(linkInscricao);
      setCopied(true);
      toast.success('Link copiado para a área de transferência!');
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      toast.error('Erro ao copiar link');
    }
  };

  const handleOpenLink = () => {
    window.open(linkInscricao, '_blank');
  };

  // URL para gerar QR Code via API pública
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(linkInscricao)}`;

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gradient-to-br from-purple-50 to-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-[#3F0077]" />
          <h3 className="font-semibold text-[#3F0077]">Link de Inscrição</h3>
        </div>
        <div className="flex items-center gap-2">
          {turmaProcesso && (
            <Badge variant="outline" className="bg-purple-100 text-purple-700">
              Turma: {turmaProcesso}
            </Badge>
          )}
          <Badge
            variant={inscricoesAbertas ? "default" : "secondary"}
            className={inscricoesAbertas ? "bg-green-100 text-green-700" : ""}
          >
            {inscricoesAbertas ? "Inscrições Abertas" : "Inscrições Fechadas"}
          </Badge>
        </div>
      </div>

      {!inscricoesAbertas && (
        <Alert variant="default" className="bg-orange-50 border-orange-200">
          <Info className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-700">
            As inscrições estão fechadas. Candidatos que acessarem o link verão uma mensagem informando que as inscrições foram encerradas.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Link público para candidatos</Label>
        <div className="flex gap-2">
          <Input
            value={linkInscricao}
            readOnly
            className="font-mono text-sm bg-white"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={handleCopyLink}
            title="Copiar link"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleOpenLink}
            title="Abrir em nova aba"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowQRModal(true)}
            title="Gerar QR Code"
          >
            <QrCode className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{totalCandidatos} candidato{totalCandidatos !== 1 ? 's' : ''} inscrito{totalCandidatos !== 1 ? 's' : ''}</span>
        </div>
        <Button
          variant="default"
          size="sm"
          onClick={handleCopyLink}
          className="bg-[#3F0077] hover:bg-[#662F96]"
        >
          <Copy className="h-4 w-4 mr-2" />
          Copiar Link
        </Button>
      </div>

      {/* Modal do QR Code */}
      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>QR Code - {titulo}</DialogTitle>
            <DialogDescription>
              Escaneie este código para acessar o link de inscrição
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-4 space-y-4">
            <img
              src={qrCodeUrl}
              alt="QR Code do link de inscrição"
              className="w-64 h-64 border rounded-lg"
            />
            <p className="text-xs text-muted-foreground text-center break-all max-w-full">
              {linkInscricao}
            </p>
            <Button
              variant="outline"
              onClick={() => {
                const link = document.createElement('a');
                link.href = qrCodeUrl;
                link.download = `qrcode-${titulo.replace(/\s+/g, '-').toLowerCase()}.png`;
                link.click();
                toast.success('QR Code baixado!');
              }}
            >
              Baixar QR Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PSLinkInscricao;
