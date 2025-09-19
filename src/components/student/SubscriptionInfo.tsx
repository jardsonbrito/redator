import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSubscriptionRobust } from '@/hooks/useSubscriptionRobust';
import { Calendar, CreditCard, Crown, AlertTriangle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatDateSafe } from '@/utils/dateUtils';

interface SubscriptionInfoProps {
  userEmail: string;
}

export const SubscriptionInfo = ({ userEmail }: SubscriptionInfoProps) => {
  const { data: subscription, isLoading, error } = useSubscriptionRobust(userEmail);

  // Remover logs em produção

  // Removida função local - usando formatDateSafe importada

  const getPlanoBadge = (plano: string | null) => {
    if (!plano) return <Badge variant="outline">Sem Plano</Badge>;

    const colors = {
      'Liderança': 'bg-purple-100 text-purple-800',
      'Lapidação': 'bg-blue-100 text-blue-800',
      'Largada': 'bg-orange-100 text-orange-800'
    };

    return <Badge className={colors[plano as keyof typeof colors]}>{plano}</Badge>;
  };

  const getStatusBadge = (status: string, diasRestantes: number) => {
    if (status === 'Ativo') {
      if (diasRestantes <= 7) {
        return <Badge className="bg-yellow-100 text-yellow-800">⚠️ Expira em breve</Badge>;
      }
      return <Badge className="bg-green-100 text-green-800">✅ Ativo</Badge>;
    } else if (status === 'Vencido') {
      return <Badge variant="destructive">❌ Vencido</Badge>;
    }
    return <Badge variant="outline">Sem Assinatura</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2">Carregando informações da assinatura...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!subscription) {
    return null;
  }

  return (
    <div className="flex justify-center">
      <Card className="w-full max-w-2xl bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl text-center">
            <Crown className="h-5 w-5 text-purple-600" />
            Sua Assinatura
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
        {/* Status da Assinatura */}
        {subscription.status === 'Vencido' && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Sua assinatura venceu!</strong> Entre em contato com o administrador para renovação.
            </AlertDescription>
          </Alert>
        )}

        {subscription.status === 'Ativo' && subscription.dias_restantes <= 7 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Sua assinatura expira em {subscription.dias_restantes} dia{subscription.dias_restantes > 1 ? 's' : ''}!</strong>
            </AlertDescription>
          </Alert>
        )}

        {/* Informações principais - Grade 2x2 organizada */}
        <div className="grid grid-cols-2 gap-6">
          {/* Plano */}
          <div className="space-y-2">
            <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Crown className="h-4 w-4 text-purple-600" />
              Plano
            </span>
            <div className="text-base font-semibold">
              {getPlanoBadge(subscription.plano)}
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Status
            </span>
            <div className="text-base font-semibold">
              {getStatusBadge(subscription.status, subscription.dias_restantes)}
            </div>
          </div>

          {/* Data de Matrícula */}
          <div className="space-y-2">
            <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              Matrícula
            </span>
            <div className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {formatDateSafe(subscription.data_inscricao)}
            </div>
          </div>

          {/* Data de Validade */}
          <div className="space-y-2">
            <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-orange-600" />
              Validade
            </span>
            <div className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {formatDateSafe(subscription.data_validade)}
            </div>
          </div>
        </div>

        {/* Créditos - Destaque maior */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-between cursor-help p-3 rounded-lg bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                  <span className="text-base font-semibold text-green-700 dark:text-green-300 flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Créditos Disponíveis
                  </span>
                  <Badge className="text-xl px-4 py-2 bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200 hover:bg-green-300 dark:hover:bg-green-700 transition-colors">
                    🪙 {subscription.creditos}
                  </Badge>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">
                  Cada redação enviada consome 1 crédito.<br/>
                  Solicite mais créditos ao administrador se necessário.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        </CardContent>
      </Card>
    </div>
  );
};