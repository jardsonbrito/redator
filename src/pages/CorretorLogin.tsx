
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCorretorAuth } from "@/hooks/useCorretorAuth";
import { CorretorLoginForm } from "@/components/corretor/CorretorLoginForm";

const CorretorLogin = () => {
  const { corretor, loading } = useCorretorAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && corretor) {
      navigate('/corretor', { replace: true });
    }
  }, [corretor, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center">
        <div className="text-lg text-redator-accent">Carregando...</div>
      </div>
    );
  }

  if (corretor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center">
        <div className="text-lg text-redator-accent">Redirecionando...</div>
      </div>
    );
  }

  return <CorretorLoginForm />;
};

export default CorretorLogin;
