import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText } from 'lucide-react';

interface JustificativaAusenciaModalProps {
  isOpen: boolean;
  onClose: () => void;
  aulaId: string;
  aulaTitulo: string;
  justificativaExistente?: { texto: string; criadoEm: string } | null;
  onEnviado?: (texto: string) => void;
}

function getAlunoData(): { email: string; nome: string; turma: string; aluno_id?: string } | null {
  const userType = localStorage.getItem('userType');
  if (userType === 'aluno') {
    const raw = localStorage.getItem('alunoData');
    if (!raw) return null;
    try {
      const dados = JSON.parse(raw);
      return {
        email: dados.email,
        nome: dados.nome || 'Aluno',
        turma: dados.turma || '',
        aluno_id: dados.id || dados.aluno_id,
      };
    } catch {
      return null;
    }
  }
  if (userType === 'visitante') {
    const raw = localStorage.getItem('visitanteData');
    if (!raw) return null;
    try {
      const dados = JSON.parse(raw);
      return { email: dados.email, nome: dados.nome || 'Visitante', turma: 'Visitante' };
    } catch {
      return null;
    }
  }
  return null;
}

export const JustificativaAusenciaModal = ({
  isOpen,
  onClose,
  aulaId,
  aulaTitulo,
  justificativaExistente,
  onEnviado,
}: JustificativaAusenciaModalProps) => {
  const [texto, setTexto] = useState('');
  const [isSending, setIsSending] = useState(false);

  const modoLeitura = !!justificativaExistente;

  const handleEnviar = async () => {
    const trimmed = texto.trim();
    if (!trimmed) {
      toast.error('Digite a justificativa antes de enviar.');
      return;
    }

    const aluno = getAlunoData();
    if (!aluno) {
      toast.error('Não foi possível identificar o aluno. Faça login novamente.');
      return;
    }

    setIsSending(true);
    try {
      const { error } = await supabase.from('justificativas_ausencia').upsert(
        {
          aula_id: aulaId,
          email_aluno: aluno.email.toLowerCase(),
          nome_aluno: aluno.nome,
          turma: aluno.turma,
          aluno_id: aluno.aluno_id ?? null,
          justificativa: trimmed,
        },
        { onConflict: 'aula_id,email_aluno' }
      );

      if (error) throw error;

      toast.success('Justificativa enviada com sucesso.');
      setTexto('');
      onEnviado?.(trimmed);
      onClose();
    } catch (err: any) {
      console.error('Erro ao enviar justificativa:', err);
      toast.error('Erro ao enviar justificativa. Tente novamente.');
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setTexto('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText className="w-4 h-4 text-muted-foreground" />
            {modoLeitura ? 'Justificativa enviada' : 'Justificar ausência'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{aulaTitulo}</p>
        </DialogHeader>

        <div className="space-y-4">
          {modoLeitura ? (
            <>
              <div className="rounded-md border bg-muted/40 p-4 text-sm text-gray-800 whitespace-pre-wrap">
                {justificativaExistente!.texto}
              </div>
              <p className="text-xs text-muted-foreground">
                Enviada em{' '}
                {format(new Date(justificativaExistente!.criadoEm), "dd/MM/yyyy 'às' HH:mm", {
                  locale: ptBR,
                })}
              </p>
              <Button variant="outline" className="w-full" onClick={onClose}>
                Fechar
              </Button>
            </>
          ) : (
            <>
              <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                A ausência permanece registrada. A justificativa apenas informa o motivo.
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Motivo da ausência</label>
                <Textarea
                  placeholder="Descreva o motivo pelo qual não pôde participar da aula..."
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  maxLength={500}
                  rows={5}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground text-right">{texto.length}/500</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={onClose} disabled={isSending}>
                  Cancelar
                </Button>
                <Button className="flex-1" onClick={handleEnviar} disabled={isSending}>
                  {isSending ? 'Enviando...' : 'Enviar justificativa'}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
