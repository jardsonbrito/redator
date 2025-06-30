
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, FileText, Video, Settings, Send, GraduationCap, ClipboardList, ClipboardCheck, Home, Award, User } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MinhasRedacoes } from "@/components/MinhasRedacoes";

const Index = () => {
  const { isAdmin, user } = useAuth();
  
  // Recupera dados do usuário (aluno ou visitante)
  const userType = localStorage.getItem("userType");
  const alunoTurma = localStorage.getItem("alunoTurma");
  const visitanteData = localStorage.getItem("visitanteData");
  
  // Determina a turma/código do usuário
  let turmaCode = "visitante";
  if (userType === "aluno" && alunoTurma) {
    const turmasMap = {
      "Turma A": "LRA2025",
      "Turma B": "LRB2025", 
      "Turma C": "LRC2025",
      "Turma D": "LRD2025",
      "Turma E": "LRE2025"
    };
    turmaCode = turmasMap[alunoTurma as keyof typeof turmasMap] || "visitante";
  }

  // Verifica se há aulas disponíveis
  const { data: hasAulas } = useQuery({
    queryKey: ['has-aulas', turmaCode],
    queryFn: async () => {
      if (!turmaCode) return false;
      
      const { data, error } = await supabase
        .from('aulas')
        .select('id')
        .eq('ativo', true)
        .or(`turmas.cs.{${turmaCode}},turmas.is.null`)
        .limit(1);
      
      if (error) {
        console.error('Error checking aulas:', error);
        return false;
      }
      
      return data && data.length > 0;
    },
    enabled: !!turmaCode
  });

  // Verifica se há exercícios disponíveis
  const { data: hasExercicios } = useQuery({
    queryKey: ['has-exercicios', turmaCode],
    queryFn: async () => {
      if (!turmaCode) return false;
      
      const { data, error } = await supabase
        .from('exercicios')
        .select('id')
        .eq('ativo', true)
        .or(`turmas.cs.{${turmaCode}},turmas.is.null`)
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
        .or(`turmas_autorizadas.cs.{${turmaCode}},turmas_autorizadas.cs.{visitante}`)
        .limit(1);
      
      if (error) {
        console.error('Error checking simulados:', error);
        return false;
      }
      
      return data && data.length > 0;
    }
  });

  // Verifica se há redações corrigidas para "Meus Simulados"
  const { data: hasRedacoesCorrigidas } = useQuery({
    queryKey: ['has-redacoes-corrigidas', turmaCode],
    queryFn: async () => {
      let query = supabase
        .from('redacoes_simulado')
        .select('id')
        .eq('corrigida', true)
        .limit(1);

      if (turmaCode !== "visitante") {
        query = query.eq('turma', turmaCode);
      } else {
        query = query.eq('turma', 'visitante');
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error checking redacoes corrigidas:', error);
        return false;
      }
      
      return data && data.length > 0;
    }
  });

  // Verifica se há redações da turma (para "Minhas Redações")
  const { data: hasRedacoesTurma } = useQuery({
    queryKey: ['has-redacoes-turma', turmaCode],
    queryFn: async () => {
      if (!turmaCode || turmaCode === "visitante") return false;
      
      const { data, error } = await supabase
        .rpc('get_redacoes_by_turma', { p_turma: turmaCode });
      
      if (error) {
        console.error('Error checking redacoes turma:', error);
        return false;
      }
      
      return data && data.length > 0;
    },
    enabled: !!turmaCode && turmaCode !== "visitante"
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
      title: "Meus Simulados",
      path: "/meus-simulados",
      icon: Award,
      tooltip: "Veja suas redações de simulados corrigidas e pontuadas.",
      showAlways: false,
      showCondition: hasRedacoesCorrigidas
    },
    {
      title: "Enviar Redação",
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

  // Nome de exibição do usuário
  let nomeUsuario = "Usuário";
  if (userType === "visitante" && visitanteData) {
    const dados = JSON.parse(visitanteData);
    nomeUsuario = dados.nome;
  } else if (userType === "aluno" && alunoTurma) {
    nomeUsuario = `Aluno da ${alunoTurma}`;
  }

  // Determinar se deve mostrar seção "Minhas Redações"
  const showMinhasRedacoes = userType === "aluno" && alunoTurma && hasRedacoesTurma;

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-redator-accent/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <Link to="/" className="flex items-center gap-2 text-redator-primary hover:text-redator-accent transition-colors">
                <Home className="w-5 h-5" />
                <span className="hidden sm:inline">Voltar ao início</span>
              </Link>
              
              {user && isAdmin ? (
                <Link to="/admin" className="flex items-center gap-2 bg-redator-primary text-white px-4 py-2 rounded-md hover:bg-redator-primary/90 transition-colors">
                  <Settings className="w-5 h-5" />
                  <span className="hidden sm:inline">Painel Admin</span>
                  <span className="sm:hidden">Professor</span>
                </Link>
              ) : (
                <Link to="/login" className="flex items-center gap-2 text-redator-primary hover:text-redator-accent transition-colors">
                  <Settings className="w-5 h-5" />
                  <span>Professor</span>
                </Link>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Logo e Saudação Centralizada */}
          <div className="text-center mb-16">
            <div className="flex justify-center mb-8">
              <img src="/lovable-uploads/d073fb44-8fd6-46e0-9ca1-f74baca3bb5b.png" alt="App do Redator" className="h-24 w-auto" />
            </div>
            
            <h1 className="text-3xl font-bold text-redator-primary mb-6 leading-relaxed">
              Bem-vindo ao App do Redator
            </h1>
            
            {userType && (
              <p className="text-lg text-redator-accent font-medium mb-4">
                Olá, {nomeUsuario}!
              </p>
            )}
            
            <p className="text-xl text-redator-accent font-medium mb-12">Redação na prática, aprovação na certa!</p>
            
            {!showMinhasRedacoes && (
              <h2 className="text-2xl font-semibold text-redator-primary mb-12">
                Escolha por onde começar:
              </h2>
            )}
          </div>

          {/* Seção "Minhas Redações" - apenas para alunos de turma com redações */}
          {showMinhasRedacoes && (
            <div className="mb-16">
              <MinhasRedacoes />
            </div>
          )}

          {/* Menu Principal Horizontal */}
          <div className="space-y-8">
            {showMinhasRedacoes && (
              <h2 className="text-2xl font-semibold text-redator-primary text-center">
                Explorar outras seções:
              </h2>
            )}
            
            <div className={`grid grid-cols-2 md:grid-cols-3 gap-6 max-w-5xl mx-auto ${
              visibleMenuItems.length <= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-6'
            }`}>
              {visibleMenuItems.map((item, index) => (
                <Tooltip key={index}>
                  <TooltipTrigger asChild>
                    <Link to={item.path} className="group flex flex-col items-center p-6 bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105 border border-redator-accent/10 hover:border-redator-secondary/30">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-redator-primary group-hover:bg-redator-secondary transition-colors duration-300 mb-4">
                        <item.icon className="w-8 h-8 text-white" />
                      </div>
                      
                      <h3 className="text-sm font-semibold text-redator-primary text-center leading-tight group-hover:text-redator-secondary transition-colors">
                        {item.title}
                      </h3>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs text-center p-3 bg-redator-primary text-white border-redator-primary">
                    <p className="text-sm">{item.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
};

export default Index;
