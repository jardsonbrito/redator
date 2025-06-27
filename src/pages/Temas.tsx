
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const Temas = () => {
  // Mock data - será substituído pelos dados do Supabase
  const temas = [
    {
      id: 1,
      frase_tematica: "Os desafios da mobilidade urbana nas grandes cidades brasileiras",
      eixo: "Urbanização e Transporte",
      thumbnail_url: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=300&h=200&fit=crop"
    },
    {
      id: 2,
      frase_tematica: "A democratização do acesso à cultura no Brasil",
      eixo: "Cultura e Sociedade",
      thumbnail_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=200&fit=crop"
    },
    {
      id: 3,
      frase_tematica: "O impacto da inteligência artificial no mercado de trabalho",
      eixo: "Tecnologia e Trabalho",
      thumbnail_url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=300&h=200&fit=crop"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 text-green-600 hover:text-green-700 transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span>Voltar</span>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Temas</h1>
              <p className="text-gray-600">Propostas de redação organizadas por eixo temático</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {temas.map((tema) => (
            <Link key={tema.id} to={`/temas/${tema.id}`} className="group">
              <Card className="h-full transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer">
                <div className="aspect-video overflow-hidden rounded-t-lg">
                  <img 
                    src={tema.thumbnail_url} 
                    alt={tema.frase_tematica}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <CardContent className="p-4">
                  <div className="mb-2">
                    <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">
                      {tema.eixo}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-green-600 transition-colors">
                    {tema.frase_tematica}
                  </h3>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Temas;
