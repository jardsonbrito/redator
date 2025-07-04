
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Info, Coins, AlertCircle } from "lucide-react";
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
            Créditos de Redação
          </DialogTitle>
          <DialogDescription>
            Informações sobre seus créditos disponíveis
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Verificando créditos...</p>
            </div>
          ) : (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-blue-800">Seus créditos disponíveis</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">{credits} créditos</p>
                <p className="text-xs text-blue-600 mt-1">E-mail: {userEmail}</p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="text-sm space-y-1">
                  <p><strong>Corretores selecionados:</strong> {creditsNeeded}</p>
                  <p><strong>Créditos necessários:</strong> {creditsNeeded}</p>
                  <p><strong>Créditos restantes após envio:</strong> {Math.max(0, credits - creditsNeeded)}</p>
                </div>
              </div>

              {!hasEnoughCredits ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span className="font-medium text-red-800">Créditos insuficientes</span>
                  </div>
                  <p className="text-sm text-red-700">
                    Você não possui créditos suficientes para esse envio. Entre em contato com seu professor para solicitar novos créditos.
                  </p>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Coins className="w-4 h-4 text-green-600" />
                    <span className="font-medium text-green-800">Créditos suficientes</span>
                  </div>
                  <p className="text-sm text-green-700">
                    Você pode prosseguir com o envio da redação.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          {hasEnoughCredits && !loading && (
            <Button onClick={onProceed} className="bg-green-600 hover:bg-green-700">
              Enviar Redação
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
