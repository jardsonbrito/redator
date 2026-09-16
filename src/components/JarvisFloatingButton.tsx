import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { JarvisIcon } from "@/components/icons/JarvisIcon";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { useToast } from "@/hooks/use-toast";

const JARVIS_BLOQUEADO_MSG =
  'O Jarvis não está disponível no seu plano atual. Entre em contato pelo WhatsApp (85) 99216-0605 para solicitar a compra de créditos e liberar o uso.';

export const JarvisFloatingButton = () => {
  const navigate                        = useNavigate();
  const { toast }                       = useToast();
  const { studentData }                 = useStudentAuth();
  const { isFeatureEnabled, isLoading } = usePlanFeatures(studentData.email ?? '');
  const jarvisBloqueado                 = !isLoading && !isFeatureEnabled('jarvis');

  const handleClick = () => {
    if (jarvisBloqueado) {
      toast({ title: 'Jarvis indisponível', description: JARVIS_BLOQUEADO_MSG, variant: 'destructive' });
      return;
    }
    navigate('/jarvis/tutor');
  };

  return (
    <div className="fixed bottom-20 right-4 z-50">
      <button
        onClick={handleClick}
        aria-label="Abrir Tutor Jarvis"
        title={jarvisBloqueado ? 'Jarvis indisponível' : 'Tutor Jarvis'}
        className="relative w-14 h-14 rounded-full shadow-lg flex items-center justify-center
                   bg-indigo-700 hover:bg-indigo-800 active:scale-95 transition-all duration-150
                   text-white ring-0 hover:ring-4 hover:ring-indigo-300"
      >
        {jarvisBloqueado
          ? <Lock className="w-5 h-5 text-white/70" />
          : <JarvisIcon size={26} className="text-white" />
        }
      </button>
    </div>
  );
};
