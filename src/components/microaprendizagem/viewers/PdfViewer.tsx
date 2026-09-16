import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FileText } from 'lucide-react';

interface Props {
  storagePath: string;
  bucket?: string;
  onOpen?: () => void;
}

export const PdfViewer = ({ storagePath, bucket = 'micro-pdfs', onOpen }: Props) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [erro, setErro] = useState(false);
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  useEffect(() => {
    const gerar = async () => {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(storagePath, 1800); // 30 min

      if (error || !data?.signedUrl) {
        setErro(true);
        return;
      }
      setSignedUrl(data.signedUrl);
      onOpenRef.current?.();
    };
    gerar();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storagePath, bucket]);

  if (erro) {
    return (
      <div className="w-full h-96 bg-gray-50 rounded-xl flex flex-col items-center justify-center gap-2 border border-gray-100">
        <FileText className="w-10 h-10 text-gray-300" />
        <p className="text-sm text-gray-400">Não foi possível carregar o PDF.</p>
      </div>
    );
  }

  if (!signedUrl) {
    return (
      <div className="w-full h-96 bg-gray-50 rounded-xl flex items-center justify-center animate-pulse border border-gray-100">
        <p className="text-sm text-gray-400">Carregando documento...</p>
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl overflow-hidden border border-gray-100 shadow-sm">
      <iframe
        src={`${signedUrl}#toolbar=0&navpanes=0&scrollbar=1`}
        className="w-full"
        style={{ height: '70vh', minHeight: '400px', border: 0 }}
        title="Documento PDF"
      />
    </div>
  );
};
