import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface TemaModalProps {
  isOpen: boolean;
  onClose: () => void;
  tema: {
    id: string;
    frase_tematica: string;
    eixo_tematico?: string;
    imagem_texto_4_url?: string;
    texto_motivador_1?: string;
    texto_motivador_2?: string;
    texto_motivador_3?: string;
  } | null;
}

export const TemaModal = ({ isOpen, onClose, tema }: TemaModalProps) => {
  if (!tema) return null;

  const temTextoMotivador = tema.texto_motivador_1 || tema.texto_motivador_2 || tema.texto_motivador_3;
  const temDetalhesCompletos = tema.id && (tema.eixo_tematico || tema.imagem_texto_4_url || temTextoMotivador);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="text-lg font-semibold">Detalhes do Tema</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Eixo Temático */}
          {tema.eixo_tematico && (
            <div className="flex justify-center">
              <Badge variant="secondary" className="px-4 py-2 text-sm">
                {tema.eixo_tematico}
              </Badge>
            </div>
          )}

          {/* Título do Tema */}
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900">
              {tema.frase_tematica}
            </h2>
          </div>

          {/* Aviso se não tem detalhes completos */}
          {!temDetalhesCompletos && (
            <div className="bg-amber-50 border-l-4 border-amber-400 p-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-amber-700">
                    <strong>Tema Livre:</strong> Este tema foi digitado pelo aluno e não possui detalhes adicionais cadastrados no sistema.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Imagem */}
          {tema.imagem_texto_4_url && (
            <div className="flex justify-center">
              <img 
                src={tema.imagem_texto_4_url} 
                alt="Imagem do tema"
                className="max-w-full h-auto rounded-lg shadow-md"
                style={{ maxHeight: '300px' }}
              />
            </div>
          )}

          {/* Instrução Completa - só mostrar se tem detalhes completos */}
          {temDetalhesCompletos && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-700 leading-relaxed">
                A partir da leitura dos textos motivadores e com base nos conhecimentos construídos ao longo de sua 
                formação, redija texto dissertativo-argumentativo em modalidade escrita formal da língua portuguesa sobre o 
                tema <strong>"{tema.frase_tematica}"</strong>, apresentando proposta de intervenção que respeite os direitos humanos.
              </p>
            </div>
          )}

          {/* Textos Motivadores */}
          {temTextoMotivador && (
            <div className="space-y-4">
              {tema.texto_motivador_1 && (
                <div className="border rounded-lg p-4 bg-white">
                  <h3 className="font-semibold text-gray-900 mb-3">Texto Motivador I</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                    {tema.texto_motivador_1}
                  </p>
                </div>
              )}

              {tema.texto_motivador_2 && (
                <div className="border rounded-lg p-4 bg-white">
                  <h3 className="font-semibold text-gray-900 mb-3">Texto Motivador II</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                    {tema.texto_motivador_2}
                  </p>
                </div>
              )}

              {tema.texto_motivador_3 && (
                <div className="border rounded-lg p-4 bg-white">
                  <h3 className="font-semibold text-gray-900 mb-3">Texto Motivador III</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                    {tema.texto_motivador_3}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};