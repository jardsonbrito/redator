
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, Users, FileText, BookOpen, Calendar, MessageSquare, Video, Library, Target, Radar, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Import existing admin components
import { AlunoList } from "@/components/admin/AlunoList";
import { RedacaoList } from "@/components/admin/RedacaoList";
import { TemaList } from "@/components/admin/TemaList";
import { AulaList } from "@/components/admin/AulaList";
import { AvisoList } from "@/components/admin/AvisoList";
import { VideoList } from "@/components/admin/VideoList";
import { BibliotecaList } from "@/components/admin/BibliotecaList";
import { ExercicioList } from "@/components/admin/ExercicioList";
import { RadarList } from "@/components/admin/RadarList";
import { CorretorList } from "@/components/admin/CorretorList";
import { CreditManager } from "@/components/admin/CreditManager";
import { linkOldEssaysToStudents } from "@/utils/linkOldEssays";

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLinking, setIsLinking] = useState(false);
  const [refreshAlunos, setRefreshAlunos] = useState(false);
  const [refreshAvisos, setRefreshAvisos] = useState(false);
  const [editingAluno, setEditingAluno] = useState(null);
  const [editingAviso, setEditingAviso] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
      }
    };
    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("userType");
    navigate("/login");
  };

  const handleLinkOldEssays = async () => {
    setIsLinking(true);
    try {
      const success = await linkOldEssaysToStudents();
      if (success) {
        toast({
          title: "Sucesso!",
          description: "Redações antigas vinculadas com sucesso aos e-mails corretos.",
        });
      } else {
        toast({
          title: "Erro",
          description: "Erro ao vincular redações antigas.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLinking(false);
    }
  };

  const handleEditAluno = (aluno: any) => {
    setEditingAluno(aluno);
  };

  const handleEditAviso = (aviso: any) => {
    setEditingAviso(aviso);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Painel Administrativo
            </h1>
            <div className="flex gap-4">
              <Button
                onClick={handleLinkOldEssays}
                disabled={isLinking}
                variant="outline"
                className="text-sm"
              >
                {isLinking ? "Vinculando..." : "🔗 Vincular Redações Antigas"}
              </Button>
              <Button onClick={handleLogout} variant="outline">
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="alunos" className="space-y-6">
          <TabsList className="grid grid-cols-6 lg:grid-cols-11 w-full">
            <TabsTrigger value="alunos" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Alunos
            </TabsTrigger>
            <TabsTrigger value="creditos" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Créditos
            </TabsTrigger>
            <TabsTrigger value="redacoes" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Redações
            </TabsTrigger>
            <TabsTrigger value="temas" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Temas
            </TabsTrigger>
            <TabsTrigger value="aulas" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Aulas
            </TabsTrigger>
            <TabsTrigger value="avisos" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Avisos
            </TabsTrigger>
            <TabsTrigger value="videos" className="flex items-center gap-2">
              <Video className="w-4 h-4" />
              Vídeos
            </TabsTrigger>
            <TabsTrigger value="biblioteca" className="flex items-center gap-2">
              <Library className="w-4 h-4" />
              Biblioteca
            </TabsTrigger>
            <TabsTrigger value="exercicios" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Exercícios
            </TabsTrigger>
            <TabsTrigger value="radar" className="flex items-center gap-2">
              <Radar className="w-4 h-4" />
              Radar
            </TabsTrigger>
            <TabsTrigger value="corretores" className="flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              Corretores
            </TabsTrigger>
          </TabsList>

          <TabsContent value="alunos">
            <AlunoList refresh={refreshAlunos} onEdit={handleEditAluno} />
          </TabsContent>

          <TabsContent value="creditos">
            <CreditManager />
          </TabsContent>

          <TabsContent value="redacoes">
            <RedacaoList />
          </TabsContent>

          <TabsContent value="temas">
            <TemaList />
          </TabsContent>

          <TabsContent value="aulas">
            <AulaList />
          </TabsContent>

          <TabsContent value="avisos">
            <AvisoList refresh={refreshAvisos} onEdit={handleEditAviso} />
          </TabsContent>

          <TabsContent value="videos">
            <VideoList />
          </TabsContent>

          <TabsContent value="biblioteca">
            <BibliotecaList />
          </TabsContent>

          <TabsContent value="exercicios">
            <ExercicioList />
          </TabsContent>

          <TabsContent value="radar">
            <RadarList />
          </TabsContent>

          <TabsContent value="corretores">
            <CorretorList />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
