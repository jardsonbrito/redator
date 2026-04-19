import { JarvisIcon } from '@/components/icons/JarvisIcon';

interface JarvisLoadingScreenProps {
  mensagem?: string;
}

export const JarvisLoadingScreen = ({ mensagem }: JarvisLoadingScreenProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-4 text-center">
      <div className="animate-pulse">
        <JarvisIcon size={80} />
      </div>
      <div className="space-y-1">
        <p className="text-base font-semibold text-indigo-700">Jarvis está trabalhando...</p>
        <p className="text-sm text-gray-500">
          {mensagem || 'Aguarde enquanto organizamos suas sugestões de redação.'}
        </p>
      </div>
    </div>
  );
};
