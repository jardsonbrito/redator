
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, FileText, BookOpen, Video, Shield } from 'lucide-react';
import { TemaForm } from '@/components/admin/TemaForm';
import { RedacaoForm } from '@/components/admin/RedacaoForm';
import { VideoForm } from '@/components/admin/VideoForm';
import { useToast } from '@/hooks/use-toast';

const Admin = () => {
  const { user, isAdmin, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    console.log('Admin page - Loading:', loading, 'User:', user?.email, 'IsAdmin:', isAdmin);
    
    if (!loading) {
      if (!user) {
        console.log('No user found, redirecting to login');
        toast({
          title: "Acesso negado",
          description: "É necessário fazer login para acessar esta página.",
          variant: "destructive",
        });
        navigate('/login', { replace: true });
      } else if (!isAdmin) {
        console.log('User is not admin, redirecting to home');
        toast({
          title: "Acesso negado", 
          description: "Você não tem permissão para acessar o painel administrativo.",
          variant: "destructive",
        });
        navigate('/', { replace: true });
      }
    }
  }, [user, isAdmin, loading, navigate, toast]);

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 animate-pulse text-blue-600" />
          <span className="text-lg">Verificando permissões administrativas...</span>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated or not admin
  if (!user || !isAdmin) {
    return null;
  }

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Erro",
        description: "Erro ao fazer logout. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Shield className="w-6 h-6 text-blue-600" />
                Painel Administrativo - App do Laboratório do Redator
              </h1>
              <p className="text-gray-600 mt-1">
                Gerencie conteúdos: Redações Exemplares, Temas e Videoteca
              </p>
              <p className="text-sm text-green-600 font-medium mt-1">
                ✅ Logado como administrador: {user.email}
              </p>
            </div>
            <Button onClick={handleSignOut} variant="outline" className="flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-800">Painel Administrativo Ativo</span>
            </div>
            <p className="text-green-700 text-sm mt-1">
              Você está autenticado como administrador e pode gerenciar todos os conteúdos do app.
            </p>
          </div>
        </div>

        <Tabs defaultValue="redacoes" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="redacoes" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Redações Exemplares
            </TabsTrigger>
            <TabsTrigger value="temas" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Temas
            </TabsTrigger>
            <TabsTrigger value="videoteca" className="flex items-center gap-2">
              <Video className="w-4 h-4" />
              Videoteca
            </TabsTrigger>
          </TabsList>

          <TabsContent value="redacoes">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Cadastrar Nova Redação Exemplar
                </CardTitle>
                <p className="text-gray-600">
                  Adicione redações nota 1000 que servirão de exemplo para os estudantes
                </p>
              </CardHeader>
              <CardContent>
                <RedacaoForm />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="temas">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Cadastrar Novo Tema
                </CardTitle>
                <p className="text-gray-600">
                  Crie temas com textos motivadores para prática de redação dos alunos
                </p>
              </CardHeader>
              <CardContent>
                <TemaForm />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="videoteca">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="w-5 h-5" />
                  Cadastrar Novo Vídeo
                </CardTitle>
                <p className="text-gray-600">
                  Adicione vídeos educativos do YouTube à videoteca do app
                </p>
              </CardHeader>
              <CardContent>
                <VideoForm />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
