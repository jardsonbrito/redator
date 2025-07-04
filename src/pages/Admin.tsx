
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlunoForm } from "@/components/admin/AlunoForm";
import { AlunoList } from "@/components/admin/AlunoList";
import { AulaForm } from "@/components/admin/AulaForm";
import { AulaList } from "@/components/admin/AulaList";
import { ExercicioForm } from "@/components/admin/ExercicioForm";
import { ExercicioList } from "@/components/admin/ExercicioList";
import { TemaForm } from "@/components/admin/TemaForm";
import { TemaList } from "@/components/admin/TemaList";
import { RedacaoList } from "@/components/admin/RedacaoList";
import { SimuladoForm } from "@/components/admin/SimuladoForm";
import SimuladoList from "@/components/admin/SimuladoList";
import { VideoForm } from "@/components/admin/VideoForm";
import { VideoList } from "@/components/admin/VideoList";
import { BibliotecaForm } from "@/components/admin/BibliotecaForm";
import { BibliotecaList } from "@/components/admin/BibliotecaList";
import { AvisoForm } from "@/components/admin/AvisoForm";
import { AvisoList } from "@/components/admin/AvisoList";
import { AulaVirtualForm } from "@/components/admin/AulaVirtualForm";
import { AulaVirtualList } from "@/components/admin/AulaVirtualList";
import { RadarUpload } from "@/components/admin/RadarUpload";
import { RadarList } from "@/components/admin/RadarList";
import { RadarRedacoes } from "@/components/admin/RadarRedacoes";

export default function Admin() {
  const [refreshAulas, setRefreshAulas] = useState(false);
  const [refreshExercicios, setRefreshExercicios] = useState(false);
  const [refreshTemas, setRefreshTemas] = useState(false);
  const [refreshSimulados, setRefreshSimulados] = useState(false);
  const [refreshVideos, setRefreshVideos] = useState(false);
  const [refreshBiblioteca, setRefreshBiblioteca] = useState(false);
  const [refreshAvisos, setRefreshAvisos] = useState(false);
  const [refreshAulasVirtuais, setRefreshAulasVirtuais] = useState(false);
  const [refreshAlunos, setRefreshAlunos] = useState(false);

  // Estados para modo de edição
  const [alunoEditando, setAlunoEditando] = useState(null);
  const [avisoEditando, setAvisoEditando] = useState(null);
  const [temaEditando, setTemaEditando] = useState(null);

  const handleAulaSuccess = () => {
    setRefreshAulas(!refreshAulas);
  };

  const handleExercicioSuccess = () => {
    setRefreshExercicios(!refreshExercicios);
  };

  const handleTemaSuccess = () => {
    setRefreshTemas(!refreshTemas);
    setTemaEditando(null);
  };

  const handleSimuladoSuccess = () => {
    setRefreshSimulados(!refreshSimulados);
  };

  const handleVideoSuccess = () => {
    setRefreshVideos(!refreshVideos);
  };

  const handleBibliotecaSuccess = () => {
    setRefreshBiblioteca(!refreshBiblioteca);
  };

  const handleAvisoSuccess = () => {
    setRefreshAvisos(!refreshAvisos);
    setAvisoEditando(null);
  };

  const handleAulaVirtualSuccess = () => {
    setRefreshAulasVirtuais(!refreshAulasVirtuais);
  };

  const handleAlunoSuccess = () => {
    setRefreshAlunos(!refreshAlunos);
  };

  const handleEditAluno = (aluno: any) => {
    setAlunoEditando(aluno);
  };

  const handleCancelEditAluno = () => {
    setAlunoEditando(null);
  };

  const handleEditAviso = (aviso: any) => {
    setAvisoEditando(aviso);
  };

  const handleEditTema = (tema: any) => {
    setTemaEditando(tema);
  };

  const handleCancelEditTema = () => {
    setTemaEditando(null);
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <h1 className="text-3xl font-bold text-center mb-8">Painel Administrativo</h1>
      
      <Tabs defaultValue="salas" className="w-full">
        <TabsList className="grid w-full grid-cols-6 lg:grid-cols-10">
          <TabsTrigger value="salas">Salas</TabsTrigger>
          <TabsTrigger value="alunos">Alunos</TabsTrigger>
          <TabsTrigger value="aulas">Aulas</TabsTrigger>
          <TabsTrigger value="exercicios">Exercícios</TabsTrigger>
          <TabsTrigger value="temas">Temas</TabsTrigger>
          <TabsTrigger value="redacoes">Redações</TabsTrigger>
          <TabsTrigger value="simulados">Simulados</TabsTrigger>
          <TabsTrigger value="videos">Vídeos</TabsTrigger>
          <TabsTrigger value="biblioteca">Biblioteca</TabsTrigger>
          <TabsTrigger value="avisos">Avisos</TabsTrigger>
          <TabsTrigger value="radar">Radar</TabsTrigger>
        </TabsList>

        <TabsContent value="salas" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AulaVirtualForm onSuccess={handleAulaVirtualSuccess} />
            <AulaVirtualList refresh={refreshAulasVirtuais} />
          </div>
        </TabsContent>

        <TabsContent value="alunos" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AlunoForm 
              onSuccess={handleAlunoSuccess}
              alunoEditando={alunoEditando}
              onCancelEdit={handleCancelEditAluno}
            />
            <AlunoList 
              refresh={refreshAlunos} 
              onEdit={handleEditAluno}
            />
          </div>
        </TabsContent>

        <TabsContent value="aulas" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AulaForm onSuccess={handleAulaSuccess} />
            <AulaList refresh={refreshAulas} />
          </div>
        </TabsContent>

        <TabsContent value="exercicios" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ExercicioForm onSuccess={handleExercicioSuccess} />
            <ExercicioList />
          </div>
        </TabsContent>

        <TabsContent value="temas" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TemaForm />
            <TemaList />
          </div>
        </TabsContent>

        <TabsContent value="redacoes" className="space-y-6">
          <RedacaoList />
        </TabsContent>

        <TabsContent value="simulados" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SimuladoForm onSuccess={handleSimuladoSuccess} />
            <SimuladoList />
          </div>
        </TabsContent>

        <TabsContent value="videos" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <VideoForm />
            <VideoList />
          </div>
        </TabsContent>

        <TabsContent value="biblioteca" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BibliotecaForm />
            <BibliotecaList />
          </div>
        </TabsContent>

        <TabsContent value="avisos" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AvisoForm onSuccess={handleAvisoSuccess} />
            <AvisoList refresh={refreshAvisos} onEdit={handleEditAviso} />
          </div>
        </TabsContent>

        <TabsContent value="radar" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Painel de Resultados - Radar</CardTitle>
              <p className="text-sm text-muted-foreground">
                Acompanhe aqui o desempenho geral dos alunos nos exercícios e redações corrigidas.
              </p>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="dados" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="dados">Dados de Exercícios</TabsTrigger>
                  <TabsTrigger value="redacoes">Redações Corrigidas</TabsTrigger>
                </TabsList>
                
                <TabsContent value="dados" className="space-y-6">
                  <RadarUpload />
                  <RadarList />
                </TabsContent>
                
                <TabsContent value="redacoes" className="space-y-6">
                  <RadarRedacoes />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
