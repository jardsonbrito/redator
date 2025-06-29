
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, FileText, Video, Settings, Send, GraduationCap, ClipboardList } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { isAdmin, user } = useAuth();

  const menuItems = [
    {
      title: "Temas",
      description: "Explore propostas de redação organizadas por eixo temático",
      icon: BookOpen,
      path: "/temas",
      color: "bg-redator-accent",
      hoverColor: "hover:bg-redator-accent"
    },
    {
      title: "Redações Exemplares",
      description: "Acesse redações nota 1000 e aprenda com os melhores exemplos",
      icon: FileText,
      path: "/redacoes",
      color: "bg-redator-primary",
      hoverColor: "hover:bg-redator-primary"
    },
    {
      title: "Videoteca",
      description: "Assista conteúdos sobre escrita e repertório",
      icon: Video,
      path: "/videoteca",
      color: "bg-redator-secondary",
      hoverColor: "hover:bg-redator-secondary"
    },
    {
      title: "Aulas",
      description: "Assista às aulas da plataforma e domine cada competência",
      icon: GraduationCap,
      path: "/aulas",
      color: "bg-green-600",
      hoverColor: "hover:bg-green-600"
    },
    {
      title: "Exercícios",
      description: "Pratique com exercícios direcionados e formulários especializados",
      icon: ClipboardList,
      path: "/exercicios",
      color: "bg-orange-600",
      hoverColor: "hover:bg-orange-600"
    },
    {
      title: "Envie sua Redação",
      description: "Escreva sua redação e receba correção personalizada",
      icon: Send,
      path: "/envie-redacao",
      color: "bg-purple-600",
      hoverColor: "hover:bg-purple-600"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-redator-accent/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <div className="flex items-center justify-center gap-3 mb-6">
                <img src="/lovable-uploads/e8f3c7a9-a9bb-43ac-ba3d-e625d15834d8.png" alt="Redator Logo" className="h-16 w-auto" />
              </div>
              {/* Slogan com destaque visual aprimorado */}
              <div className="max-w-3xl mx-auto">
                <p className="text-2xl font-bold text-redator-accent leading-relaxed tracking-wide px-4">App do Redator</p>
              </div>
            </div>
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-8">
          {menuItems.map((item, index) => (
            <Link key={index} to={item.path} className="group">
              <Card className="h-full transition-all duration-300 hover:shadow-xl hover:scale-105 cursor-pointer border-redator-accent/20 hover:border-redator-secondary/50">
                <CardContent className="p-8 text-center">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${item.color} ${item.hoverColor} transition-colors duration-300 mb-6 group-hover:scale-110`}>
                    <item.icon className="w-8 h-8 text-white" />
                  </div>
                  
                  <h3 className="text-xl font-semibold text-redator-primary mb-3">
                    {item.title}
                  </h3>
                  
                  <p className="text-redator-accent leading-relaxed">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Footer Info */}
        <div className="mt-16 text-center">
          <div className="bg-white rounded-lg shadow-sm p-8 max-w-4xl mx-auto border border-redator-accent/20">
            <h2 className="text-2xl font-semibold text-redator-primary mb-4">
              Como usar o App do Redator
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-6 text-sm text-redator-accent">
              <div>
                <div className="font-medium text-redator-accent mb-2">1. Explore os temas</div>
                <p>Acesse propostas de redação atuais, organizadas por eixo temático, e reflita criticamente sobre os problemas sociais.</p>
              </div>
              <div>
                <div className="font-medium text-redator-primary mb-2">2. Aprenda com redações exemplares</div>
                <p>Estude textos com alto potencial de nota 1000 e compreenda estratégias eficazes de escrita argumentativa.</p>
              </div>
              <div>
                <div className="font-medium text-redator-secondary mb-2">3. Aprofunde seu repertório</div>
                <p>Assista aos vídeos da Videoteca e amplie seus conhecimentos socioculturais para enriquecer seus argumentos.</p>
              </div>
              <div>
                <div className="font-medium text-green-600 mb-2">4. Assista às aulas</div>
                <p>Domine cada competência através das aulas organizadas e participe das aulas ao vivo com o professor.</p>
              </div>
              <div>
                <div className="font-medium text-orange-600 mb-2">5. Pratique exercícios</div>
                <p>Resolva exercícios direcionados e pratique com formulários especializados para aprimorar suas habilidades.</p>
              </div>
              <div>
                <div className="font-medium text-purple-600 mb-2">6. Pratique e envie sua redação</div>
                <p>Escreva sua proposta e receba uma correção pedagógica detalhada com nota por competência.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
