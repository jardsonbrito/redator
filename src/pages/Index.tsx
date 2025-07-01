
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, FileText, Video, GraduationCap, ClipboardList, ClipboardCheck, Send, File } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MinhasRedacoes } from "@/components/MinhasRedacoes";
import { SimuladoAtivo } from "@/components/SimuladoAtivo";
import { MeusSimuladosFixo } from "@/components/MeusSimuladosFixo";
import { StudentHeader } from "@/components/StudentHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const Index = () => {
  const { isAdmin, user } = useAuth();
  const { studentData } = useStudentAuth();
  
  // Determina a turma/código do usuário
  let turmaCode = "Visitante";
  if (studentData.userType === "aluno" && studentData.turma) {
    turmaCode = studentData.turma; // Usar o nome real da turma (ex: "Turma A")
  }

  // Verifica se há aulas disponíveis - corrigir a lógica
  const { data: hasAulas } = useQuery({
    queryKey: ['has-aulas', turmaCode],
    queryFn: async () => {
      console.log("Checking aulas for turma:", turmaCode);
      
      // Se for visitante, verificar aulas que permitem visitante
      if (turmaCode === "Visitante") {
        const { data, error } = await supabase
          .from('aulas')
          .select('id')
          .eq('ativo', true)
          .eq('permite_visitante', true)
          .limit(1);
        
        if (error) {
          console.error('Error checking aulas for visitante:', error);
          return false;
        }
        
        console.log("Aulas found for visitante:", data);
        return data && data.length > 0;
      }
      
      // Se for aluno, verificar aulas da sua turma
      const { data, error } = await supabase
        .from('aulas')
        .select('id')
        .eq('ativo', true)
        .or(`turmas.cs.{${turmaCode}},permite_visitante.eq.true`)
        .limit(1);
      
      if (error) {
        console.error('Error checking aulas for turma:', error);
        return false;
      }
      
      console.log("Aulas found for turma:", turmaCode, data);
      return data && data.length > 0;
    },
    enabled: !!turmaCode
  });

  // Verifica se há exercícios disponíveis
  const { data: hasExercicios } = useQuery({
    queryKey: ['has-exercicios', turmaCode],
    queryFn: async () => {
      if (!turmaCode) return false;
      
      // Se for visitante, verificar exercícios que permitem visitante
      if (turmaCode === "Visitante") {
        const { data, error } = await supabase
          .from('exercicios')
          .select('id')
          .eq('ativo', true)
          .eq('permite_visitante', true)
          .limit(1);
        
        if (error) {
          console.error('Error checking exercicios for visitante:', error);
          return false;
        }
        
        return data && data.length > 0;
      }
      
      const { data, error } = await supabase
        .from('exercicios')
        .select('id')
        .eq('ativo', true)
        .or(`turmas.cs.{${turmaCode}},permite_visitante.eq.true`)
        .limit(1);
      
      if (error) {
        console.error('Error checking exercicios:', error);
        return false;
      }
      
      return data && data.length > 0;
    },
    enabled: !!turmaCode
  });

  // Verifica se há simulados disponíveis
  const { data: hasSimulados } = useQuery({
    queryKey: ['has-simulados', turmaCode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('simulados')
        .select('id')
        .eq('ativo', true)
        .or(`turmas_autorizadas.cs.{${turmaCode}},permite_visitante.eq.true`)
        .limit(1);
      
      if (error) {
        console.error('Error checking simulados:', error);
        return false;
      }
      
      return data && data.length > 0;
    }
  });

  // Verifica se há redações da turma (para "Minhas Redações")
  const { data: hasRedacoesTurma } = useQuery({
    queryKey: ['has-redacoes-turma', turmaCode],
    queryFn: async () => {
      if (!turmaCode || turmaCode === "Visitante") return false;
      
      const { data, error } = await supabase
        .rpc('get_redacoes_by_turma', { p_turma: turmaCode });
      
      if (error) {
        console.error('Error checking redacoes turma:', error);
        return false;
      }
      
      return data && data.length > 0;
    },
    enabled: !!turmaCode && turmaCode !== "Visitante"
  });

  // Verifica se há materiais da biblioteca disponíveis
  const { data: hasBiblioteca } = useQuery({
    queryKey: ['has-biblioteca', turmaCode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('biblioteca_materiais')
        .select('id')
        .eq('status', 'publicado')
        .or(`turmas_autorizadas.cs.{${turmaCode}},permite_visitante.eq.true`)
        .limit(1);
      
      if (error) {
        console.error('Error checking biblioteca:', error);
        return false;
      }
      
      return data && data.length > 0;
    }
  });

  const menuItems = [
    {
      title: "Temas",
      path: "/temas",
      icon: BookOpen,
      tooltip: "Explore propostas de redação organizadas por eixo temático.",
      showAlways: true
    },
    {
      title: "Redações Exemplares",
      path: "/redacoes",
      icon: FileText,
      tooltip: "Veja textos nota 1000 e aprenda estratégias eficazes.",
      showAlways: true
    },
    {
      title: "Videoteca",
      path: "/videoteca",
      icon: Video,
      tooltip: "Acesse vídeos para enriquecer seu repertório sociocultural.",
      showAlways: true
    },
    {
      title: "Biblioteca",
      path: "/biblioteca",
      icon: File,
      tooltip: "Acesse materiais em PDF organizados por competência.",
      showAlways: false,
      showCondition: hasBiblioteca
    },
    {
      title: "Aulas",
      path: "/aulas",
      icon: GraduationCap,
      tooltip: "Estude cada competência com aulas gravadas e ao vivo.",
      showAlways: false,
      showCondition: hasAulas
    },
    {
      title: "Exercícios",
      path: "/exercicios",
      icon: ClipboardList,
      tooltip: "Pratique com formulários e atividades direcionadas.",
      showAlways: false,
      showCondition: hasExercicios
    },
    {
      title: "Simulados",
      path: "/simulados",
      icon: ClipboardCheck,
      tooltip: "Participe de simulados com horário controlado e correção detalhada.",
      showAlways: false,
      showCondition: hasSimulados
    },
    {
      title: "Enviar Redação (Avulsa)",
      path: "/envie-redacao",
      icon: Send,
      tooltip: "Submeta seu texto para correção detalhada.",
      showAlways: true
    }
  ];

  // Filtra os itens do menu baseado na disponibilidade de conteúdo
  const visibleMenuItems = menuItems.filter(item => {
    if (item.showAlways) return true;
    return item.showCondition === true;
  });

  // Determinar se deve mostrar seção "Minhas Redações"
  const showMinhasRedacoes = studentData.userType === "aluno" && studentData.turma && hasRedacoesTurma;

  console.log("Debug info:", {
    turmaCode,
    hasAulas,
    hasExercicios,
    hasSimulados,
    visibleMenuItems: visibleMenuItems.map(item => item.title)
  });

  return (
    <ProtectedRoute>
      <TooltipProvider>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
          {/* Header com botão Sair */}
          <StudentHeader />

          {/* Main Content */}
          <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            {/* Logo e Saudação Centralizada */}
            <div className="text-center mb-12">
              <div className="flex justify-center mb-6">
                <img src="/lovable-uploads/d073fb44-8fd6-46e0-9ca1-f74baca3bb5b.png" alt="App do Redator" className="h-20 w-auto" />
              </div>
              
              <h1 className="text-3xl font-bold text-redator-primary mb-4 leading-relaxed">
                Bem-vindo ao App do Redator
              </h1>
              
              {studentData.userType && (
                <p className="text-lg text-redator-accent font-medium mb-2">
                  Olá, {studentData.nomeUsuario}!
                </p>
              )}
              
              <p className="text-xl text-redator-accent font-medium mb-8">Redação na prática, aprovação na certa!</p>
            </div>

            {/* Simulado Ativo - SEMPRE em destaque no topo */}
            <SimuladoAtivo turmaCode={turmaCode} />

            {/* Seção "Minhas Redações" - apenas para alunos de turma com redações */}
            {showMinhasRedacoes && (
              <div className="mb-8">
                <MinhasRedacoes />
              </div>
            )}

            {/* Card "Meus Simulados" - SEMPRE FIXO E VISÍVEL */}
            <MeusSimuladosFixo turmaCode={turmaCode} />

            {/* Menu Principal Horizontal */}
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-redator-primary text-center">
                {showMinhasRedacoes ? "Explorar outras seções:" : "Escolha por onde começar:"}
              </h2>
              
              <div className={`grid grid-cols-2 md:grid-cols-3 gap-4 max-w-5xl mx-auto ${
                visibleMenuItems.length <= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-6'
              }`}>
                {visibleMenuItems.map((item, index) => (
                  <Tooltip key={index}>
                    <TooltipTrigger asChild>
                      <Link to={item.path} className="group flex flex-col items-center p-4 bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105 border border-redator-accent/10 hover:border-redator-secondary/30">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-redator-primary group-hover:bg-redator-secondary transition-colors duration-300 mb-3">
                          <item.icon className="w-6 h-6 text-white" />
                        </div>
                        
                        <h3 className="text-xs font-semibold text-redator-primary text-center leading-tight group-hover:text-redator-secondary transition-colors">
                          {item.title}
                        </h3>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs text-center p-2 bg-redator-primary text-white border-redator-primary">
                      <p className="text-xs">{item.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>
          </main>
        </div>
      </TooltipProvider>
    </ProtectedRoute>
  );
};

export default Index;
