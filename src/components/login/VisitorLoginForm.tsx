
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { EmailLoginStep } from "./EmailLoginStep";
import { NovoVisitanteModal } from "./NovoVisitanteModal";

interface VisitorLoginFormProps {
  onLogin: (data: { nome: string; email: string; whatsapp?: string }) => void;
  loading: boolean;
}

interface UserData {
  encontrado: boolean;
  tipo: 'aluno' | 'visitante' | 'professor' | 'corretor' | 'admin' | 'novo' | 'erro';
  dados?: any;
  erro?: string;
}

export const VisitorLoginForm = ({ onLogin, loading }: VisitorLoginFormProps) => {
  const [step, setStep] = useState<'email' | 'novo_visitante'>('email');
  const [emailVerificado, setEmailVerificado] = useState("");
  const [showModal, setShowModal] = useState(false);
  const { toast } = useToast();

  const handleEmailVerified = async (email: string, userData: UserData | null) => {
    console.log('📧 Email verificado:', email, userData);

    // Se userData é null, tratar como novo visitante
    if (!userData) {
      console.log('👤 Dados não encontrados - novo visitante');
      setEmailVerificado(email);
      setShowModal(true);
      return;
    }

    if (userData.tipo === 'erro') {
      toast({
        title: "Erro na verificação",
        description: userData.erro || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
      return;
    }

    if (!userData.encontrado || userData.tipo === 'novo') {
      // Novo visitante - mostrar modal
      console.log('👤 Novo visitante detectado');
      setEmailVerificado(email);
      setShowModal(true);
      return;
    }

    // Usuário encontrado - fazer login direto
    if (userData.tipo === 'visitante') {
      console.log('✅ Visitante existente encontrado:', userData.dados);
      onLogin({ 
        nome: userData.dados.nome, 
        email: userData.dados.email
      });
    } else if (userData.tipo === 'aluno') {
      console.log('🎓 Aluno encontrado, mas precisa usar login de aluno');
      toast({
        title: "Aluno detectado!",
        description: `Olá ${userData.dados.nome}! Para acessar como aluno, use a opção "Aluno" e selecione sua turma: ${userData.dados.turma}.`,
        variant: "default"
      });
      return;
    } else {
      // Outros tipos (professor, corretor, admin)
      toast({
        title: `${userData.tipo} detectado!`,
        description: `Olá ${userData.dados.nome}! Use a opção "${userData.tipo}" para fazer login.`,
        variant: "default"
      });
    }
  };

  const handleNovoVisitanteComplete = (data: { nome: string; email: string; whatsapp?: string }) => {
    console.log('✨ Novo visitante criado:', data);
    setShowModal(false);
    
    // Fazer login com os dados do novo visitante
    onLogin({ 
      nome: data.nome, 
      email: data.email,
      whatsapp: data.whatsapp 
    });
  };

  return (
    <>
      {step === 'email' && (
        <EmailLoginStep 
          onEmailVerified={handleEmailVerified}
          loading={loading}
        />
      )}

      <NovoVisitanteModal
        isOpen={showModal}
        email={emailVerificado}
        onComplete={handleNovoVisitanteComplete}
        onClose={() => setShowModal(false)}
        loading={loading}
      />
    </>
  );
};
