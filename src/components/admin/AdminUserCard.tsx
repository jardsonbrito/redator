import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Shield, ShieldOff, Clock } from 'lucide-react';

interface AdminUser {
  id: string;
  nome_completo: string;
  email: string;
  ativo: boolean;
  criado_em: string;
  ultimo_login?: string;
  criado_por_nome?: string;
}

interface AdminUserCardProps {
  admin: AdminUser;
  onToggleStatus: (adminId: string, newStatus: boolean) => void;
  loading: boolean;
}

export const AdminUserCard = ({ admin, onToggleStatus, loading }: AdminUserCardProps) => {
  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: ptBR
    });
  };

  return (
    <Card className={`transition-all duration-200 ${!admin.ativo ? 'opacity-60' : ''}`}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{admin.nome_completo}</h3>
            <Badge variant={admin.ativo ? 'default' : 'secondary'}>
              {admin.ativo ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{admin.email}</p>
        </div>
        <Button
          variant={admin.ativo ? 'destructive' : 'default'}
          size="sm"
          onClick={() => onToggleStatus(admin.id, !admin.ativo)}
          disabled={loading}
        >
          {admin.ativo ? (
            <>
              <ShieldOff className="mr-2 h-4 w-4" />
              Desativar
            </>
          ) : (
            <>
              <Shield className="mr-2 h-4 w-4" />
              Ativar
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>Criado {formatDate(admin.criado_em)}</span>
          </div>
          
          {admin.ultimo_login && (
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span>Último login {formatDate(admin.ultimo_login)}</span>
            </div>
          )}
          
          {admin.criado_por_nome && (
            <div className="text-xs">
              Criado por: {admin.criado_por_nome}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};