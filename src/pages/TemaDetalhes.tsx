
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home, Edit } from "lucide-react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getTemaCoverUrl, getTemaMotivatorIVUrl } from '@/utils/temaImageUtils';
import { useAppSettings } from "@/hooks/useAppSettings";
import { renderTextWithParagraphs } from '@/utils/textUtils';

// Type extension para incluir os campos novos e legado
type TemaWithImage = {
  id: string;
  frase_tematica: string;
  eixo_tematico: string;
  texto_1: string | null;
  texto_2: string | null;
  texto_3: string | null;
  // New cover fields
  cover_source?: string | null;
  cover_url?: string | null;
  cover_file_path?: string | null;
  // New motivator IV fields
  motivator4_source?: string | null;
  motivator4_url?: string | null;
  motivator4_file_path?: string | null;
  // Legacy field
  imagem_texto_4_url: string | null;
  publicado_em: string | null;
};

const TemaDetalhes = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { studentData } = useStudentAuth();
  const { checkIfTodayAllowsTopicSubmissions, getDaysAllowedText, settings } = useAppSettings();
  
  // Permitir acesso tanto para alunos quanto visitantes
  const canWriteRedacao = studentData.userType === "aluno" || studentData.userType === "visitante";
  
  // Verificar se hoje é permitido envio por tema
  const todayAllowsSubmission = checkIfTodayAllowsTopicSubmissions();
  const daysAllowedText = getDaysAllowedText();
  
  const handleEscreverRedacao = () => {
    if (tema && todayAllowsSubmission) {
      // Redirecionar para página de envio com parâmetros
      navigate(`/envie-redacao?tema=${encodeURIComponent(tema.frase_tematica)}&fonte=tema&temaId=${id}`);
    }
  };
  
  const { data: tema, isLoading, error } = useQuery({
    queryKey: ['tema', id],
    queryFn: async () => {
      console.log('Fetching tema details for id:', id);
      const { data, error } = await supabase
        .from('temas')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Error fetching tema:', error);
        throw error;
      }
      
      console.log('Tema details fetched:', data);
      return data as TemaWithImage;
    },
    enabled: !!id
  });

  // Query para verificar se o usuário já enviou uma redação sobre este tema
  const { data: redacaoEnviada } = useQuery({
    queryKey: ['redacao-enviada', tema?.frase_tematica, studentData.email],
    queryFn: async () => {
      if (!tema?.frase_tematica || !studentData.email) return null;
      
      const { data, error } = await supabase
        .from('redacoes_enviadas')
        .select('id, data_envio')
        .eq('frase_tematica', tema.frase_tematica)
        .eq('email_aluno', studentData.email)
        .order('data_envio', { ascending: false })
        .limit(1);
      
      if (error) {
        console.error('Error checking for existing redacao:', error);
        return null;
      }
      
      return data && data.length > 0 ? data[0] : null;
    },
    enabled: !!tema?.frase_tematica && !!studentData.email
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center">
        <div>Carregando tema...</div>
      </div>
    );
  }

  if (error || !tema) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-redator-primary mb-2">Tema não encontrado</h2>
          <p className="text-redator-accent mb-4">O tema solicitado não foi encontrado.</p>
          <Link to="/temas" className="text-redator-accent hover:text-redator-primary">
            Voltar para temas
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <TooltipProvider>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
          {/* Header */}
          <header className="bg-white shadow-sm border-b border-redator-accent/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/app" className="flex items-center gap-2 text-redator-accent hover:text-redator-primary transition-colors">
                <Home className="w-5 h-5" />
                <span>Início</span>
              </Link>
              <div>
                {tema.eixo_tematico && (
                  <span className="text-sm font-medium text-white bg-redator-accent px-2 py-1 rounded">
                    {tema.eixo_tematico}
                  </span>
                )}
              </div>
            </div>
            <Link to="/" className="hover:opacity-80 transition-opacity">
              <img src="/lovable-uploads/e8f3c7a9-a9bb-43ac-ba3d-e625d15834d8.png" alt="App do Redator - Voltar para Home" className="h-8 w-auto max-w-[120px] object-contain" />
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="border-redator-accent/20">
          <CardContent className="p-8">
            {/* 1. Frase Temática */}
            <div className="flex flex-col gap-4 mb-8">
              <h1 className="text-2xl font-bold text-redator-primary leading-tight">
                {tema.frase_tematica}
              </h1>
              {redacaoEnviada && (
                <div className="flex items-center gap-2">
                  <span className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full border border-green-200">
                    ✓ Já enviado
                  </span>
                  <span className="text-sm text-gray-600">
                    Enviado em {new Date(redacaoEnviada.data_envio).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-6">
              {/* 2. Cover Image */}
              <div className="rounded-lg overflow-hidden mb-6">
                <img 
                  src={getTemaCoverUrl(tema)} 
                  alt={`Capa do tema: ${tema.frase_tematica}`}
                  className="w-full h-auto"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/lovable-uploads/66db3418-766f-47b9-836b-07a6a228a79c.png';
                  }}
                />
              </div>

              {/* 3. Cabeçalho padrão */}
              <div className="bg-redator-primary/5 rounded-lg p-6 border-l-4 border-redator-primary">
                <p className="text-redator-primary leading-relaxed font-medium">
                  A partir da leitura dos textos motivadores e com base nos conhecimentos construídos ao longo de sua formação, 
                  redija texto dissertativo-argumentativo em modalidade escrita formal da língua portuguesa sobre o tema "{tema.frase_tematica}", 
                  apresentando proposta de intervenção que respeite os direitos humanos. Selecione, organize e relacione, 
                  de forma coerente e coesa, argumentos e fatos para defesa de seu ponto de vista.
                </p>
              </div>

              {/* 4. Texto Motivador 1 */}
              {tema.texto_1 && (
                <div className="bg-white rounded-lg p-6 border border-redator-accent/20">
                  <h3 className="font-semibold text-redator-primary mb-3">Texto Motivador I</h3>
                  <div className="text-redator-accent leading-relaxed">
                    {renderTextWithParagraphs(tema.texto_1)}
                  </div>
                </div>
              )}

              {/* 5. Texto Motivador 2 */}
              {tema.texto_2 && (
                <div className="bg-white rounded-lg p-6 border border-redator-accent/20">
                  <h3 className="font-semibold text-redator-primary mb-3">Texto Motivador II</h3>
                  <div className="text-redator-accent leading-relaxed">
                    {renderTextWithParagraphs(tema.texto_2)}
                  </div>
                </div>
              )}

              {/* 6. Texto Motivador 3 */}
              {tema.texto_3 && (
                <div className="bg-white rounded-lg p-6 border border-redator-accent/20">
                  <h3 className="font-semibold text-redator-primary mb-3">Texto Motivador III</h3>
                  <div className="text-redator-accent leading-relaxed">
                    {renderTextWithParagraphs(tema.texto_3)}
                  </div>
                </div>
              )}

              {/* 7. Texto Motivador IV (Image) */}
              {getTemaMotivatorIVUrl({
                motivator4_source: tema.motivator4_source,
                motivator4_url: tema.motivator4_url,
                motivator4_file_path: tema.motivator4_file_path,
                imagem_texto_4_url: tema.imagem_texto_4_url
              }) && (
                <div className="bg-white rounded-lg p-6 border border-redator-accent/20">
                  <h3 className="font-semibold text-redator-primary mb-3">Texto Motivador IV</h3>
                  <div className="rounded-lg overflow-hidden">
                    <img 
                      src={getTemaMotivatorIVUrl({
                        motivator4_source: tema.motivator4_source,
                        motivator4_url: tema.motivator4_url,
                        motivator4_file_path: tema.motivator4_file_path,
                        imagem_texto_4_url: tema.imagem_texto_4_url
                      })!}
                      alt="Charge/Infográfico — Texto Motivador IV"
                      className="w-full h-auto"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              )}
              
              {/* Botão para escrever redação - para alunos e visitantes */}
              {canWriteRedacao && (
                <div className="bg-redator-primary/5 rounded-lg p-6 border border-redator-primary/20 text-center">
                  <h3 className="font-semibold text-redator-primary mb-3">
                    Gostou do tema? Pratique agora mesmo!
                  </h3>
                  <p className="text-redator-accent mb-4 text-sm">
                    Escreva uma redação sobre este tema e receba correção personalizada.
                  </p>
                  <Button
                    onClick={handleEscreverRedacao}
                    disabled={!todayAllowsSubmission}
                    className={`px-6 py-3 ${
                      todayAllowsSubmission 
                        ? 'bg-redator-primary hover:bg-redator-primary/90 text-white' 
                        : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    }`}
                    size="lg"
                  >
                    <Edit className="w-5 h-5 mr-2" />
                    ✍️ Escreva sobre este tema
                  </Button>
                  
                  {!todayAllowsSubmission && (
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      Envios por tema não estão liberados hoje. Dias permitidos: {daysAllowedText}
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
          </Card>
        </main>
        </div>
      </TooltipProvider>
    </ProtectedRoute>
  );
};

export default TemaDetalhes;
