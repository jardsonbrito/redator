import { CheckCircle2, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface AulaVideoModalProps {
  aula: {
    id: string;
    titulo: string;
    embed_url?: string | null;
  } | null;
  isConfirmed: boolean;
  isConfirming: boolean;
  onClose: () => void;
  onConfirmar: (id: string, titulo: string) => void;
}

export function AulaVideoModal({
  aula,
  isConfirmed,
  isConfirming,
  onClose,
  onConfirmar,
}: AulaVideoModalProps) {
  if (!aula) return null;

  // Adiciona parâmetros para visual mais limpo no player
  const embedSrc = aula.embed_url
    ? `${aula.embed_url}${aula.embed_url.includes('?') ? '&' : '?'}rel=0&modestbranding=1`
    : null;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        className="max-w-4xl w-full p-0 overflow-hidden gap-0"
        // Remove o X padrão do DialogContent — usamos o nosso próprio no rodapé
        onInteractOutside={onClose}
      >
        {/* Título */}
        <div className="flex items-center justify-between px-5 py-3 border-b bg-[#3f0776]">
          <h2 className="text-white font-semibold text-sm leading-tight truncate pr-4">
            {aula.titulo}
          </h2>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors flex-shrink-0"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Vídeo */}
        <div className="aspect-video w-full bg-black">
          {embedSrc ? (
            <iframe
              src={embedSrc}
              className="w-full h-full"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              title={aula.titulo}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              Player não disponível para esta aula.
            </div>
          )}
        </div>

        {/* Rodapé com confirmação */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 bg-white border-t">
          <p className="text-sm text-gray-500 leading-snug">
            {isConfirmed
              ? 'Ótimo! Esta aula foi registrada no seu progresso.'
              : 'Assistiu até o final? Confirme para registrar no seu progresso.'}
          </p>

          {isConfirmed ? (
            <Button
              disabled
              className="min-w-[180px] bg-green-50 text-green-700 border border-green-200 cursor-default"
              variant="outline"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Assistida
            </Button>
          ) : (
            <Button
              onClick={() => onConfirmar(aula.id, aula.titulo)}
              disabled={isConfirming}
              className="min-w-[180px] bg-[#3f0776] hover:bg-[#5a1a9e] text-white"
            >
              {isConfirming ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Confirmando…</>
              ) : (
                <><CheckCircle2 className="w-4 h-4 mr-2" />Confirmar que assisti</>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
