import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { renderTextWithParagraphs } from '@/utils/textUtils';

interface TemaModalProps {
  isOpen: boolean;
  onClose: () => void;
  tema: {
    id: string;
    frase_tematica: string;
    eixo_tematico?: string;
    imagem_texto_4_url?: string;
    texto_1?: string;
    texto_2?: string;
    texto_3?: string;
  } | null;
}

export const TemaModal = ({ isOpen, onClose, tema }: TemaModalProps) => {
  if (!tema) return null;

  const temTextoMotivador = tema.texto_1 || tema.texto_2 || tema.texto_3;
  const temDetalhesCompletos = tema.id && (tema.eixo_tematico || tema.imagem_texto_4_url || temTextoMotivador);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center mb-2">
            {tema.frase_tematica}
          </DialogTitle>
          {tema.eixo_tematico && (
            <div className="text-center">
              <Badge variant="secondary" className="mb-4">
                {tema.eixo_tematico}
              </Badge>
            </div>
          )}
        </DialogHeader>
        
        <div className="space-y-6">
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
            <img 
              src={tema.imagem_texto_4_url} 
              alt="Imagem do tema"
              className="block mx-auto max-h-[250px] w-auto object-contain rounded-md my-4"
            />
          )}

          {/* Instrução Completa - só mostrar se tem detalhes completos */}
          {temDetalhesCompletos && (
            <div className="bg-gray-50 rounded-lg p-6">
              <p className="text-gray-700 leading-relaxed text-center">
                A partir da leitura dos textos motivadores e com base nos conhecimentos construídos ao longo de sua formação, 
                redija texto dissertativo-argumentativo em modalidade escrita formal da língua portuguesa sobre o tema <strong>"{tema.frase_tematica}"</strong>, 
                apresentando proposta de intervenção que respeite os direitos humanos.
              </p>
            </div>
          )}

          {/* Textos Motivadores */}
          {tema.texto_1 && (
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Texto Motivador I</h3>
              <div className="text-gray-700">{renderTextWithParagraphs(tema.texto_1)}</div>
            </div>
          )}

          {tema.texto_2 && (
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Texto Motivador II</h3>
              <div className="text-gray-700">{renderTextWithParagraphs(tema.texto_2)}</div>
            </div>
          )}

          {tema.texto_3 && (
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Texto Motivador III</h3>
              <div className="text-gray-700">{renderTextWithParagraphs(tema.texto_3)}</div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};