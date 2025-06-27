
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, FileText, BookOpen, Video } from 'lucide-react';
import { TemaForm } from '@/components/admin/TemaForm';
import { RedacaoForm } from '@/components/admin/RedacaoForm';
import { VideoForm } from '@/components/admin/VideoForm';
import { useToast } from '@/hooks/use-toast';

const Admin = () => {
  const { user, isAdmin, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    console.log('Admin page - User:', user?.email, 'IsAdmin:', isAdmin, 'Loading:', loading);
    
    if (!loading && (!user || !isAdmin)) {
      console.log('Redirecting to login - User:', !!user, 'IsAdmin:', isAdmin);
      toast({
        title: "Acesso negado",
        description: "É necessário fazer login como administrador.",
        variant: "destructive",
      });
      navigate('/login');
    }
  }, [user, isAdmin, loading, navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Logout realizado",
      description: "Você foi desconectado com sucesso.",
    });
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Painel Administrativo</h1>
              <p className="text-gray-600">
                Gerencie o conteúdo do App do Redator - Logado como: {user.email}
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
        <Tabs defaultValue="temas" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="temas" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Temas
            </TabsTrigger>
            <TabsTrigger value="redacoes" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Redações
            </TabsTrigger>
            <TabsTrigger value="videos" className="flex items-center gap-2">
              <Video className="w-4 h-4" />
              Vídeos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="temas">
            <Card>
              <CardHeader>
                <CardTitle>Adicionar Novo Tema</CardTitle>
              </CardHeader>
              <CardContent>
                <TemaForm />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="redacoes">
            <Card>
              <CardHeader>
                <CardTitle>Adicionar Nova Redação Exemplar</CardTitle>
              </CardHeader>
              <CardContent>
                <RedacaoForm />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="videos">
            <Card>
              <CardHeader>
                <CardTitle>Adicionar Novo Vídeo</CardTitle>
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
