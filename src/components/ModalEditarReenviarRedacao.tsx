import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Send, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { gerarImagemA4DeTexto, validarImagemGerada, gerarNomeArquivoA4 } from '@/utils/gerarImagemA4';

interface ModalEditarReenviarRedacaoProps {
  isOpen: boolean;
  onClose: () => void;
  redacao: {
    id: string;
    frase_tematica: string;
    redacao_texto: string;
  };
  onSuccess: () => void;
}

export function ModalEditarReenviarRedacao({
  isOpen,
  onClose,
  redacao,
  onSuccess
}: ModalEditarReenviarRedacaoProps) {
  const [textoEditado, setTextoEditado] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Carregar texto original quando o modal abrir
  useEffect(() => {
    if (isOpen && redacao.redacao_texto) {
      setTextoEditado(redacao.redacao_texto);
    }
  }, [isOpen, redacao.redacao_texto]);

  const handleReenviar = async () => {
    if (!textoEditado.trim()) {
      toast({
        title: "Texto vazio",
        description: "Por favor, escreva sua redação antes de enviar.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Gerar imagem A4 do novo texto
      const imagemBlob = await gerarImagemA4DeTexto(textoEditado);

      // 2. Validar imagem gerada
      const validacao = validarImagemGerada(imagemBlob);
      if (!validacao.valido) {
        throw new Error(validacao.erro);
      }

      // 3. Upload da imagem para o Supabase Storage
      const nomeArquivo = gerarNomeArquivoA4('redacao');
      const caminhoArquivo = `${nomeArquivo}`;

      const { error: uploadError } = await supabase.storage
        .from('redacoes-manuscritas')
        .upload(caminhoArquivo, imagemBlob, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) {
        throw new Error('Falha ao fazer upload da imagem');
      }

      // 4. Obter URL pública da imagem
      const { data: urlData } = supabase.storage
        .from('redacoes-manuscritas')
        .getPublicUrl(caminhoArquivo);

      const urlImagemGerada = urlData.publicUrl;

      // 5. Atualizar a redação existente com a nova imagem
      const { data, error } = await supabase
        .from('redacoes_enviadas')
        .update({
          redacao_texto: textoEditado,
          data_envio: new Date().toISOString(),
          status: 'reenvio',
          corrigida: false,
          nota_c1: null,
          nota_c2: null,
          nota_c3: null,
          nota_c4: null,
          nota_c5: null,
          nota_total: null,
          comentario_admin: null,
          data_correcao: null,
          // Atualizar com a NOVA imagem A4 gerada
          redacao_imagem_gerada_url: urlImagemGerada,
          // Limpar dados de correção anteriores (corretor 1)
          c1_corretor_1: null,
          c2_corretor_1: null,
          c3_corretor_1: null,
          c4_corretor_1: null,
          c5_corretor_1: null,
          nota_final_corretor_1: null,
          comentario_c1_corretor_1: null,
          comentario_c2_corretor_1: null,
          comentario_c3_corretor_1: null,
          comentario_c4_corretor_1: null,
          comentario_c5_corretor_1: null,
          elogios_pontos_atencao_corretor_1: null,
          audio_url_corretor_1: null,
          status_corretor_1: 'pendente',
          // NÃO remover corretor_id_1 - manter o corretor atribuído!
          // Limpar dados de devolução
          justificativa_devolucao: null,
          devolvida_por: null,
          data_devolucao: null
        })
        .eq('id', redacao.id)
        .select();

      if (error) {
        throw error;
      }

      // Invalidar cache do React Query para forçar refetch em TODAS as queries de redações
      queryClient.invalidateQueries({ queryKey: ['corretor-redacoes'] });
      queryClient.invalidateQueries({ queryKey: ['minhas-redacoes'] });

      toast({
        title: "✅ Redação reenviada!",
        description: "Sua redação foi reenviada com sucesso para correção.",
        className: "border-green-200 bg-green-50 text-green-900"
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao reenviar redação:', error);
      toast({
        title: "Erro ao reenviar",
        description: "Não foi possível reenviar sua redação. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const contarPalavras = (texto: string) => {
    return texto.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Send className="w-5 h-5 text-blue-600" />
            Editar e Reenviar Redação
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {redacao.frase_tematica}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-blue-800 dark:text-blue-200 text-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>
                    Edite sua redação abaixo e clique em <strong>"Reenviar"</strong> para submeter novamente para correção.
                    Sua redação será marcada como "Reenvio" e entrará na fila de correção.
                  </span>
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Texto da Redação</label>
                  <span className="text-xs text-muted-foreground">
                    {contarPalavras(textoEditado)} palavras
                  </span>
                </div>

                <Textarea
                  value={textoEditado}
                  onChange={(e) => setTextoEditado(e.target.value)}
                  placeholder="Digite sua redação aqui..."
                  className="min-h-[400px] font-mono text-sm"
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>

                <Button
                  onClick={handleReenviar}
                  disabled={isSubmitting || !textoEditado.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSubmitting ? (
                    <>⏳ Reenviando...</>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Reenviar Redação
                    </>
                  )}
                </Button>
              </div>
            </>
        </div>
      </DialogContent>
    </Dialog>
  );
}
