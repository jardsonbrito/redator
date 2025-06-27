
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";

const TemaDetalhes = () => {
  const { id } = useParams();
  
  // Mock data - será substituído pelos dados do Supabase
  const tema = {
    frase_tematica: "Os desafios da mobilidade urbana nas grandes cidades brasileiras",
    eixo: "Urbanização e Transporte",
    texto_motivador_1: "O Brasil possui 38 regiões metropolitanas oficialmente reconhecidas, que concentram cerca de 55% da população do país. Nessas áreas, os problemas de mobilidade urbana se intensificam devido ao crescimento populacional acelerado e à falta de planejamento urbano adequado.",
    texto_motivador_2: "Segundo dados do IBGE, nas principais capitais brasileiras, o tempo médio de deslocamento casa-trabalho ultrapassa 1 hora diária. Em São Paulo, esse tempo pode chegar a 2 horas e 42 minutos para alguns trajetos, impactando diretamente a qualidade de vida dos cidadãos.",
    texto_motivador_3: "A implementação de políticas públicas voltadas para o transporte sustentável, como ciclovias, BRT e sistemas de transporte sobre trilhos, tem se mostrado eficaz na redução do tempo de deslocamento e da poluição atmosférica em diversas cidades brasileiras.",
    imagem_motivadora_url: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=600&h=400&fit=crop"
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link to="/temas" className="flex items-center gap-2 text-green-600 hover:text-green-700 transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span>Voltar</span>
            </Link>
            <div>
              <span className="text-sm font-medium text-green-600 bg-green-100 px-2 py-1 rounded">
                {tema.eixo}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-8 leading-tight">
              {tema.frase_tematica}
            </h1>

            <div className="space-y-6">
              {/* Texto Motivador 1 */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Texto Motivador I</h3>
                <p className="text-gray-700 leading-relaxed">
                  {tema.texto_motivador_1}
                </p>
              </div>

              {/* Texto Motivador 2 */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Texto Motivador II</h3>
                <p className="text-gray-700 leading-relaxed">
                  {tema.texto_motivador_2}
                </p>
              </div>

              {/* Texto Motivador 3 */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Texto Motivador III</h3>
                <p className="text-gray-700 leading-relaxed">
                  {tema.texto_motivador_3}
                </p>
              </div>

              {/* Imagem Motivadora */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Texto Motivador IV</h3>
                <div className="rounded-lg overflow-hidden">
                  <img 
                    src={tema.imagem_motivadora_url} 
                    alt="Imagem motivadora do tema"
                    className="w-full h-auto"
                  />
                </div>
              </div>

              {/* Proposta */}
              <div className="bg-green-50 rounded-lg p-6 border-l-4 border-green-500">
                <h3 className="font-bold text-green-900 mb-3">📝 Proposta de Redação</h3>
                <p className="text-green-800 leading-relaxed">
                  A partir da leitura dos textos motivadores e com base nos conhecimentos construídos ao longo de sua formação, 
                  redija texto dissertativo-argumentativo em modalidade escrita formal da língua portuguesa sobre o tema "{tema.frase_tematica}", 
                  apresentando proposta de intervenção que respeite os direitos humanos. Selecione, organize e relacione, 
                  de forma coerente e coesa, argumentos e fatos para defesa de seu ponto de vista.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default TemaDetalhes;
