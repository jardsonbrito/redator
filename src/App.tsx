
import React from "react";
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Welcome from "./pages/Welcome";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import Index from "./pages/Index";
import Simulados from "./pages/Simulados";
import Temas from "./pages/Temas";
import Aulas from "./pages/Aulas";
import Videoteca from "./pages/Videoteca";
import Biblioteca from "./pages/Biblioteca";
import RedacoesExemplar from "./pages/RedacoesExemplar";
import Top5 from "./pages/Top5";
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
                {/* Rotas Públicas */}
                <Route path="/" element={<Welcome />} />
                <Route path="/login" element={<Login />} />

                <Route path="/app" element={<Index />} />
                <Route path="/temas" element={<Temas />} />
                <Route path="/simulados" element={<Simulados />} />
                <Route path="/aulas" element={<Aulas />} />
                <Route path="/videoteca" element={<Videoteca />} />
                <Route path="/biblioteca" element={<Biblioteca />} />
                <Route path="/redacoes" element={<RedacoesExemplar />} />
                <Route path="/top5" element={<Top5 />} />

                {/* Rotas do Admin */}
                <Route path="/admin" element={<Admin />} />
                <Route path="/admin/dashboard" element={<Dashboard />} />
                <Route path="/admin/avisos" element={<Avisos />} />
                <Route path="/admin/redacoes" element={<Redacoes />} />
                <Route path="/admin/simulados" element={<SimuladosAdmin />} />
                <Route path="/admin/exercicios" element={<ExerciciosAdmin />} />
                <Route path="/admin/corretores" element={<CorretoresAdmin />} />
                
                {/* Rotas do Corretor */}
                <Route path="/corretor/login" element={<CorretorLogin />} />
                <Route path="/corretor" element={<CorretorHome />} />
              </Routes>
            </div>
          </Router>
        </AuthProvider>
      </StudentAuthProvider>
    </CorretorAuthProvider>
  );
}

export default App;
