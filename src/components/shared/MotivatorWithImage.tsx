import { FormattedText } from './FormattedText';
import { supabase } from '@/integrations/supabase/client';

type ImagePosition = 'before' | 'after' | 'left' | 'right';

interface MotivatorWithImageProps {
  text?: string | null;
  imageSource?: string | null;
  imageUrl?: string | null;
  imageFilePath?: string | null;
  imagePosition?: string | null;
  motivatorNumber: number;
}

export const MotivatorWithImage = ({
  text,
  imageSource,
  imageUrl,
  imageFilePath,
  imagePosition = 'after',
  motivatorNumber
}: MotivatorWithImageProps) => {
  // Get image URL (from file path or direct URL)
  const getImageUrl = () => {
    if (imageSource === 'none' || !imageSource) return null;

    if (imageSource === 'upload' && imageFilePath) {
      const { data } = supabase.storage
        .from('themes')
        .getPublicUrl(imageFilePath);
      return data.publicUrl;
    }

    return imageUrl || null;
  };

  const finalImageUrl = getImageUrl();
  const hasText = text && text.trim();
  const hasImage = finalImageUrl;

  // Se não tem texto e nem imagem, não renderiza nada
  if (!hasText && !hasImage) return null;

  // Se tem apenas texto, renderiza só o texto
  if (hasText && !hasImage) {
    return (
      <div className="bg-white rounded-lg p-6 border border-redator-accent/20">
        <h3 className="font-semibold text-redator-primary mb-3">Texto {motivatorNumber}</h3>
        <div className="text-redator-accent">
          <FormattedText text={text} />
        </div>
      </div>
    );
  }

  // Se tem apenas imagem, renderiza só a imagem
  if (!hasText && hasImage) {
    return (
      <div className="bg-white rounded-lg p-6 border border-redator-accent/20">
        <h3 className="font-semibold text-redator-primary mb-3">Texto {motivatorNumber}</h3>
        <div className="rounded-lg overflow-hidden">
          <img
            src={finalImageUrl}
            alt={`Imagem do Texto ${motivatorNumber}`}
            className="w-full h-auto"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        </div>
      </div>
    );
  }

  // Se tem texto e imagem, renderiza de acordo com a posição
  const imageElement = (
    <div className="rounded-lg overflow-hidden">
      <img
        src={finalImageUrl}
        alt={`Imagem do Texto ${motivatorNumber}`}
        className="w-full h-auto"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
        }}
      />
    </div>
  );

  const textElement = (
    <div className="text-redator-accent">
      <FormattedText text={text} />
    </div>
  );

  // Renderiza de acordo com a posição
  const renderContent = () => {
    switch (imagePosition as ImagePosition) {
      case 'before':
        return (
          <>
            {imageElement}
            <div className="mt-4">{textElement}</div>
          </>
        );

      case 'after':
        return (
          <>
            {textElement}
            <div className="mt-4">{imageElement}</div>
          </>
        );

      case 'left':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>{imageElement}</div>
            <div>{textElement}</div>
          </div>
        );

      case 'right':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>{textElement}</div>
            <div>{imageElement}</div>
          </div>
        );

      default:
        return (
          <>
            {textElement}
            <div className="mt-4">{imageElement}</div>
          </>
        );
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 border border-redator-accent/20">
      <h3 className="font-semibold text-redator-primary mb-3">Texto {motivatorNumber}</h3>
      {renderContent()}
    </div>
  );
};
