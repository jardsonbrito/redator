
import React, { lazy, Suspense } from "react";
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from "./hooks/useAuth";
import { StudentAuthProvider } from "./hooks/useStudentAuth";
import { NavigationProvider } from "./hooks/useNavigationContext";
import { AdminNavigationProvider } from "./hooks/useAdminNavigationContext";
import { Toaster } from "@/components/ui/toaster"
import { CorretorAuthProvider } from "./hooks/useCorretorAuth";
import { ProfessorAuthProvider } from "./hooks/useProfessorAuth";
import { ProfessorProtectedRoute } from "./components/ProfessorProtectedRoute";
import { ProtectedStudentRoute } from "./components/ProtectedStudentRoute";
import { ProtectedStudentOrAdminRoute } from "./components/ProtectedStudentOrAdminRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";

// ── Páginas com default export ──────────────────────────────────────────────
const GamificacaoAdmin        = lazy(() => import("./pages/admin/GamificacaoAdmin"));
const ProcessoSeletivoAdmin   = lazy(() => import("./pages/admin/ProcessoSeletivoAdmin"));
const Welcome                 = lazy(() => import("./pages/Welcome"));
const Admin                   = lazy(() => import("./pages/Admin"));
const Exportacao              = lazy(() => import("./pages/admin/Exportacao"));
const Login                   = lazy(() => import("./pages/Login"));
const Index                   = lazy(() => import("./pages/Index"));
const AlunoLogin              = lazy(() => import("./pages/AlunoLogin"));
const VisitanteLogin          = lazy(() => import("./pages/VisitanteLogin"));
const Simulados               = lazy(() => import("./pages/Simulados"));
const Microaprendizagem       = lazy(() => import("./pages/Microaprendizagem"));
const MicroaprendizagemTopico = lazy(() => import("./pages/MicroaprendizagemTopico"));
const MicroaprendizagemItem   = lazy(() => import("./pages/MicroaprendizagemItem"));
const Temas                   = lazy(() => import("./pages/Temas"));
const TemaDetalhes            = lazy(() => import("./pages/TemaDetalhes"));
const Aulas                   = lazy(() => import("./pages/Aulas"));
const Videoteca               = lazy(() => import("./pages/Videoteca"));
const Biblioteca              = lazy(() => import("./pages/Biblioteca"));
const RedacoesExemplar        = lazy(() => import("./pages/RedacoesExemplar"));
const Top5                    = lazy(() => import("./pages/Top5"));
const Exercicios              = lazy(() => import("./pages/Exercicios"));
const ProducaoGuiadaPage      = lazy(() => import("./pages/ProducaoGuiadaPage"));
const EnvieRedacao            = lazy(() => import("./pages/EnvieRedacao"));
const MinhasRedacoesList      = lazy(() => import("./pages/MinhasRedacoesList"));
const AlunoLousaList          = lazy(() => import("./components/student/AlunoLousaList"));
const LousaResponse           = lazy(() => import("./components/student/LousaResponse"));
const SimuladoParticipacao    = lazy(() => import("./pages/SimuladoParticipacao"));
const CorretorLogin           = lazy(() => import("./pages/CorretorLogin"));
const CorretorHome            = lazy(() => import("./pages/CorretorHome"));
const CorretorRedacoes        = lazy(() => import("./pages/corretor/CorretorRedacoes"));
const CorretorTemas           = lazy(() => import("./pages/corretor/CorretorTemas"));
const CorretorSimulados       = lazy(() => import("./pages/corretor/CorretorSimulados"));
const CorretorSimuladoRedacoes = lazy(() => import("./pages/corretor/CorretorSimuladoRedacoes"));
const CorretorRedacaoSimuladoDetalhes = lazy(() => import("./pages/corretor/CorretorRedacaoSimuladoDetalhes"));
const CorretorAulas           = lazy(() => import("./pages/corretor/CorretorAulas"));
const CorretorVideoteca       = lazy(() => import("./pages/corretor/CorretorVideoteca"));
const CorretorBiblioteca      = lazy(() => import("./pages/corretor/CorretorBiblioteca"));
const CorretorRedacoesExemplar = lazy(() => import("./pages/corretor/CorretorRedacoesExemplar"));
const RedacaoExemplarDetalhes = lazy(() => import("./pages/RedacaoExemplarDetalhes"));
const CorretorRedacaoExemplarDetalhes = lazy(() => import("./pages/corretor/CorretorRedacaoExemplarDetalhes"));
const CorretorTop5            = lazy(() => import("./pages/corretor/CorretorTop5"));
const CadastroAluno           = lazy(() => import("./pages/CadastroAluno"));
const AtualizarEmail          = lazy(() => import("./pages/AtualizarEmail"));
const AjudaRapida             = lazy(() => import("./pages/AjudaRapida"));
const CorretorAjudaRapida     = lazy(() => import("./pages/corretor/CorretorAjudaRapida"));
const CorretorTemaDetalhes    = lazy(() => import("./pages/corretor/CorretorTemaDetalhes"));
const CorretorLousas          = lazy(() => import("./pages/corretor/CorretorLousas"));
const CorretorLousaDetalhes   = lazy(() => import("./pages/corretor/CorretorLousaDetalhes"));
const CorretorVisitantes      = lazy(() => import("./pages/corretor/CorretorVisitantes"));
const LousaRespostasPage      = lazy(() => import("./pages/admin/LousaRespostas"));
const VisitantesAdmin         = lazy(() => import("./pages/admin/VisitantesAdmin"));
const Top5Admin               = lazy(() => import("./pages/admin/Top5Admin"));
const AulasAoVivo             = lazy(() => import("./pages/AulasAoVivo"));
const SalasVirtuais           = lazy(() => import("./pages/SalasVirtuais"));
const RedacaoManuscrita       = lazy(() => import("./pages/RedacaoManuscrita"));
const Gamificacao             = lazy(() => import("./pages/Gamificacao"));
const DiarioOnline            = lazy(() => import("./pages/DiarioOnline"));
const SimuladoRedacaoCorrigida = lazy(() => import("./pages/SimuladoRedacaoCorrigida"));
const RedacaoRegularDetalhes  = lazy(() => import("./pages/RedacaoRegularDetalhes"));
const ProcessoSeletivo        = lazy(() => import("./pages/ProcessoSeletivo"));
const ProcessoSeletivoInscricao = lazy(() => import("./pages/ProcessoSeletivoInscricao"));
const RepertorioOrientado     = lazy(() => import("./pages/RepertorioOrientado"));
const RepertorioLaboratorio   = lazy(() => import("./pages/admin/RepertorioLaboratorio"));
const AdminNotes              = lazy(() => import("./pages/admin/AdminNotes"));
const GuiaTematico            = lazy(() => import("./pages/GuiaTematico"));
const GuiaTematicoAdmin       = lazy(() => import("./pages/admin/GuiaTematicoAdmin"));
const Jarvis                  = lazy(() => import("./pages/Jarvis"));
const PlanoEstudo             = lazy(() => import("./pages/PlanoEstudo"));
const PlanoEstudoAdmin        = lazy(() => import("./pages/admin/PlanoEstudoAdmin"));

// ── Páginas com named export ─────────────────────────────────────────────────
const Avisos            = lazy(() => import("./pages/admin/Avisos").then(m => ({ default: m.Avisos })));
const Redacoes          = lazy(() => import("./pages/admin/Redacoes").then(m => ({ default: m.Redacoes })));
const SimuladosAdmin    = lazy(() => import("./pages/admin/SimuladosAdmin").then(m => ({ default: m.SimuladosAdmin })));
const ExerciciosAdmin   = lazy(() => import("./pages/admin/ExerciciosAdmin").then(m => ({ default: m.ExerciciosAdmin })));
const CorretoresAdmin   = lazy(() => import("./pages/admin/CorretoresAdmin").then(m => ({ default: m.CorretoresAdmin })));
const AjudaRapidaAdmin  = lazy(() => import("./pages/admin/AjudaRapidaAdmin").then(m => ({ default: m.AjudaRapidaAdmin })));
const CustomizePlanSimple  = lazy(() => import("./pages/admin/CustomizePlanSimple").then(m => ({ default: m.CustomizePlanSimple })));
const CustomizePlanByName  = lazy(() => import("./pages/admin/CustomizePlanByName").then(m => ({ default: m.CustomizePlanByName })));
const CustomizeStudentPlan = lazy(() => import("./pages/admin/CustomizeStudentPlan").then(m => ({ default: m.CustomizeStudentPlan })));
const ProfessorLogin       = lazy(() => import("./pages/ProfessorLogin").then(m => ({ default: m.ProfessorLogin })));
const ProfessorDashboard   = lazy(() => import("./pages/ProfessorDashboard").then(m => ({ default: m.ProfessorDashboard })));
const TrocarSenhaProfessor = lazy(() => import("./pages/TrocarSenhaProfessor").then(m => ({ default: m.TrocarSenhaProfessor })));
const ProfessorTemas       = lazy(() => import("./pages/professor/ProfessorTemas").then(m => ({ default: m.ProfessorTemas })));
const ProfessorRedacoes    = lazy(() => import("./pages/professor/ProfessorRedacoes").then(m => ({ default: m.ProfessorRedacoes })));
const ProfessorBiblioteca  = lazy(() => import("./pages/professor/ProfessorBiblioteca").then(m => ({ default: m.ProfessorBiblioteca })));
const ProfessorVideoteca   = lazy(() => import("./pages/professor/ProfessorVideoteca").then(m => ({ default: m.ProfessorVideoteca })));
const ProfessorTurmas      = lazy(() => import("./pages/professor/ProfessorTurmas").then(m => ({ default: m.ProfessorTurmas })));
const ProfessorAlunos      = lazy(() => import("./pages/professor/ProfessorAlunos").then(m => ({ default: m.ProfessorAlunos })));
const ProfessorAulas       = lazy(() => import("./pages/professor/ProfessorAulas").then(m => ({ default: m.ProfessorAulas })));
const ProfessorExercicios  = lazy(() => import("./pages/professor/ProfessorExercicios").then(m => ({ default: m.ProfessorExercicios })));
const ProfessorSimulados   = lazy(() => import("./pages/professor/ProfessorSimulados").then(m => ({ default: m.ProfessorSimulados })));
const ProfessorSalasVirtuais = lazy(() => import("./pages/professor/ProfessorSalasVirtuais").then(m => ({ default: m.ProfessorSalasVirtuais })));
const ProfessorAvisos      = lazy(() => import("./pages/professor/ProfessorAvisos").then(m => ({ default: m.ProfessorAvisos })));
const ProfessorVisitantes  = lazy(() => import("./pages/professor/ProfessorVisitantes").then(m => ({ default: m.ProfessorVisitantes })));
const LaboratorioAulaView  = lazy(() => import("./components/repertorio/laboratorio/LaboratorioAula").then(m => ({ default: m.LaboratorioAulaView })));
const GuiaTematicoView     = lazy(() => import("./components/guia-tematico/GuiaTematicoView").then(m => ({ default: m.GuiaTematicoView })));

// Fallback de carregamento entre rotas
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

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
                  <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {/* Rotas Públicas */}
                    <Route path="/" element={<Welcome />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/aluno-login" element={<AlunoLogin />} />
                    <Route path="/visitante-login" element={<VisitanteLogin />} />
                    <Route path="/cadastro-aluno" element={<CadastroAluno />} />
                    <Route path="/atualizar-email" element={<AtualizarEmail />} />
                    <Route path="/processo-seletivo/inscricao/:formularioId" element={<ProcessoSeletivoInscricao />} />

                    <Route path="/app" element={<ProtectedStudentRoute><Index /></ProtectedStudentRoute>} />
                    <Route path="/temas" element={<ProtectedStudentRoute><Temas /></ProtectedStudentRoute>} />
                    <Route path="/temas/:id" element={<ProtectedStudentRoute><TemaDetalhes /></ProtectedStudentRoute>} />
                    <Route path="/simulados" element={<ProtectedStudentRoute><Simulados /></ProtectedStudentRoute>} />
                    {/* Corrigindo as rotas do simulado - ambas devem funcionar */}
                    <Route path="/simulado/:id" element={<ProtectedStudentRoute><SimuladoParticipacao /></ProtectedStudentRoute>} />
                    <Route path="/simulados/:id" element={<ProtectedStudentRoute><SimuladoParticipacao /></ProtectedStudentRoute>} />
                    <Route path="/simulados/:simuladoId/redacao-corrigida" element={<ProtectedStudentRoute><SimuladoRedacaoCorrigida /></ProtectedStudentRoute>} />
                    <Route path="/processo-seletivo" element={<ProtectedStudentRoute><ProcessoSeletivo /></ProtectedStudentRoute>} />
                    <Route path="/exercicios" element={<ProtectedStudentRoute><Exercicios /></ProtectedStudentRoute>} />
                    <Route path="/exercicios/:id/producao-guiada" element={<ProtectedStudentRoute><ProducaoGuiadaPage /></ProtectedStudentRoute>} />
                    <Route path="/envie-redacao" element={<ProtectedStudentRoute><EnvieRedacao /></ProtectedStudentRoute>} />
                    <Route path="/minhas-redacoes" element={<ProtectedStudentRoute><MinhasRedacoesList /></ProtectedStudentRoute>} />
                    <Route path="/minhas-redacoes/:redacaoId" element={<ProtectedStudentRoute><RedacaoRegularDetalhes /></ProtectedStudentRoute>} />
                    <Route path="/redacoes/manuscrita/:id" element={<ProtectedStudentRoute><RedacaoManuscrita /></ProtectedStudentRoute>} />
                    <Route path="/aulas" element={<ProtectedStudentRoute><Aulas /></ProtectedStudentRoute>} />
                    <Route path="/aulas-ao-vivo" element={<ProtectedStudentRoute><AulasAoVivo /></ProtectedStudentRoute>} />
                    <Route path="/salas-virtuais" element={<ProtectedStudentRoute><SalasVirtuais /></ProtectedStudentRoute>} />
                    <Route path="/videoteca" element={<ProtectedStudentRoute><Videoteca /></ProtectedStudentRoute>} />
                    <Route path="/biblioteca" element={<ProtectedStudentRoute><Biblioteca /></ProtectedStudentRoute>} />
                    <Route path="/redacoes" element={<ProtectedStudentRoute><RedacoesExemplar /></ProtectedStudentRoute>} />
                    <Route path="/redacoes-exemplar/:id" element={
                      <ProtectedStudentOrAdminRoute>
                        <ErrorBoundary>
                          <RedacaoExemplarDetalhes />
                        </ErrorBoundary>
                      </ProtectedStudentOrAdminRoute>
                    } />
                    <Route path="/top5" element={<ProtectedStudentRoute><Top5 /></ProtectedStudentRoute>} />
                    <Route path="/lousa" element={<ProtectedStudentRoute><AlunoLousaList /></ProtectedStudentRoute>} />
                    <Route path="/lousa/:id" element={<ProtectedStudentRoute><LousaResponse /></ProtectedStudentRoute>} />
                    <Route path="/ajuda-rapida" element={<ProtectedStudentRoute><AjudaRapida /></ProtectedStudentRoute>} />
                    <Route path="/guia-tematico" element={<ProtectedStudentRoute><GuiaTematico /></ProtectedStudentRoute>} />
                    <Route path="/guia-tematico/:id" element={<ProtectedStudentRoute><GuiaTematicoView /></ProtectedStudentRoute>} />
                    <Route path="/jarvis" element={<ProtectedStudentRoute><Jarvis /></ProtectedStudentRoute>} />
                    <Route path="/plano-estudo" element={<ProtectedStudentRoute><PlanoEstudo /></ProtectedStudentRoute>} />
                    <Route path="/repertorio-orientado" element={<ProtectedStudentRoute><RepertorioOrientado /></ProtectedStudentRoute>} />
                    <Route path="/repertorio-orientado/laboratorio/:id" element={<ProtectedStudentRoute><LaboratorioAulaView /></ProtectedStudentRoute>} />
                    <Route path="/gamificacao" element={<ProtectedStudentRoute><Gamificacao /></ProtectedStudentRoute>} />
                    <Route path="/diario-online" element={<ProtectedStudentRoute><DiarioOnline /></ProtectedStudentRoute>} />
                    <Route path="/microaprendizagem" element={<ProtectedStudentRoute><Microaprendizagem /></ProtectedStudentRoute>} />
                    <Route path="/microaprendizagem/:topicoId" element={<ProtectedStudentRoute><MicroaprendizagemTopico /></ProtectedStudentRoute>} />
                    <Route path="/microaprendizagem/:topicoId/:itemId" element={<ProtectedStudentRoute><MicroaprendizagemItem /></ProtectedStudentRoute>} />

                    {/* Rotas do Admin */}
                    <Route path="/admin" element={<Admin />} />
                    <Route path="/admin/avisos" element={<Avisos />} />
                    <Route path="/admin/redacoes" element={<Redacoes />} />
                    <Route path="/admin/simulados" element={<SimuladosAdmin />} />
                    <Route path="/admin/exercicios" element={<ExerciciosAdmin />} />
                    <Route path="/admin/corretores" element={<CorretoresAdmin />} />
                    <Route path="/admin/visitantes" element={<VisitantesAdmin />} />
                    <Route path="/admin/exportacao" element={<Exportacao />} />
                    <Route path="/admin/ajuda-rapida" element={<AjudaRapidaAdmin />} />
                    <Route path="/admin/gamificacao" element={<GamificacaoAdmin />} />
                    <Route path="/admin/processo-seletivo" element={<ProcessoSeletivoAdmin />} />
                    <Route path="/admin/top5" element={<Top5Admin />} />
                    <Route path="/admin/lousa/:lousaId/respostas" element={<LousaRespostasPage />} />
                    <Route path="/admin/customize-plan/:turmaId" element={<CustomizePlanSimple />} />
                    <Route path="/admin/customize-plan-by-name/:turmaNome" element={<CustomizePlanByName />} />
                    <Route path="/admin/customize-student-plan/:studentId" element={<CustomizeStudentPlan />} />
                    <Route path="/admin/anotacoes" element={<AdminNotes />} />
                    <Route path="/admin/laboratorio" element={<RepertorioLaboratorio />} />
                    <Route path="/admin/guia-tematico" element={<GuiaTematicoAdmin />} />
                    <Route path="/admin/plano-estudo" element={<PlanoEstudoAdmin />} />

                    {/* Rotas do Corretor */}
                    <Route path="/corretor/login" element={<CorretorLogin />} />
                    <Route path="/corretor" element={<CorretorHome />} />
                    <Route path="/corretor/redacoes-corretor" element={<CorretorRedacoes />} />
                    <Route path="/corretor/temas" element={<CorretorTemas />} />
                    <Route path="/corretor/temas/:id" element={<CorretorTemaDetalhes />} />
                    <Route path="/corretor/simulados" element={<CorretorSimulados />} />
                    <Route path="/corretor/simulados/:simuladoId/redacoes" element={<CorretorSimuladoRedacoes />} />
                    <Route path="/corretor/simulados/redacao/:id" element={<CorretorRedacaoSimuladoDetalhes />} />
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
                  </Suspense>
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
