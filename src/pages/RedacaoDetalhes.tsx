
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";

const RedacaoDetalhes = () => {
  const { id } = useParams();
  
  // Mock data - será substituído pelos dados do Supabase
  const redacao = {
    frase_tematica: "A importância da educação digital no século XXI",
    eixo: "Educação e Tecnologia",
    redacao: `A educação digital representa um dos pilares fundamentais para o desenvolvimento social e econômico no século XXI. Em uma era marcada pela constante evolução tecnológica, a capacidade de compreender, utilizar e criar com ferramentas digitais torna-se essencial para a formação de cidadãos críticos e preparados para os desafios contemporâneos.

Primeiramente, é importante reconhecer que a educação digital vai além do simples uso de computadores e internet. Ela engloba o desenvolvimento de habilidades como pensamento computacional, letramento digital e capacidade de análise crítica de informações online. Essas competências são fundamentais para que os indivíduos possam navegar de forma segura e eficiente no mundo digital, evitando armadilhas como fake news e crimes virtuais.

Além disso, a educação digital promove a democratização do acesso ao conhecimento. Através de plataformas online, cursos à distância e recursos educacionais abertos, pessoas de diferentes regiões e condições socioeconômicas podem ter acesso a conteúdos de qualidade. Essa característica é particularmente relevante em um país de dimensões continentais como o Brasil, onde as desigualdades regionais ainda são uma realidade.

Por outro lado, é necessário reconhecer os desafios que acompanham a implementação da educação digital. A exclusão digital, caracterizada pela falta de acesso à internet e equipamentos tecnológicos, ainda afeta milhões de brasileiros. Sem políticas públicas efetivas que garantam infraestrutura adequada e formação de professores, a educação digital pode se tornar mais um fator de aprofundamento das desigualdades sociais.

Portanto, é fundamental que o poder público, em parceria com a sociedade civil e o setor privado, desenvolva estratégias integradas para promover a educação digital de forma inclusiva e democrática. Somente assim será possível formar uma geração preparada para os desafios do futuro e capaz de utilizar a tecnologia como ferramenta de transformação social positiva.`
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link to="/redacoes" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span>Voltar</span>
            </Link>
            <div>
              <span className="text-sm font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">
                {redacao.eixo}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-6 leading-tight">
              {redacao.frase_tematica}
            </h1>
            
            <div className="prose prose-lg max-w-none">
              {redacao.redacao.split('\n\n').map((paragrafo, index) => (
                <p key={index} className="mb-4 text-gray-700 leading-relaxed">
                  {paragrafo}
                </p>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">💡 Dica de Estudo</h3>
                <p className="text-blue-800 text-sm">
                  Observe como esta redação desenvolve cada argumento com exemplos concretos e conecta as ideias de forma coesa. 
                  Pratique identificando a tese, os argumentos e a conclusão.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default RedacaoDetalhes;
