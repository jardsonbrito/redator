
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';

// Componentes Admin - usando importações nomeadas
import { RedacaoList } from '@/components/admin/RedacaoList';
import { TemaList } from '@/components/admin/TemaList';
import { VideoList } from '@/components/admin/VideoList';
import { RedacaoEnviadaForm } from '@/components/admin/RedacaoEnviadaForm';
import AdminPasswordChange from '@/components/admin/AdminPasswordChange';

const Admin = () => {
  const { user, signOut, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Logout realizado com sucesso",
        description: "Você foi desconectado do painel administrativo.",
      });
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      toast({
        title: "Erro no logout",
        description: "Ocorreu um erro ao tentar sair. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Show loading while auth is being verified
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center">
        <div className="text-lg text-redator-accent">Verificando permissões...</div>
      </div>
    );
  }

  // Redirect to login if not authenticated or not admin
  if (!user || !isAdmin) {
    navigate('/login', { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
      <div className="container mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 text-redator-primary hover:text-redator-accent transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span>Voltar ao site</span>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-redator-primary">Painel Administrativo</h1>
              <p className="text-sm text-redator-accent">Bem-vindo, {user.email}</p>
            </div>
          </div>
          
          <Button 
            onClick={handleSignOut}
            variant="outline"
            className="flex items-center gap-2 border-redator-accent text-redator-primary hover:bg-redator-accent/10"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>

        {/* Main Content */}
        <Card className="border-redator-accent/20">
          <CardContent className="p-6">
            <Tabs defaultValue="correcoes" className="space-y-6">
              <TabsList className="grid w-full grid-cols-6 bg-redator-accent/10">
                <TabsTrigger value="correcoes" className="data-[state=active]:bg-redator-primary data-[state=active]:text-white">
                  Correções
                </TabsTrigger>
                <TabsTrigger value="redacoes" className="data-[state=active]:bg-redator-primary data-[state=active]:text-white">
                  Redações
                </TabsTrigger>
                <TabsTrigger value="temas" className="data-[state=active]:bg-redator-primary data-[state=active]:text-white">
                  Temas
                </TabsTrigger>
                <TabsTrigger value="videos" className="data-[state=active]:bg-redator-primary data-[state=active]:text-white">
                  Vídeos
                </TabsTrigger>
                <TabsTrigger value="password" className="data-[state=active]:bg-redator-primary data-[state=active]:text-white">
                  Senha
                </TabsTrigger>
                <TabsTrigger value="stats" className="data-[state=active]:bg-redator-primary data-[state=active]:text-white">
                  Estatísticas
                </TabsTrigger>
              </TabsList>

              <TabsContent value="correcoes">
                <RedacaoEnviadaForm />
              </TabsContent>

              <TabsContent value="redacoes">
                <RedacaoList />
              </TabsContent>

              <TabsContent value="temas">
                <TemaList />
              </TabsContent>

              <TabsContent value="videos">
                <VideoList />
              </TabsContent>

              <TabsContent value="password">
                <AdminPasswordChange />
              </TabsContent>

              <TabsContent value="stats">
                <Card className="border-redator-accent/20">
                  <CardHeader>
                    <CardTitle className="text-redator-primary">Estatísticas do Sistema</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-redator-accent">Funcionalidade em desenvolvimento...</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;
