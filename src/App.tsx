import React from "react";
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Welcome from "./pages/Welcome";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import Student from "./pages/Student";
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
      <Router>
        <div className="min-h-screen bg-background">
          <Toaster />
          <Routes>
            {/* Rotas Públicas */}
            <Route path="/" element={<Welcome />} />
            <Route path="/login" element={<Login />} />

            <Route path="/app" element={<StudentAuthProvider><Student /></StudentAuthProvider>} />
            <Route path="/temas" element={<StudentAuthProvider><Temas /></StudentAuthProvider>} />
            <Route path="/simulados" element={<StudentAuthProvider><Simulados /></StudentAuthProvider>} />
            <Route path="/aulas" element={<StudentAuthProvider><Aulas /></StudentAuthProvider>} />
            <Route path="/videoteca" element={<StudentAuthProvider><Videoteca /></StudentAuthProvider>} />
            <Route path="/biblioteca" element={<StudentAuthProvider><Biblioteca /></StudentAuthProvider>} />
            <Route path="/redacoes" element={<StudentAuthProvider><RedacoesExemplar /></StudentAuthProvider>} />
            <Route path="/top5" element={<StudentAuthProvider><Top5 /></StudentAuthProvider>} />

            {/* Rotas do Admin */}
            <Route path="/admin" element={<AuthProvider><Admin /></AuthProvider>} />
            <Route path="/admin/dashboard" element={<AuthProvider><Dashboard /></AuthProvider>} />
            <Route path="/admin/avisos" element={<AuthProvider><Avisos /></AuthProvider>} />
            <Route path="/admin/redacoes" element={<AuthProvider><Redacoes /></AuthProvider>} />
            <Route path="/admin/simulados" element={<AuthProvider><SimuladosAdmin /></AuthProvider>} />
            <Route path="/admin/exercicios" element={<AuthProvider><ExerciciosAdmin /></AuthProvider>} />
            <Route path="/admin/corretores" element={<AuthProvider><CorretoresAdmin /></AuthProvider>} />
            
            {/* Rotas do Corretor */}
            <Route path="/corretor/login" element={<CorretorLogin />} />
            <Route path="/corretor" element={<CorretorHome />} />
          </Routes>
        </div>
      </Router>
    </CorretorAuthProvider>
  );
}

export default App;
