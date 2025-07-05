
import { StudentHeader } from "@/components/StudentHeader";
import { EnvioRedacaoWithCorretor } from "@/components/EnvioRedacaoWithCorretor";

const EnvieRedacao = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <StudentHeader />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Enviar Redação
            </h1>
            <p className="text-gray-600">
              Escolha seus corretores e envie sua redação para correção
            </p>
          </div>
          
          <EnvioRedacaoWithCorretor />
        </div>
      </div>
    </div>
  );
};

export default EnvieRedacao;
