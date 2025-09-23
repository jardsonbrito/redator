import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, MessageCircle, Phone } from 'lucide-react';

interface ExpiredSubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ExpiredSubscriptionModal = ({
  open,
  onOpenChange
}: ExpiredSubscriptionModalProps) => {
  const whatsappNumber = '5585992160605';
  const whatsappMessage = 'Olá, meu acesso à plataforma venceu. Gostaria de renovar minha assinatura.';
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;

  const handleWhatsAppClick = () => {
    window.open(whatsappUrl, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Assinatura Expirada
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Entre em contato com o administrador para renovar sua assinatura.
            </p>

            {/* Botão WhatsApp */}
            <Button
              onClick={handleWhatsAppClick}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              size="lg"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Falar no WhatsApp
            </Button>

            {/* Número como fallback */}
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-center gap-2 text-sm">
                <Phone className="h-4 w-4" />
                <span className="font-mono">+55 85 99216-0605</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Caso o WhatsApp não abra automaticamente
              </p>
            </div>

            <p className="text-xs text-muted-foreground">
              Nossa equipe está à disposição para ajudar na renovação e garantir a continuidade dos seus estudos.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};