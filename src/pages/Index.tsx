
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, FileText, Video, Settings, PenTool } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { isAdmin, user } = useAuth();

  const menuItems = [
    {
      title: "Redações Exemplares",
      description: "Acesse redações nota 1000 e aprenda com os melhores exemplos",
      icon: FileText,
      path: "/redacoes",
      color: "bg-blue-500",
      hoverColor: "hover:bg-blue-600"
    },
    {
      title: "Temas",
      description: "Explore propostas de redação organizadas por eixo temático",
      icon: BookOpen,
      path: "/temas",
      color: "bg-green-500",
      hoverColor: "hover:bg-green-600"
    },
    {
      title: "Videoteca",
      description: "Assista conteúdos sobre escrita e repertório",
      icon: Video,
      path: "/videoteca",
      color: "bg-purple-500",
      hoverColor: "hover:bg-purple-600"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="bg-blue-600 p-3 rounded-full">
                  <PenTool className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-4xl font-bold text-gray-900">
                  Redator
                </h1>
              </div>
              <p className="text-lg text-gray-600">
                Sua plataforma completa para aprender e praticar redação
              </p>
            </div>
            {user && isAdmin ? (
              <Link to="/admin" className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
                <Settings className="w-5 h-5" />
                <span>Painel Admin</span>
              </Link>
            ) : (
              <Link to="/login" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors">
                <Settings className="w-5 h-5" />
                <span>Admin</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {menuItems.map((item, index) => (
            <Link key={index} to={item.path} className="group">
              <Card className="h-full transition-all duration-300 hover:shadow-xl hover:scale-105 cursor-pointer">
                <CardContent className="p-8 text-center">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${item.color} ${item.hoverColor} transition-colors duration-300 mb-6 group-hover:scale-110`}>
                    <item.icon className="w-8 h-8 text-white" />
                  </div>
                  
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {item.title}
                  </h3>
                  
                  <p className="text-gray-600 leading-relaxed">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Footer Info */}
        <div className="mt-16 text-center">
          <div className="bg-white rounded-lg shadow-sm p-8 max-w-4xl mx-auto">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Como usar o App do Redator
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-600">
              <div>
                <div className="font-medium text-blue-600 mb-2">1. Explore</div>
                <p>Navegue pelos conteúdos organizados por categoria</p>
              </div>
              <div>
                <div className="font-medium text-green-600 mb-2">2. Aprenda</div>
                <p>Estude redações exemplares e propostas de temas</p>
              </div>
              <div>
                <div className="font-medium text-purple-600 mb-2">3. Pratique</div>
                <p>Assista aos vídeos e aplique as técnicas aprendidas</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
