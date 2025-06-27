
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, FileText, Video, ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const Welcome = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20"></div>
      <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23ffffff\" fill-opacity=\"0.05\"%3E%3Ccircle cx=\"30\" cy=\"30\" r=\"4\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Hero Section */}
          <div className="mb-12">
            <div className="flex items-center justify-center mb-6">
              <div className="p-3 bg-white/10 rounded-full backdrop-blur-sm">
                <BookOpen className="w-12 h-12 text-white" />
              </div>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">
              App do
              <span className="block bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                Redator
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-200 mb-8 max-w-3xl mx-auto leading-relaxed">
              Transforme sua escrita com nossa plataforma completa de aprendizado. 
              Acesse redações nota 1000, explore temas atuais e assista conteúdos exclusivos.
            </p>
          </div>

          {/* Features Preview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all duration-300">
              <CardContent className="p-6 text-center">
                <FileText className="w-8 h-8 text-blue-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Redações Exemplares</h3>
                <p className="text-gray-300 text-sm">Aprenda com redações nota 1000</p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all duration-300">
              <CardContent className="p-6 text-center">
                <BookOpen className="w-8 h-8 text-green-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Temas Atuais</h3>
                <p className="text-gray-300 text-sm">Explore propostas organizadas</p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all duration-300">
              <CardContent className="p-6 text-center">
                <Video className="w-8 h-8 text-purple-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Videoteca</h3>
                <p className="text-gray-300 text-sm">Conteúdos em vídeo exclusivos</p>
              </CardContent>
            </Card>
          </div>

          {/* CTA */}
          <div className="space-y-6">
            <Link to="/home">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 text-lg font-semibold rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Começar Agora
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            
            <p className="text-gray-400 text-sm">
              Gratuito para começar • Sem necessidade de cadastro
            </p>
          </div>

          {/* Footer */}
          <div className="mt-16 pt-8 border-t border-white/10">
            <p className="text-gray-500 text-sm">
              © 2024 App do Redator - Sua jornada para a escrita perfeita
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
