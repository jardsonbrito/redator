
import React from "react";
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import GamificacaoAdmin from "./pages/admin/GamificacaoAdmin";
import Welcome from "./pages/Welcome";
import Admin from "./pages/Admin";
import Exportacao from "./pages/admin/Exportacao";
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
import AlunoLousaList from "./components/student/AlunoLousaList";
import LousaResponse from "./components/student/LousaResponse";
import SimuladoParticipacao from "./pages/SimuladoParticipacao";
import { AuthProvider } from "./hooks/useAuth";
import { StudentAuthProvider } from "./hooks/useStudentAuth";
import { NavigationProvider } from "./hooks/useNavigationContext";
import { AdminNavigationProvider } from "./hooks/useAdminNavigationContext";
import { Toaster } from "@/components/ui/toaster"
import { Dashboard } from "./pages/admin/Dashboard";
import { Avisos } from "./pages/admin/Avisos";
import { Redacoes } from "./pages/admin/Redacoes";
import { SimuladosAdmin } from "./pages/admin/SimuladosAdmin";
import { ExerciciosAdmin } from "./pages/admin/ExerciciosAdmin";
import { CorretoresAdmin } from "./pages/admin/CorretoresAdmin";
import CorretorLogin from "./pages/CorretorLogin";
import CorretorHome from "./pages/CorretorHome";
import CorretorRedacoes from "./pages/corretor/CorretorRedacoes";
import CorretorTemas from "./pages/corretor/CorretorTemas";
import CorretorSimulados from "./pages/corretor/CorretorSimulados";
import CorretorSimuladoRedacoes from "./pages/corretor/CorretorSimuladoRedacoes";
import CorretorAulas from "./pages/corretor/CorretorAulas";
import CorretorVideoteca from "./pages/corretor/CorretorVideoteca";
import CorretorBiblioteca from "./pages/corretor/CorretorBiblioteca";
import CorretorRedacoesExemplar from "./pages/corretor/CorretorRedacoesExemplar";
import RedacaoExemplarDetalhes from "./pages/RedacaoExemplarDetalhes";
import CorretorRedacaoExemplarDetalhes from "./pages/corretor/CorretorRedacaoExemplarDetalhes";
import CorretorTop5 from "./pages/corretor/CorretorTop5";
import { CorretorAuthProvider } from "./hooks/useCorretorAuth";
import { ProfessorAuthProvider } from "./hooks/useProfessorAuth";
import { ProfessorProtectedRoute } from "./components/ProfessorProtectedRoute";
import { ProtectedStudentRoute } from "./components/ProtectedStudentRoute";
import { ProfessorLogin } from "./pages/ProfessorLogin";
import { ProfessorDashboard } from "./pages/ProfessorDashboard";
import { TrocarSenhaProfessor } from "./pages/TrocarSenhaProfessor";
import { ProfessorTemas } from "./pages/professor/ProfessorTemas";
import { ProfessorRedacoes } from "./pages/professor/ProfessorRedacoes";
import { ProfessorBiblioteca } from "./pages/professor/ProfessorBiblioteca";
import { ProfessorVideoteca } from "./pages/professor/ProfessorVideoteca";
import { ProfessorTurmas } from "./pages/professor/ProfessorTurmas";
import { ProfessorAlunos } from "./pages/professor/ProfessorAlunos";
import { ProfessorAulas } from "./pages/professor/ProfessorAulas";
import { ProfessorExercicios } from "./pages/professor/ProfessorExercicios";
import { ProfessorSimulados } from "./pages/professor/ProfessorSimulados";
import { ProfessorSalasVirtuais } from "./pages/professor/ProfessorSalasVirtuais";
import { ProfessorAvisos } from "./pages/professor/ProfessorAvisos";
import { ProfessorVisitantes } from "./pages/professor/ProfessorVisitantes";
import CadastroAluno from "./pages/CadastroAluno";
import AtualizarEmail from "./pages/AtualizarEmail";
import AjudaRapida from "./pages/AjudaRapida";
import CorretorAjudaRapida from "./pages/corretor/CorretorAjudaRapida";
import CorretorTemaDetalhes from "./pages/corretor/CorretorTemaDetalhes";
import CorretorLousas from "./pages/corretor/CorretorLousas";
import CorretorLousaDetalhes from "./pages/corretor/CorretorLousaDetalhes";
import CorretorVisitantes from "./pages/corretor/CorretorVisitantes";
import { AjudaRapidaAdmin } from "./pages/admin/AjudaRapidaAdmin";
import LousaRespostasPage from "./pages/admin/LousaRespostas";
import VisitantesAdmin from "./pages/admin/VisitantesAdmin";
import Top5Admin from "./pages/admin/Top5Admin";
import AulasAoVivo from "./pages/AulasAoVivo";
import SalasVirtuais from "./pages/SalasVirtuais";
import RedacaoManuscrita from "./pages/RedacaoManuscrita";
import MinhasConquistas from "./pages/MinhasConquistas";
import Gamificacao from "./pages/Gamificacao";
import DiarioOnline from "./pages/DiarioOnline";
import SimuladoRedacaoCorrigida from "./pages/SimuladoRedacaoCorrigida";
import { CustomizePlanSimple } from "./pages/admin/CustomizePlanSimple";
import { CustomizePlanByName } from "./pages/admin/CustomizePlanByName";
import { CustomizeStudentPlan } from "./pages/admin/CustomizeStudentPlan";

function App() {
  return (
    <AuthProvider>
      <ProfessorAuthProvider>
        <CorretorAuthProvider>
          <StudentAuthProvider>
            <Router>
              <NavigationProvider>
                <AdminNavigationProvider>
                <div className="min-h-screen bg-background">
                  <Toaster />
                <Routes>
                  {/* Rotas Públicas */}
                  <Route path="/" element={<Welcome />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/aluno-login" element={<AlunoLogin />} />
                  <Route path="/visitante-login" element={<VisitanteLogin />} />
                  <Route path="/cadastro-aluno" element={<CadastroAluno />} />
                  <Route path="/atualizar-email" element={<AtualizarEmail />} />

                  <Route path="/app" element={<ProtectedStudentRoute><Index /></ProtectedStudentRoute>} />
                  <Route path="/temas" element={<ProtectedStudentRoute><Temas /></ProtectedStudentRoute>} />
                  <Route path="/temas/:id" element={<ProtectedStudentRoute><TemaDetalhes /></ProtectedStudentRoute>} />
                  <Route path="/simulados" element={<ProtectedStudentRoute><Simulados /></ProtectedStudentRoute>} />
                  {/* Corrigindo as rotas do simulado - ambas devem funcionar */}
                  <Route path="/simulado/:id" element={<ProtectedStudentRoute><SimuladoParticipacao /></ProtectedStudentRoute>} />
                  <Route path="/simulados/:id" element={<ProtectedStudentRoute><SimuladoParticipacao /></ProtectedStudentRoute>} />
                  <Route path="/simulados/:simuladoId/redacao-corrigida" element={<ProtectedStudentRoute><SimuladoRedacaoCorrigida /></ProtectedStudentRoute>} />
                  <Route path="/exercicios" element={<ProtectedStudentRoute><Exercicios /></ProtectedStudentRoute>} />
                  <Route path="/envie-redacao" element={<ProtectedStudentRoute><EnvieRedacao /></ProtectedStudentRoute>} />
                  <Route path="/minhas-redacoes" element={<ProtectedStudentRoute><MinhasRedacoesList /></ProtectedStudentRoute>} />
                  <Route path="/redacoes/manuscrita/:id" element={<ProtectedStudentRoute><RedacaoManuscrita /></ProtectedStudentRoute>} />
                  <Route path="/aulas" element={<ProtectedStudentRoute><Aulas /></ProtectedStudentRoute>} />
                  <Route path="/aulas-ao-vivo" element={<ProtectedStudentRoute><AulasAoVivo /></ProtectedStudentRoute>} />
                  <Route path="/salas-virtuais" element={<ProtectedStudentRoute><SalasVirtuais /></ProtectedStudentRoute>} />
                  <Route path="/videoteca" element={<ProtectedStudentRoute><Videoteca /></ProtectedStudentRoute>} />
                  <Route path="/biblioteca" element={<ProtectedStudentRoute><Biblioteca /></ProtectedStudentRoute>} />
                  <Route path="/redacoes" element={<ProtectedStudentRoute><RedacoesExemplar /></ProtectedStudentRoute>} />
                  <Route path="/redacoes-exemplar/:id" element={<ProtectedStudentRoute><RedacaoExemplarDetalhes /></ProtectedStudentRoute>} />
                  <Route path="/top5" element={<ProtectedStudentRoute><Top5 /></ProtectedStudentRoute>} />
                  <Route path="/lousa" element={<ProtectedStudentRoute><AlunoLousaList /></ProtectedStudentRoute>} />
                  <Route path="/lousa/:id" element={<ProtectedStudentRoute><LousaResponse /></ProtectedStudentRoute>} />
                  <Route path="/ajuda-rapida" element={<ProtectedStudentRoute><AjudaRapida /></ProtectedStudentRoute>} />
                  <Route path="/minhas-conquistas" element={<ProtectedStudentRoute><MinhasConquistas /></ProtectedStudentRoute>} />
                  <Route path="/gamificacao" element={<ProtectedStudentRoute><Gamificacao /></ProtectedStudentRoute>} />
                  <Route path="/diario-online" element={<ProtectedStudentRoute><DiarioOnline /></ProtectedStudentRoute>} />

                  {/* Rotas do Admin */}
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/admin/dashboard" element={<Dashboard />} />
                  <Route path="/admin/avisos" element={<Avisos />} />
                  <Route path="/admin/redacoes" element={<Redacoes />} />
                  <Route path="/admin/simulados" element={<SimuladosAdmin />} />
                  <Route path="/admin/exercicios" element={<ExerciciosAdmin />} />
                  <Route path="/admin/corretores" element={<CorretoresAdmin />} />
                  <Route path="/admin/visitantes" element={<VisitantesAdmin />} />
                  <Route path="/admin/exportacao" element={<Exportacao />} />
                  <Route path="/admin/ajuda-rapida" element={<AjudaRapidaAdmin />} />
                  <Route path="/admin/gamificacao" element={<GamificacaoAdmin />} />
                  <Route path="/admin/top5" element={<Top5Admin />} />
                  <Route path="/admin/lousa/:lousaId/respostas" element={<LousaRespostasPage />} />
                  <Route path="/admin/customize-plan/:turmaId" element={<CustomizePlanSimple />} />
                  <Route path="/admin/customize-plan-by-name/:turmaNome" element={<CustomizePlanByName />} />
                  <Route path="/admin/customize-student-plan/:studentId" element={<CustomizeStudentPlan />} />
                  
                  {/* Rotas do Corretor */}
                  <Route path="/corretor/login" element={<CorretorLogin />} />
                  <Route path="/corretor" element={<CorretorHome />} />
                  <Route path="/corretor/redacoes-corretor" element={<CorretorRedacoes />} />
                  <Route path="/corretor/temas" element={<CorretorTemas />} />
                  <Route path="/corretor/temas/:id" element={<CorretorTemaDetalhes />} />
                  <Route path="/corretor/simulados" element={<CorretorSimulados />} />
                  <Route path="/corretor/simulados/:simuladoId/redacoes" element={<CorretorSimuladoRedacoes />} />
                  <Route path="/corretor/aulas" element={<CorretorAulas />} />
                  <Route path="/corretor/videoteca" element={<CorretorVideoteca />} />
                  <Route path="/corretor/biblioteca" element={<CorretorBiblioteca />} />
                  <Route path="/corretor/redacoes" element={<CorretorRedacoesExemplar />} />
                  <Route path="/corretor/redacoes-exemplar/:id" element={<CorretorRedacaoExemplarDetalhes />} />
                  <Route path="/corretor/top5" element={<CorretorTop5 />} />
                  <Route path="/corretor/ajuda-rapida" element={<CorretorAjudaRapida />} />
                  <Route path="/corretor/lousas" element={<CorretorLousas />} />
                  <Route path="/corretor/lousas/:id" element={<CorretorLousaDetalhes />} />
                  <Route path="/corretor/visitantes" element={<CorretorVisitantes />} />
                  
                  {/* Rotas do Professor */}
                  <Route path="/professor/login" element={<ProfessorLogin />} />
                  <Route path="/professor/dashboard" element={
                    <ProfessorProtectedRoute>
                      <ProfessorDashboard />
                    </ProfessorProtectedRoute>
                  } />
                  <Route path="/professor/trocar-senha" element={<TrocarSenhaProfessor />} />
                  <Route path="/professor/turmas" element={
                    <ProfessorProtectedRoute>
                      <ProfessorTurmas />
                    </ProfessorProtectedRoute>
                  } />
                  <Route path="/professor/alunos" element={
                    <ProfessorProtectedRoute>
                      <ProfessorAlunos />
                    </ProfessorProtectedRoute>
                  } />
                  <Route path="/professor/aulas" element={
                    <ProfessorProtectedRoute>
                      <ProfessorAulas />
                    </ProfessorProtectedRoute>
                  } />
                  <Route path="/professor/exercicios" element={
                    <ProfessorProtectedRoute>
                      <ProfessorExercicios />
                    </ProfessorProtectedRoute>
                  } />
                  <Route path="/professor/simulados" element={
                    <ProfessorProtectedRoute>
                      <ProfessorSimulados />
                    </ProfessorProtectedRoute>
                  } />
                  <Route path="/professor/salas-virtuais" element={
                    <ProfessorProtectedRoute>
                      <ProfessorSalasVirtuais />
                    </ProfessorProtectedRoute>
                  } />
                  <Route path="/professor/avisos" element={
                    <ProfessorProtectedRoute>
                      <ProfessorAvisos />
                    </ProfessorProtectedRoute>
                  } />
                  <Route path="/professor/visitantes" element={
                    <ProfessorProtectedRoute>
                      <ProfessorVisitantes />
                    </ProfessorProtectedRoute>
                  } />
                  <Route path="/professor/temas" element={
                    <ProfessorProtectedRoute>
                      <ProfessorTemas />
                    </ProfessorProtectedRoute>
                  } />
                  <Route path="/professor/redacoes" element={
                    <ProfessorProtectedRoute>
                      <ProfessorRedacoes />
                    </ProfessorProtectedRoute>
                  } />
                  <Route path="/professor/biblioteca" element={
                    <ProfessorProtectedRoute>
                      <ProfessorBiblioteca />
                    </ProfessorProtectedRoute>
                  } />
                  <Route path="/professor/videoteca" element={
                    <ProfessorProtectedRoute>
                      <ProfessorVideoteca />
                    </ProfessorProtectedRoute>
                  } />
                </Routes>
                </div>
                </AdminNavigationProvider>
              </NavigationProvider>
            </Router>
          </StudentAuthProvider>
        </CorretorAuthProvider>
      </ProfessorAuthProvider>
    </AuthProvider>
  );
}

export default App;
