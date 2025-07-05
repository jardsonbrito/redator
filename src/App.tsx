
import React from "react";
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Welcome from "./pages/Welcome";
import Admin from "./pages/Admin";
import AdminAlunos from "./pages/admin/AdminAlunos";
import AdminCreditos from "./pages/admin/AdminCreditos";
import AdminTemas from "./pages/admin/AdminTemas";
import AdminAulas from "./pages/admin/AdminAulas";
import AdminVideos from "./pages/admin/AdminVideos";
import AdminBiblioteca from "./pages/admin/AdminBiblioteca";
import AdminRadar from "./pages/admin/AdminRadar";
import Login from "./pages/Login";
import Index from "./pages/Index";
import AlunoLogin from "./pages/AlunoLogin";
import VisitanteLogin from "./pages/VisitanteLogin";
import Simulados from "./pages/Simulados";
import Temas from "./pages/Temas";
import TemaDetalhes from "./pages/TemaDetalhes";
import Aulas from "./pages/Aulas";
import Videoteca from "./pages/Videoteca";
import Biblioteca from "./pages/Biblioteca";
import RedacoesExemplar from "./pages/RedacoesExemplar";
import Top5 from "./pages/Top5";
import Exercicios from "./pages/Exercicios";
import EnvieRedacao from "./pages/EnvieRedacao";
import MinhasRedacoesList from "./pages/MinhasRedacoesList";
import SimuladoParticipacao from "./pages/SimuladoParticipacao";
import { AuthProvider } from "./hooks/useAuth";
import { StudentAuthProvider } from "./hooks/useStudentAuth";
import { Toaster } from "@/components/ui/toaster"
import { Dashboard } from "./pages/admin/Dashboard";
import { Avisos } from "./pages/admin/Avisos";
import { Redacoes } from "./pages/admin/Redacoes";
import { SimuladosAdmin } from "./pages/admin/SimuladosAdmin";
import { ExerciciosAdmin } from "./pages/admin/ExerciciosAdmin";
import { CorretoresAdmin } from "./pages/admin/CorretoresAdmin";
import CorretorLogin from "./pages/CorretorLogin";
import CorretorHome from "./pages/CorretorHome";
import CorretorTemas from "./pages/corretor/CorretorTemas";
import CorretorSimulados from "./pages/corretor/CorretorSimulados";
import CorretorAulas from "./pages/corretor/CorretorAulas";
import CorretorVideoteca from "./pages/corretor/CorretorVideoteca";
import CorretorBiblioteca from "./pages/corretor/CorretorBiblioteca";
import CorretorRedacoesExemplar from "./pages/corretor/CorretorRedacoesExemplar";
import CorretorTop5 from "./pages/corretor/CorretorTop5";
import { CorretorAuthProvider } from "./hooks/useCorretorAuth";

function App() {
  return (
    <CorretorAuthProvider>
      <StudentAuthProvider>
        <AuthProvider>
          <Router>
            <div className="min-h-screen bg-background">
              <Toaster />
              <Routes>
                {/* Rota principal - deve renderizar a nova tela de login */}
                <Route path="/" element={<Login />} />
                <Route path="/welcome" element={<Welcome />} />
                <Route path="/login" element={<Login />} />
                <Route path="/aluno-login" element={<AlunoLogin />} />
                <Route path="/visitante-login" element={<VisitanteLogin />} />

                <Route path="/app" element={<Index />} />
                <Route path="/temas" element={<Temas />} />
                <Route path="/temas/:id" element={<TemaDetalhes />} />
                <Route path="/simulados" element={<Simulados />} />
                {/* Corrigindo as rotas do simulado - ambas devem funcionar */}
                <Route path="/simulado/:id" element={<SimuladoParticipacao />} />
                <Route path="/simulados/:id" element={<SimuladoParticipacao />} />
                <Route path="/exercicios" element={<Exercicios />} />
                <Route path="/envie-redacao" element={<EnvieRedacao />} />
                <Route path="/minhas-redacoes" element={<MinhasRedacoesList />} />
                <Route path="/aulas" element={<Aulas />} />
                <Route path="/videoteca" element={<Videoteca />} />
                <Route path="/biblioteca" element={<Biblioteca />} />
                <Route path="/redacoes" element={<RedacoesExemplar />} />
                <Route path="/top5" element={<Top5 />} />

                {/* Rotas do Admin */}
                <Route path="/admin" element={<Admin />} />
                <Route path="/admin/alunos" element={<AdminAlunos />} />
                <Route path="/admin/creditos" element={<AdminCreditos />} />
                <Route path="/admin/redacoes" element={<Redacoes />} />
                <Route path="/admin/temas" element={<AdminTemas />} />
                <Route path="/admin/aulas" element={<AdminAulas />} />
                <Route path="/admin/avisos" element={<Avisos />} />
                <Route path="/admin/videos" element={<AdminVideos />} />
                <Route path="/admin/biblioteca" element={<AdminBiblioteca />} />
                <Route path="/admin/exercicios" element={<ExerciciosAdmin />} />
                <Route path="/admin/radar" element={<AdminRadar />} />
                <Route path="/admin/corretores" element={<CorretoresAdmin />} />
                
                {/* Rotas do Corretor */}
                <Route path="/corretor/login" element={<CorretorLogin />} />
                <Route path="/corretor" element={<CorretorHome />} />
                <Route path="/corretor/temas" element={<CorretorTemas />} />
                <Route path="/corretor/simulados" element={<CorretorSimulados />} />
                <Route path="/corretor/aulas" element={<CorretorAulas />} />
                <Route path="/corretor/videoteca" element={<CorretorVideoteca />} />
                <Route path="/corretor/biblioteca" element={<CorretorBiblioteca />} />
                <Route path="/corretor/redacoes" element={<CorretorRedacoesExemplar />} />
                <Route path="/corretor/top5" element={<CorretorTop5 />} />
              </Routes>
            </div>
          </Router>
        </AuthProvider>
      </StudentAuthProvider>
    </CorretorAuthProvider>
  );
}

export default App;
