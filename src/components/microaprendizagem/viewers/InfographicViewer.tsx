import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PdfViewer } from './PdfViewer';

interface Props {
  storagePath: string;
  onOpen?: () => void;
}

const isPdf = (path: string) => path.toLowerCase().endsWith('.pdf');

export const InfographicViewer = ({ storagePath, onOpen }: Props) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isPdf(storagePath)) return;

    const { data } = supabase.storage
      .from('micro-infograficos')
      .getPublicUrl(storagePath);

    setImageUrl(data.publicUrl);
    onOpen?.();
  }, [storagePath, onOpen]);

  if (isPdf(storagePath)) {
    return <PdfViewer storagePath={storagePath} bucket="micro-infograficos" onOpen={onOpen} />;
  }

  if (!imageUrl) {
    return <div className="w-full h-96 bg-gray-50 rounded-xl animate-pulse" />;
  }

  return (
    <div className="w-full rounded-xl overflow-hidden border border-gray-100 shadow-sm bg-gray-50">
      <img
        src={imageUrl}
        alt="Infográfico"
        className="w-full h-auto object-contain"
        style={{ maxHeight: '80vh' }}
      />
    </div>
  );
};
