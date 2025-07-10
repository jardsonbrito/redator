
import { useState, useEffect, createContext, useContext } from 'react';

interface StudentAuthContextType {
  isStudentLoggedIn: boolean;
  studentData: {
    userType: 'aluno' | 'visitante' | null;
    turma: string | null;
    nomeUsuario: string;
    email?: string;
    visitanteInfo?: {
      nome: string;
      email: string;
    };
  };
  loginAsStudent: (turma: string, nome: string, email: string) => Promise<void>;
  loginAsVisitante: (nome: string, email: string) => Promise<void>;
  logoutStudent: () => void;
}

const StudentAuthContext = createContext<StudentAuthContextType | undefined>(undefined);

export const StudentAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isStudentLoggedIn, setIsStudentLoggedIn] = useState(false);
  const [studentData, setStudentData] = useState<StudentAuthContextType['studentData']>({
    userType: null,
    turma: null,
    nomeUsuario: '',
    email: undefined,
    visitanteInfo: undefined
  });
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Verificar se há uma sessão ativa de estudante no localStorage
    const checkStudentSession = () => {
      const userType = localStorage.getItem("userType");
      const alunoTurma = localStorage.getItem("alunoTurma");
      const alunoData = localStorage.getItem("alunoData");
      const visitanteData = localStorage.getItem("visitanteData");

      console.log('🔍 Verificando sessão persistente - userType:', userType);
      console.log('🔍 Verificando sessão persistente - alunoTurma:', alunoTurma);
      console.log('🔍 Verificando sessão persistente - alunoData:', alunoData);
      console.log('🔍 Verificando sessão persistente - visitanteData:', visitanteData);

      if (userType === "aluno" && alunoTurma && alunoData) {
        try {
          const dados = JSON.parse(alunoData);
          setIsStudentLoggedIn(true);
          setStudentData({
            userType: "aluno",
            turma: alunoTurma,
            nomeUsuario: dados.nome,
            email: dados.email
          });
          console.log('✅ Sessão de aluno restaurada persistentemente');
        } catch (error) {
          console.error('❌ Erro ao parsear dados do aluno:', error);
          // Limpar dados corrompidos
          localStorage.removeItem("alunoData");
          localStorage.removeItem("userType");
          localStorage.removeItem("alunoTurma");
        }
      } else if (userType === "visitante" && visitanteData) {
        try {
          const dados = JSON.parse(visitanteData);
          setIsStudentLoggedIn(true);
          setStudentData({
            userType: "visitante",
            turma: "visitante",
            nomeUsuario: dados.nome,
            visitanteInfo: dados
          });
          console.log('✅ Sessão de visitante restaurada persistentemente');
        } catch (error) {
          console.error('❌ Erro ao parsear dados do visitante:', error);
          // Limpar dados corrompidos
          localStorage.removeItem("visitanteData");
          localStorage.removeItem("userType");
          localStorage.removeItem("alunoTurma");
          setIsStudentLoggedIn(false);
          setStudentData({
            userType: null,
            turma: null,
            nomeUsuario: '',
            email: undefined
          });
        }
      } else {
        setIsStudentLoggedIn(false);
        setStudentData({
          userType: null,
          turma: null,
          nomeUsuario: '',
          email: undefined
        });
        console.log('❌ Nenhuma sessão ativa encontrada');
      }
      
      setIsInitialized(true);
    };

    checkStudentSession();

    // Adicionar listener para mudanças no localStorage (caso seja modificado em outra aba)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "userType" || e.key === "alunoTurma" || e.key === "alunoData" || e.key === "visitanteData") {
        console.log('🔄 Mudança detectada no localStorage:', e.key);
        checkStudentSession();
      }
    };

    // Adicionar listener para beforeunload para garantir persistência
    const handleBeforeUnload = () => {
      // Garantir que dados estão salvos antes da página fechar
      if (isStudentLoggedIn) {
        console.log('💾 Salvando sessão antes de fechar página');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isStudentLoggedIn]);

  const loginAsStudent = async (turma: string, nome: string, email: string) => {
    console.log('🔐 Login como aluno - turma:', turma, 'nome:', nome, 'email:', email);
    
    const alunoInfo = {
      nome: nome.trim(),
      email: email.trim().toLowerCase(),
      turma: turma
    };
    
    try {
      // Verificação automática de contas duplicadas e merge
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: mergeResult } = await supabase.rpc('auto_merge_student_accounts', {
        student_email: email.trim().toLowerCase()
      });
      
      if (mergeResult && typeof mergeResult === 'object' && 'auto_merged' in mergeResult && mergeResult.auto_merged) {
        console.log('✅ Redações anteriores reconectadas automaticamente:', mergeResult.total_redacoes_merged);
      }
    } catch (error) {
      console.warn('⚠️ Erro na verificação automática de merge:', error);
      // Não bloquear o login se a verificação falhar
    }
    
    // Garantir persistência com múltiplas estratégias
    localStorage.setItem("alunoTurma", turma);
    localStorage.setItem("alunoData", JSON.stringify(alunoInfo));
    localStorage.setItem("userType", "aluno");
    localStorage.removeItem("visitanteData");
    
    // Também salvar timestamp para auditoria
    localStorage.setItem("loginTimestamp", new Date().toISOString());
    
    setIsStudentLoggedIn(true);
    setStudentData({
      userType: "aluno",
      turma: turma,
      nomeUsuario: nome,
      email: email.toLowerCase()
    });
  };

  const loginAsVisitante = async (nome: string, email: string) => {
    console.log('🔐 Login como visitante - nome:', nome, 'email:', email);
    const visitanteInfo = {
      nome: nome.trim(),
      email: email.trim().toLowerCase(),
      tipo: "visitante"
    };

    try {
      // Verificação automática de contas duplicadas e merge para visitantes também
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: mergeResult } = await supabase.rpc('auto_merge_student_accounts', {
        student_email: email.trim().toLowerCase()
      });
      
      if (mergeResult && typeof mergeResult === 'object' && 'auto_merged' in mergeResult && mergeResult.auto_merged) {
        console.log('✅ Redações anteriores reconectadas automaticamente para visitante:', mergeResult.total_redacoes_merged);
      }
    } catch (error) {
      console.warn('⚠️ Erro na verificação automática de merge para visitante:', error);
      // Não bloquear o login se a verificação falhar
    }

    // Garantir persistência com múltiplas estratégias
    localStorage.setItem("visitanteData", JSON.stringify(visitanteInfo));
    localStorage.setItem("userType", "visitante");
    localStorage.setItem("alunoTurma", "visitante");
    localStorage.setItem("loginTimestamp", new Date().toISOString());

    setIsStudentLoggedIn(true);
    setStudentData({
      userType: "visitante",
      turma: "visitante",
      nomeUsuario: nome,
      visitanteInfo: visitanteInfo
    });
  };

  const logoutStudent = () => {
    console.log('🚪 Logout do estudante');
    // Limpar todos os dados de sessão do estudante
    localStorage.removeItem("userType");
    localStorage.removeItem("alunoTurma");
    localStorage.removeItem("alunoData");
    localStorage.removeItem("visitanteData");
    localStorage.removeItem("loginTimestamp");
    
    setIsStudentLoggedIn(false);
    setStudentData({
      userType: null,
      turma: null,
      nomeUsuario: '',
      email: undefined
    });
  };

  // Não renderizar até a inicialização estar completa
  if (!isInitialized) {
    return <div>Carregando...</div>;
  }

  return (
    <StudentAuthContext.Provider value={{
      isStudentLoggedIn,
      studentData,
      loginAsStudent,
      loginAsVisitante,
      logoutStudent
    }}>
      {children}
    </StudentAuthContext.Provider>
  );
};

export const useStudentAuth = () => {
  const context = useContext(StudentAuthContext);
  if (context === undefined) {
    throw new Error('useStudentAuth must be used within a StudentAuthProvider');
  }
  return context;
};
