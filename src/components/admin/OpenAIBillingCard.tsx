import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, RefreshCw, TrendingUp, Calendar } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const OpenAIBillingCard = () => {
  const [loading, setLoading] = useState(false);
  const [billingData, setBillingData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const loadBilling = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Não autenticado');
      }

      const response = await supabase.functions.invoke('openai-billing', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setBillingData(response.data);
    } catch (err: any) {
      console.error('Erro ao carregar billing:', err);
      setError(err.message || 'Erro ao carregar dados de billing');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBilling();
  }, []);

  const formatMoney = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Saldo OpenAI
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={loadBilling}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : loading && !billingData ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : billingData ? (
          <div className="space-y-4">
            {/* Uso do mês */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 text-blue-700 mb-2">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm font-medium">Uso do Mês</span>
                </div>
                <p className="text-2xl font-bold text-blue-900">
                  {formatMoney(billingData.usage?.total_usage || 0)}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Total gasto este mês
                </p>
              </div>

              {billingData.subscription?.hard_limit_usd && (
                <>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 text-green-700 mb-2">
                      <DollarSign className="h-4 w-4" />
                      <span className="text-sm font-medium">Limite da Conta</span>
                    </div>
                    <p className="text-2xl font-bold text-green-900">
                      {formatMoney(billingData.subscription.hard_limit_usd * 100)}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Limite configurado
                    </p>
                  </div>

                  <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                    <div className="flex items-center gap-2 text-amber-700 mb-2">
                      <DollarSign className="h-4 w-4" />
                      <span className="text-sm font-medium">Disponível</span>
                    </div>
                    <p className="text-2xl font-bold text-amber-900">
                      {formatMoney(
                        (billingData.subscription.hard_limit_usd * 100) -
                        (billingData.usage?.total_usage || 0)
                      )}
                    </p>
                    <p className="text-xs text-amber-600 mt-1">
                      Saldo restante
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Período */}
            {billingData.periodo && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
                <Calendar className="h-4 w-4" />
                <span>
                  Período: {new Date(billingData.periodo.inicio).toLocaleDateString('pt-BR')} até{' '}
                  {new Date(billingData.periodo.fim).toLocaleDateString('pt-BR')}
                </span>
              </div>
            )}

            {/* Barra de progresso */}
            {billingData.subscription?.hard_limit_usd && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Uso do limite</span>
                  <span className="font-medium">
                    {((billingData.usage?.total_usage || 0) / (billingData.subscription.hard_limit_usd * 100) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      ((billingData.usage?.total_usage || 0) / (billingData.subscription.hard_limit_usd * 100) * 100) > 80
                        ? 'bg-red-500'
                        : ((billingData.usage?.total_usage || 0) / (billingData.subscription.hard_limit_usd * 100) * 100) > 60
                        ? 'bg-amber-500'
                        : 'bg-green-500'
                    }`}
                    style={{
                      width: `${Math.min(
                        ((billingData.usage?.total_usage || 0) / (billingData.subscription.hard_limit_usd * 100) * 100),
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};
