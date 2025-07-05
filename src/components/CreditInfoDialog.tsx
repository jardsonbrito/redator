
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Coins, AlertCircle } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";

interface CreditInfoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed: () => void;
  userEmail: string;
  selectedCorretores: string[];
}

export const CreditInfoDialog = ({ 
  isOpen, 
  onClose, 
  onProceed, 
  userEmail, 
  selectedCorretores 
}: CreditInfoDialogProps) => {
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const { getCreditsbyEmail } = useCredits();

  useEffect(() => {
    if (isOpen && userEmail) {
      loadCredits();
    }
  }, [isOpen, userEmail]);

  const loadCredits = async () => {
    setLoading(true);
    console.log('🔄 CreditInfoDialog - Carregando créditos para:', userEmail);
    
    try {
      const userCredits = await getCreditsbyEmail(userEmail);
      console.log('💰 CreditInfoDialog - Créditos carregados:', userCredits);
      setCredits(userCredits);
    } catch (error) {
      console.error('❌ Erro ao carregar créditos:', error);
      setCredits(0);
    } finally {
      setLoading(false);
    }
  };

  const creditsNeeded = selectedCorretores.length;
  const hasEnoughCredits = credits >= creditsNeeded;
  const creditsAfterSend = Math.max(0, credits - creditsNeeded);

  console.log('📊 CreditInfoDialog - Status:', {
    credits,
    creditsNeeded,
    hasEnoughCredits,
    userEmail
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-yellow-500" />
            Verificação de Créditos
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Verificando créditos...</p>
            </div>
          ) : (
            <>
              {hasEnoughCredits ? (
                <div className="text-center space-y-3">
                  <div className="text-lg font-semibold text-green-600 mb-3">
                    ✅ Você possui {credits} créditos.
                  </div>
                  <div className="text-sm text-gray-600 bg-green-50 p-3 rounded-lg">
                    <p>• Corretores selecionados: {creditsNeeded}</p>
                    <p className="font-medium">• Após este envio, restarão {creditsAfterSend} créditos.</p>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-3">
                  <div className="flex items-center justify-center gap-2 text-red-600 mb-3">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-semibold">Créditos insuficientes</span>
                  </div>
                  <div className="text-sm text-gray-700 bg-red-50 p-3 rounded-lg">
                    <p className="mb-2">Você possui: <strong>{credits} créditos</strong></p>
                    <p className="mb-3">Necessários: <strong>{creditsNeeded} créditos</strong></p>
                    <p className="text-red-600 font-medium">
                      Fale com seu professor para solicitar mais créditos.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex gap-2 justify-end mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          {hasEnoughCredits && !loading && (
            <Button onClick={onProceed} className="bg-green-600 hover:bg-green-700">
              Confirmar Envio
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
