import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, FileText, BookOpen, Video, Shield, CheckCircle, List, Plus, GraduationCap, ClipboardList } from 'lucide-react';
import { TemaForm } from '@/components/admin/TemaForm';
import { RedacaoForm } from '@/components/admin/RedacaoForm';
import { VideoForm } from '@/components/admin/VideoForm';
import { RedacaoEnviadaForm } from '@/components/admin/RedacaoEnviadaForm';
import { RedacaoList } from '@/components/admin/RedacaoList';
import { TemaList } from '@/components/admin/TemaList';
import { VideoList } from '@/components/admin/VideoList';
import AulaForm from '@/components/admin/AulaForm';
import AulaList from '@/components/admin/AulaList';
import ExercicioForm from '@/components/admin/ExercicioForm';
import ExercicioList from '@/components/admin/ExercicioList';
import { useToast } from '@/hooks/use-toast';
import { RedacaoExercicioForm } from '@/components/admin/RedacaoExercicioForm';

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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 animate-pulse text-redator-primary" />
          <span className="text-lg text-redator-accent">Verificando permissões administrativas...</span>
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
      <header className="bg-white shadow-sm border-b border-redator-accent/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-redator-primary flex items-center gap-2">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-redator-primary" />
                Painel Administrativo - App do Laboratório do Redator
              </h1>
              <p className="text-sm sm:text-base text-redator-accent mt-1">
                Gerencie conteúdos: Redações Exemplares, Temas, Videoteca, Aulas, Exercícios e Correções
              </p>
              <p className="text-xs sm:text-sm text-redator-secondary font-medium mt-1">
                ✅ Logado como administrador: {user.email}
              </p>
            </div>
            <Button onClick={handleSignOut} variant="outline" className="flex items-center gap-2 border-redator-accent text-redator-primary hover:bg-redator-accent/10 w-full sm:w-auto">
              <LogOut className="w-4 h-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="mb-4 sm:mb-6">
          <div className="bg-white border border-redator-secondary/20 rounded-lg p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-redator-secondary" />
              <span className="font-medium text-redator-primary text-sm sm:text-base">Painel Administrativo Ativo</span>
            </div>
            <p className="text-redator-accent text-xs sm:text-sm mt-1">
              Você está autenticado como administrador e pode gerenciar todos os conteúdos do app.
            </p>
          </div>
        </div>

        <Tabs defaultValue="redacoes" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-7 bg-white border border-redator-accent/20 h-auto">
            <TabsTrigger value="redacoes" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 data-[state=active]:bg-redator-primary data-[state=active]:text-white text-xs sm:text-sm p-2 sm:p-3">
              <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-center">Redações Exemplares</span>
            </TabsTrigger>
            <TabsTrigger value="temas" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 data-[state=active]:bg-redator-accent data-[state=active]:text-white text-xs sm:text-sm p-2 sm:p-3">
              <BookOpen className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-center">Temas</span>
            </TabsTrigger>
            <TabsTrigger value="videoteca" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 data-[state=active]:bg-redator-secondary data-[state=active]:text-white text-xs sm:text-sm p-2 sm:p-3">
              <Video className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-center">Videoteca</span>
            </TabsTrigger>
            <TabsTrigger value="aulas" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 data-[state=active]:bg-green-600 data-[state=active]:text-white text-xs sm:text-sm p-2 sm:p-3">
              <GraduationCap className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-center">Aulas</span>
            </TabsTrigger>
            <TabsTrigger value="exercicios" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 data-[state=active]:bg-orange-600 data-[state=active]:text-white text-xs sm:text-sm p-2 sm:p-3">
              <ClipboardList className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-center">Exercícios</span>
            </TabsTrigger>
            <TabsTrigger value="correcoes" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white text-xs sm:text-sm p-2 sm:p-3">
              <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-center">Correções</span>
            </TabsTrigger>
            <TabsTrigger value="redacoes-exercicios" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-xs sm:text-sm p-2 sm:p-3">
              <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-center">Redações Exercícios</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="redacoes" className="space-y-6">
            <Tabs defaultValue="novo" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-white border border-redator-primary/20">
                <TabsTrigger value="novo" className="flex items-center gap-2 data-[state=active]:bg-redator-primary data-[state=active]:text-white">
                  <Plus className="w-4 h-4" />
                  Cadastrar Nova
                </TabsTrigger>
                <TabsTrigger value="gerenciar" className="flex items-center gap-2 data-[state=active]:bg-redator-primary data-[state=active]:text-white">
                  <List className="w-4 h-4" />
                  Gerenciar Existentes
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="novo">
                <Card className="border-redator-accent/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-redator-primary">
                      <FileText className="w-5 h-5" />
                      Cadastrar Nova Redação Exemplar
                    </CardTitle>
                    <p className="text-redator-accent">
                      Adicione redações nota 1000 que servirão de exemplo para os estudantes
                    </p>
                  </CardHeader>
                  <CardContent>
                    <RedacaoForm />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="gerenciar">
                <Card className="border-redator-accent/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-redator-primary">
                      <List className="w-5 h-5" />
                      Gerenciar Redações Exemplares
                    </CardTitle>
                    <p className="text-redator-accent">
                      Edite ou exclua redações exemplares já cadastradas
                    </p>
                  </CardHeader>
                  <CardContent>
                    <RedacaoList />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="temas" className="space-y-6">
            <Tabs defaultValue="novo" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-white border border-redator-accent/20">
                <TabsTrigger value="novo" className="flex items-center gap-2 data-[state=active]:bg-redator-accent data-[state=active]:text-white">
                  <Plus className="w-4 h-4" />
                  Cadastrar Novo
                </TabsTrigger>
                <TabsTrigger value="gerenciar" className="flex items-center gap-2 data-[state=active]:bg-redator-accent data-[state=active]:text-white">
                  <List className="w-4 h-4" />
                  Gerenciar Existentes
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="novo">
                <Card className="border-redator-accent/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-redator-primary">
                      <BookOpen className="w-5 h-5" />
                      Cadastrar Novo Tema
                    </CardTitle>
                    <p className="text-redator-accent">
                      Crie temas com textos motivadores para prática de redação dos alunos
                    </p>
                  </CardHeader>
                  <CardContent>
                    <TemaForm />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="gerenciar">
                <Card className="border-redator-accent/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-redator-primary">
                      <List className="w-5 h-5" />
                      Gerenciar Temas
                    </CardTitle>
                    <p className="text-redator-accent">
                      Edite ou exclua temas já cadastrados
                    </p>
                  </CardHeader>
                  <CardContent>
                    <TemaList />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="videoteca" className="space-y-6">
            <Tabs defaultValue="novo" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-white border border-redator-secondary/20">
                <TabsTrigger value="novo" className="flex items-center gap-2 data-[state=active]:bg-redator-secondary data-[state=active]:text-white">
                  <Plus className="w-4 h-4" />
                  Cadastrar Novo
                </TabsTrigger>
                <TabsTrigger value="gerenciar" className="flex items-center gap-2 data-[state=active]:bg-redator-secondary data-[state=active]:text-white">
                  <List className="w-4 h-4" />
                  Gerenciar Existentes
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="novo">
                <Card className="border-redator-accent/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-redator-primary">
                      <Video className="w-5 h-5" />
                      Cadastrar Novo Vídeo
                    </CardTitle>
                    <p className="text-redator-accent">
                      Adicione vídeos educativos do YouTube à videoteca do app
                    </p>
                  </CardHeader>
                  <CardContent>
                    <VideoForm />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="gerenciar">
                <Card className="border-redator-accent/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-redator-primary">
                      <List className="w-5 h-5" />
                      Gerenciar Vídeos
                    </CardTitle>
                    <p className="text-redator-accent">
                      Edite ou exclua vídeos já cadastrados
                    </p>
                  </CardHeader>
                  <CardContent>
                    <VideoList />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="aulas" className="space-y-6">
            <Tabs defaultValue="novo" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-white border border-green-600/20">
                <TabsTrigger value="novo" className="flex items-center gap-2 data-[state=active]:bg-green-600 data-[state=active]:text-white">
                  <Plus className="w-4 h-4" />
                  Cadastrar Nova
                </TabsTrigger>
                <TabsTrigger value="gerenciar" className="flex items-center gap-2 data-[state=active]:bg-green-600 data-[state=active]:text-white">
                  <List className="w-4 h-4" />
                  Gerenciar Existentes
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="novo">
                <Card className="border-redator-accent/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-redator-primary">
                      <GraduationCap className="w-5 h-5" />
                      Cadastrar Nova Aula
                    </CardTitle>
                    <p className="text-redator-accent">
                      Adicione aulas gravadas (YouTube) ou configure aulas ao vivo (Google Meet)
                    </p>
                  </CardHeader>
                  <CardContent>
                    <AulaForm />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="gerenciar">
                <Card className="border-redator-accent/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-redator-primary">
                      <List className="w-5 h-5" />
                      Gerenciar Aulas
                    </CardTitle>
                    <p className="text-redator-accent">
                      Edite ou exclua aulas já cadastradas
                    </p>
                  </CardHeader>
                  <CardContent>
                    <AulaList />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="exercicios" className="space-y-6">
            <Tabs defaultValue="novo" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-white border border-orange-600/20">
                <TabsTrigger value="novo" className="flex items-center gap-2 data-[state=active]:bg-orange-600 data-[state=active]:text-white">
                  <Plus className="w-4 h-4" />
                  Cadastrar Novo
                </TabsTrigger>
                <TabsTrigger value="gerenciar" className="flex items-center gap-2 data-[state=active]:bg-orange-600 data-[state=active]:text-white">
                  <List className="w-4 h-4" />
                  Gerenciar Existentes
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="novo">
                <Card className="border-redator-accent/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-redator-primary">
                      <ClipboardList className="w-5 h-5" />
                      Cadastrar Novo Exercício
                    </CardTitle>
                    <p className="text-redator-accent">
                      Crie exercícios com formulários Google ou propostas de redação com frase temática
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ExercicioForm />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="gerenciar">
                <Card className="border-redator-accent/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-redator-primary">
                      <List className="w-5 h-5" />
                      Gerenciar Exercícios
                    </CardTitle>
                    <p className="text-redator-accent">
                      Edite ou exclua exercícios já cadastrados
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ExercicioList />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="correcoes">
            <Card className="border-purple-600/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-redator-primary">
                  <CheckCircle className="w-5 h-5" />
                  Corrigir Redações Enviadas
                </CardTitle>
                <p className="text-redator-accent">
                  Corrija as redações enviadas pelos usuários atribuindo notas por competência e comentários pedagógicos
                </p>
              </CardHeader>
              <CardContent>
                <RedacaoEnviadaForm />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="redacoes-exercicios">
            <Card className="border-indigo-600/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-redator-primary">
                  <FileText className="w-5 h-5" />
                  Redações Enviadas via Exercícios
                </CardTitle>
                <p className="text-redator-accent">
                  Corrija redações enviadas através dos exercícios com frase temática
                </p>
              </CardHeader>
              <CardContent>
                <RedacaoExercicioForm />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
