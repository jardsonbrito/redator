
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, AlertTriangle, CheckCircle } from 'lucide-react';
import { useCredits } from '@/hooks/useCredits';

interface CreditDisplayProps {
  userEmail: string;
  requiredCredits?: number;
  onCreditCheck?: (hasCredits: boolean) => void;
  showCompact?: boolean;
}

export const CreditDisplay = ({ 
  userEmail, 
  requiredCredits = 1, 
  onCreditCheck,
  showCompact = false 
}: CreditDisplayProps) => {
  console.log('🎨 CreditDisplay renderizando');
  console.log('📧 Email recebido:', userEmail);
  console.log('💰 Créditos necessários:', requiredCredits);
  console.log('📱 Modo compacto:', showCompact);

  const { credits, loading, refreshCredits } = useCredits(userEmail);
  const hasEnoughCredits = credits >= requiredCredits;

  console.log('📊 Estado do useCredits:', { credits, loading });
  console.log('✅ Tem créditos suficientes:', hasEnoughCredits);

  useEffect(() => {
    console.log('🔄 CreditDisplay useEffect - onCreditCheck');
    if (onCreditCheck) {
      onCreditCheck(hasEnoughCredits);
    }
  }, [hasEnoughCredits, onCreditCheck]);

  if (loading) {
    console.log('⏳ Carregando créditos...');
    return (
      <div className="animate-pulse">
        <div className="h-16 bg-gray-200 rounded"></div>
      </div>
    );
  }

  console.log('🎨 Renderizando componente final');

  if (showCompact) {
    return (
      <div className="flex items-center gap-2">
        <CreditCard className="h-4 w-4 text-primary" />
        <span className="font-medium">Créditos:</span>
        <Badge 
          variant={hasEnoughCredits ? "default" : "destructive"}
          className="font-mono"
        >
          {credits}
        </Badge>
        {requiredCredits > 1 && (
          <span className="text-sm text-muted-foreground">
            (necessários: {requiredCredits})
          </span>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            console.log('🔄 Botão atualizar clicado (modo compacto)');
            refreshCredits();
          }}
          className="ml-2"
        >
          Atualizar
        </Button>
      </div>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CreditCard className="h-5 w-5 text-primary" />
          Seus Créditos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Saldo Atual:</span>
          <Badge 
            variant={credits > 0 ? "default" : "destructive"}
            className="text-lg px-3 py-1 font-mono"
          >
            {credits}
          </Badge>
        </div>

        {requiredCredits > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Necessários:</span>
            <Badge variant="outline" className="font-mono">
              {requiredCredits}
            </Badge>
          </div>
        )}

        {hasEnoughCredits ? (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Você tem créditos suficientes!</strong>
              <br />
              Esta redação consumirá {requiredCredits} crédito(s).
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Créditos insuficientes!</strong>
              <br />
              Você precisa de {requiredCredits} crédito(s) para enviar esta redação.
              <br />
              Entre em contato com o administrador para adicionar créditos.
            </AlertDescription>
          </Alert>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            console.log('🔄 Botão atualizar saldo clicado');
            refreshCredits();
          }}
          className="w-full"
        >
          Atualizar Saldo
        </Button>
      </CardContent>
    </Card>
  );
};
