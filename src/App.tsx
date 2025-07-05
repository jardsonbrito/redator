
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Welcome from "./pages/Welcome";
import StudentApp from "./pages/StudentApp";
import { Redacoes } from "./pages/admin/Redacoes";
import EnvieRedacao from "./pages/EnvieRedacao";
import MinhasRedacoesList from "./pages/MinhasRedacoesList";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminAlunos from "./pages/admin/AdminAlunos";
import AdminCreditos from "./pages/admin/AdminCreditos";
import AdminTemas from "./pages/admin/AdminTemas";
import AdminAulas from "./pages/admin/AdminAulas";
import AdminRadar from "./pages/admin/AdminRadar";
import AdminBiblioteca from "./pages/admin/AdminBiblioteca";
import AdminVideos from "./pages/admin/AdminVideos";
import AdminCorretores from "./pages/admin/AdminCorretores";
import AdminAvisos from "./pages/admin/AdminAvisos";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Welcome />} />
            <Route path="/app" element={<StudentApp />} />
            <Route path="/envie-redacao" element={<EnvieRedacao />} />
            <Route path="/minhas-redacoes" element={<MinhasRedacoesList />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/alunos" element={<AdminAlunos />} />
            <Route path="/admin/creditos" element={<AdminCreditos />} />
            <Route path="/admin/redacoes" element={<Redacoes />} />
            <Route path="/admin/temas" element={<AdminTemas />} />
            <Route path="/admin/aulas" element={<AdminAulas />} />
            <Route path="/admin/radar" element={<AdminRadar />} />
            <Route path="/admin/biblioteca" element={<AdminBiblioteca />} />
            <Route path="/admin/videos" element={<AdminVideos />} />
            <Route path="/admin/corretores" element={<AdminCorretores />} />
            <Route path="/admin/avisos" element={<AdminAvisos />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
