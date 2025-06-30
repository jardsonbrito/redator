
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Home, ArrowLeft, ExternalLink, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

const AulaAoVivo = () => {
  const { data: aulaAoVivo, isLoading } = useQuery({
    queryKey: ['aula-ao-vivo'],
    queryFn: async () => {
      // Buscar o módulo "Aula ao vivo"
      const { data: module, error: moduleError } = await supabase
        .from('aula_modules')
        .select('*')
        .eq('tipo', 'ao_vivo')
        .single();
      
      if (moduleError) throw moduleError;

      // Buscar aulas ativas deste módulo
      const { data: aulas, error: aulasError } = await supabase
        .from('aulas')
        .select('*')
        .eq('module_id', module.id)
        .eq('ativo', true)
        .order('created_at', { ascending: false });
      
      if (aulasError) throw aulasError;

      return { module, aulas };
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center">
        <div className="text-center">
          <ExternalLink className="w-12 h-12 text-redator-secondary mx-auto mb-4 animate-pulse" />
          <p className="text-redator-accent">Carregando aula ao vivo...</p>
        </div>
      </div>
    );
  }

  const activeAula = aulaAoVivo?.aulas?.find(aula => aula.google_meet_url);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-redator-accent/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2 text-redator-primary hover:text-redator-accent transition-colors">
                <Home className="w-5 h-5" />
                <span className="hidden sm:inline">Início</span>
              </Link>
              <Link to="/aulas" className="flex items-center gap-2 text-redator-primary hover:text-redator-accent transition-colors">
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Voltar às Aulas</span>
              </Link>
              <div className="hidden sm:block w-px h-6 bg-redator-accent/20"></div>
              <h1 className="text-xl sm:text-2xl font-bold text-redator-primary flex items-center gap-2">
                <ExternalLink className="w-6 h-6 text-redator-secondary" />
                Aula ao Vivo
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-redator-primary mb-2">
            Sala de Aula Virtual
          </h2>
          <p className="text-redator-accent">
            Participe das aulas ao vivo com o professor
          </p>
        </div>

        {activeAula ? (
          <Card className="border-redator-secondary/30 bg-purple-50">
            <CardContent className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-redator-secondary mb-6">
                <ExternalLink className="w-10 h-10 text-white" />
              </div>
              
              <h3 className="text-2xl font-bold text-redator-primary mb-4">
                {activeAula.titulo}
              </h3>
              
              {activeAula.descricao && (
                <p className="text-redator-accent mb-6 text-lg">
                  {activeAula.descricao}
                </p>
              )}

              <div className="flex items-center justify-center gap-6 mb-8 text-sm text-redator-accent">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Aula programada</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Disponível agora</span>
                </div>
              </div>

              <Button 
                asChild 
                size="lg"
                className="bg-redator-secondary hover:bg-redator-secondary/90 text-white px-8 py-4 text-lg"
              >
                <a href={activeAula.google_meet_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-5 h-5 mr-3" />
                  Entrar na Aula ao Vivo
                </a>
              </Button>

              <p className="text-xs text-redator-accent/70 mt-4">
                * O link será aberto em uma nova aba do seu navegador
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-redator-accent/20">
            <CardContent className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-6">
                <ExternalLink className="w-10 h-10 text-gray-400" />
              </div>
              
              <h3 className="text-2xl font-bold text-redator-primary mb-4">
                Nenhuma Aula ao Vivo Disponível
              </h3>
              
              <p className="text-redator-accent mb-8 text-lg">
                No momento não há aulas ao vivo programadas. Volte em breve ou acesse as aulas gravadas.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/aulas">
                  <Button variant="outline" size="lg" className="border-redator-accent text-redator-primary hover:bg-redator-accent/10">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Ver Aulas Gravadas
                  </Button>
                </Link>
                <Link to="/">
                  <Button size="lg" className="bg-redator-primary hover:bg-redator-primary/90">
                    <Home className="w-4 h-4 mr-2" />
                    Voltar ao Início
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default AulaAoVivo;
