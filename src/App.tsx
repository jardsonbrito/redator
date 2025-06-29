
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Redacoes from "./pages/Redacoes";
import RedacaoDetalhes from "./pages/RedacaoDetalhes";
import Temas from "./pages/Temas";
import TemaDetalhes from "./pages/TemaDetalhes";
import Videoteca from "./pages/Videoteca";
import Aulas from "./pages/Aulas";
import AulaModulo from "./pages/AulaModulo";
import AulaAoVivo from "./pages/AulaAoVivo";
import Exercicios from "./pages/Exercicios";
import ExercicioDetalhes from "./pages/ExercicioDetalhes";
import EnvieRedacao from "./pages/EnvieRedacao";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/redacoes" element={<Redacoes />} />
            <Route path="/redacoes/:id" element={<RedacaoDetalhes />} />
            <Route path="/temas" element={<Temas />} />
            <Route path="/temas/:id" element={<TemaDetalhes />} />
            <Route path="/videoteca" element={<Videoteca />} />
            <Route path="/aulas" element={<Aulas />} />
            <Route path="/aulas/modulo/:moduleId" element={<AulaModulo />} />
            <Route path="/aulas/ao-vivo" element={<AulaAoVivo />} />
            <Route path="/exercicios" element={<Exercicios />} />
            <Route path="/exercicios/:id" element={<ExercicioDetalhes />} />
            <Route path="/envie-redacao" element={<EnvieRedacao />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin" element={<Admin />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
