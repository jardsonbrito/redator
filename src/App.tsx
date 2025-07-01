
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { StudentAuthProvider } from "@/hooks/useStudentAuth";
import Welcome from "./pages/Welcome";
import AlunoLogin from "./pages/AlunoLogin";
import VisitanteLogin from "./pages/VisitanteLogin";
import Index from "./pages/Index";
import Redacoes from "./pages/Redacoes";
import RedacaoDetalhes from "./pages/RedacaoDetalhes";
import Temas from "./pages/Temas";
import TemaDetalhes from "./pages/TemaDetalhes";
import Videoteca from "./pages/Videoteca";
import Biblioteca from "./pages/Biblioteca";
import Simulados from "./pages/Simulados";
import SimuladoDetalhes from "./pages/SimuladoDetalhes";
import MeusSimulados from "./pages/MeusSimulados";
import EnvieRedacao from "./pages/EnvieRedacao";
import Aulas from "./pages/Aulas";
import Exercicios from "./pages/Exercicios";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <StudentAuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Welcome />} />
              <Route path="/aluno-login" element={<AlunoLogin />} />
              <Route path="/visitante-login" element={<VisitanteLogin />} />
              <Route path="/app" element={<Index />} />
              <Route path="/redacoes" element={<Redacoes />} />
              <Route path="/redacoes/:id" element={<RedacaoDetalhes />} />
              <Route path="/temas" element={<Temas />} />
              <Route path="/temas/:id" element={<TemaDetalhes />} />
              <Route path="/videoteca" element={<Videoteca />} />
              <Route path="/biblioteca" element={<Biblioteca />} />
              <Route path="/simulados" element={<Simulados />} />
              <Route path="/simulados/:id" element={<SimuladoDetalhes />} />
              <Route path="/meus-simulados" element={<MeusSimulados />} />
              <Route path="/aulas" element={<Aulas />} />
              <Route path="/exercicios" element={<Exercicios />} />
              <Route path="/envie-redacao" element={<EnvieRedacao />} />
              <Route path="/login" element={<Login />} />
              <Route path="/admin" element={<Admin />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </StudentAuthProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
