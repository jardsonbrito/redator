import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { checkTablesExist, initializeDatabase } from '@/utils/initDatabase';
import { AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

interface DatabaseInitializerProps {
  children: React.ReactNode;
}

export const DatabaseInitializer = ({ children }: DatabaseInitializerProps) => {
  const [isChecking, setIsChecking] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);
  const [tablesStatus, setTablesStatus] = useState({
    assinaturas: false,
    subscription_history: false
  });
  const [error, setError] = useState<string | null>(null);

  const checkDatabase = async () => {
    try {
      setIsChecking(true);
      setError(null);

      const status = await checkTablesExist();
      setTablesStatus(status);

      console.log('📊 Status das tabelas:', status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsChecking(false);
    }
  };

  const initDatabase = async () => {
    try {
      setIsInitializing(true);
      setError(null);

      const success = await initializeDatabase();

      if (success) {
        // Recheck tables after initialization
        await checkDatabase();
      } else {
        setError('Falha na inicialização do banco de dados');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro na inicialização');
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    checkDatabase();
  }, []);

  // Se ainda está verificando, mostrar loading
  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Verificando banco de dados...</span>
        </div>
      </div>
    );
  }

  // Se há erro, mostrar alerta
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Erro no banco de dados:</strong> {error}
          <Button
            onClick={checkDatabase}
            variant="outline"
            size="sm"
            className="ml-2"
          >
            Tentar novamente
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Se as tabelas não existem, mostrar opção de inicializar
  if (!tablesStatus.assinaturas || !tablesStatus.subscription_history) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Tabelas do sistema de assinaturas não encontradas.</strong>
            <br />
            <small>
              Assinaturas: {tablesStatus.assinaturas ? '✅' : '❌'} |
              Histórico: {tablesStatus.subscription_history ? '✅' : '❌'}
            </small>
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Button
            onClick={initDatabase}
            disabled={isInitializing}
            className="flex items-center gap-2"
          >
            {isInitializing && <RefreshCw className="h-4 w-4 animate-spin" />}
            {isInitializing ? 'Inicializando...' : 'Criar Tabelas'}
          </Button>

          <Button
            onClick={checkDatabase}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Verificar Novamente
          </Button>
        </div>

        {/* Mostrar conteúdo mesmo assim, mas com alerta */}
        <div className="opacity-75">
          {children}
        </div>
      </div>
    );
  }

  // Se tudo estiver OK, mostrar conteúdo normal
  return (
    <div>
      <Alert className="mb-4">
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Sistema de assinaturas funcionando.</strong> Todas as tabelas estão disponíveis.
        </AlertDescription>
      </Alert>
      {children}
    </div>
  );
};