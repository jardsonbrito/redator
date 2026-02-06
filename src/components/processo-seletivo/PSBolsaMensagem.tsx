import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, CheckCircle, Loader2 } from 'lucide-react';
import { Candidato, EtapaFinal } from '@/hooks/useProcessoSeletivo';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface PSBolsaMensagemProps {
  candidato: Candidato;
  etapaFinal: EtapaFinal;
}

export const PSBolsaMensagem: React.FC<PSBolsaMensagemProps> = ({
  candidato,
  etapaFinal
}) => {
  const queryClient = useQueryClient();
  const [isConfirmando, setIsConfirmando] = useState(false);

  const handleConfirmar = async () => {
    setIsConfirmando(true);
    try {
      // Atualizar status do candidato para concluído
      const { error: updateError } = await supabase
        .from('ps_candidatos')
        .update({
          status: 'concluido',
          data_conclusao: new Date().toISOString()
        })
        .eq('id', candidato.id);

      if (updateError) {
        throw new Error('Erro ao concluir processo');
      }

      // Marcar participação no perfil
      await supabase
        .from('profiles')
        .update({ participou_processo_seletivo: true })
        .eq('email', candidato.email_aluno);

      // Invalidar caches
      queryClient.invalidateQueries({ queryKey: ['ps-candidato'] });
      queryClient.invalidateQueries({ queryKey: ['processo-seletivo-participacao'] });
      queryClient.invalidateQueries({ queryKey: ['processo-seletivo-candidato-status'] });

      toast.success('Processo concluído com sucesso!');
    } catch (error) {
      console.error('Erro ao confirmar:', error);
      toast.error('Erro ao concluir o processo. Tente novamente.');
    } finally {
      setIsConfirmando(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-200/30 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-teal-200/30 rounded-full translate-y-1/2 -translate-x-1/2" />

        <CardHeader className="text-center relative">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
                <Trophy className="h-12 w-12 text-white" />
              </div>
            </div>
          </div>
          <CardTitle className="text-2xl text-emerald-800">
            Parabéns, {candidato.nome_aluno.split(' ')[0]}!
          </CardTitle>
        </CardHeader>

        <CardContent className="text-center relative space-y-6">
          {/* Mensagem configurada pelo admin */}
          <div className="p-5 bg-white/80 rounded-xl border border-emerald-200 shadow-sm">
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
              {etapaFinal.mensagem_bolsa}
            </p>
          </div>

          {/* Botão de confirmar */}
          <Button
            onClick={handleConfirmar}
            disabled={isConfirmando}
            size="lg"
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 text-base shadow-md"
          >
            {isConfirmando ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 mr-2" />
                Confirmar e Concluir
              </>
            )}
          </Button>

          <p className="text-xs text-emerald-600">
            Ao confirmar, seu processo seletivo será marcado como concluído.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PSBolsaMensagem;
