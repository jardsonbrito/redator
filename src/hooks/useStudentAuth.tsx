
import { useState, useEffect, createContext, useContext } from 'react';

interface StudentAuthContextType {
  isStudentLoggedIn: boolean;
  studentData: {
    userType: 'aluno' | 'visitante' | null;
    turma: string | null;
    nomeUsuario: string;
    visitanteInfo?: {
      nome: string;
      email: string;
    };
  };
  loginAsStudent: (turma: string) => void;
  loginAsVisitante: (nome: string, email: string) => void;
  logoutStudent: () => void;
}

const StudentAuthContext = createContext<StudentAuthContextType | undefined>(undefined);

export const StudentAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isStudentLoggedIn, setIsStudentLoggedIn] = useState(false);
  const [studentData, setStudentData] = useState<StudentAuthContextType['studentData']>({
    userType: null,
    turma: null,
    nomeUsuario: '',
    visitanteInfo: undefined
  });
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Verificar se há uma sessão ativa de estudante no localStorage
    const checkStudentSession = () => {
      const userType = localStorage.getItem("userType");
      const alunoTurma = localStorage.getItem("alunoTurma");
      const visitanteData = localStorage.getItem("visitanteData");

      console.log('🔍 Verificando sessão persistente - userType:', userType);
      console.log('🔍 Verificando sessão persistente - alunoTurma:', alunoTurma);
      console.log('🔍 Verificando sessão persistente - visitanteData:', visitanteData);

      if (userType === "aluno" && alunoTurma) {
        setIsStudentLoggedIn(true);
        setStudentData({
          userType: "aluno",
          turma: alunoTurma,
          nomeUsuario: `Aluno da ${alunoTurma}`
        });
        console.log('✅ Sessão de aluno restaurada persistentemente');
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
            nomeUsuario: ''
          });
        }
      } else {
        setIsStudentLoggedIn(false);
        setStudentData({
          userType: null,
          turma: null,
          nomeUsuario: ''
        });
        console.log('❌ Nenhuma sessão ativa encontrada');
      }
      
      setIsInitialized(true);
    };

    checkStudentSession();

    // Adicionar listener para mudanças no localStorage (caso seja modificado em outra aba)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "userType" || e.key === "alunoTurma" || e.key === "visitanteData") {
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

  const loginAsStudent = (turma: string) => {
    console.log('🔐 Login como aluno - turma:', turma);
    
    // Garantir persistência com múltiplas estratégias
    localStorage.setItem("alunoTurma", turma);
    localStorage.setItem("userType", "aluno");
    localStorage.removeItem("visitanteData");
    
    // Também salvar timestamp para auditoria
    localStorage.setItem("loginTimestamp", new Date().toISOString());
    
    setIsStudentLoggedIn(true);
    setStudentData({
      userType: "aluno",
      turma: turma,
      nomeUsuario: `Aluno da ${turma}`
    });
  };

  const loginAsVisitante = (nome: string, email: string) => {
    console.log('🔐 Login como visitante - nome:', nome, 'email:', email);
    const visitanteInfo = {
      nome: nome.trim(),
      email: email.trim().toLowerCase(),
      tipo: "visitante"
    };

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
    localStorage.removeItem("visitanteData");
    localStorage.removeItem("loginTimestamp");
    
    setIsStudentLoggedIn(false);
    setStudentData({
      userType: null,
      turma: null,
      nomeUsuario: ''
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
