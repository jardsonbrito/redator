
import { useState, useEffect, createContext, useContext } from 'react';

interface StudentAuthContextType {
  isStudentLoggedIn: boolean;
  studentData: {
    id: string;
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
    id: '',
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
            id: dados.email, // usar email como ID para alunos
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
            id: dados.email, // usar email como ID para visitantes
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
            id: '',
            userType: null,
            turma: null,
            nomeUsuario: '',
            email: undefined
          });
        }
      } else {
        setIsStudentLoggedIn(false);
        setStudentData({
          id: '',
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

  // Função para garantir que o perfil existe no banco
  const ensureProfileExists = async (email: string, nome: string, turma: string) => {
    try {
      console.log("🔍 Verificando se perfil existe para:", email);
      const { supabase } = await import('@/integrations/supabase/client');

      // Primeiro verifica se já existe
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .eq("user_type", "aluno")
        .maybeSingle();

      if (existingProfile) {
        console.log("✅ Perfil já existe:", existingProfile.id);
        return existingProfile.id;
      }

      // Se não existe, tenta criar
      console.log("⚠️ Perfil não encontrado. Criando novo perfil para:", email);
      
      const { data: newProfile, error: insertError } = await supabase
        .rpc('create_simple_profile', {
          p_nome: nome || 'Aluno',
          p_email: email,
          p_turma: turma || ''
        });

      if (insertError) {
        console.error("❌ Erro ao criar perfil:", insertError.message);
        return null;
      }

      console.log("✅ Perfil criado com sucesso:", newProfile?.[0]?.id);
      return newProfile?.[0]?.id;
    } catch (error) {
      console.error("❌ Erro inesperado ao verificar/criar perfil:", error);
      return null;
    }
  };

  const loginAsStudent = async (turma: string, nome: string, email: string) => {
    console.log('🔐 Login como aluno - turma:', turma, 'nome:', nome, 'email:', email);
    
    const alunoInfo = {
      nome: nome.trim(),
      email: email.trim().toLowerCase(),
      turma: turma
    };
    
    try {
      // Garantir que o perfil existe no banco de dados
      await ensureProfileExists(email.trim().toLowerCase(), nome.trim(), turma);
      
      // Verificação automática de contas duplicadas e merge
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: mergeResult } = await supabase.rpc('auto_merge_student_accounts', {
        student_email: email.trim().toLowerCase()
      });
      
      if (mergeResult && typeof mergeResult === 'object' && 'auto_merged' in mergeResult && mergeResult.auto_merged) {
        console.log('✅ Redações anteriores reconectadas automaticamente:', mergeResult.total_redacoes_merged);
      }
    } catch (error) {
      console.warn('⚠️ Erro na verificação automática:', error);
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
      id: email.toLowerCase(), // usar email como ID para alunos
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
      id: email.toLowerCase(), // usar email como ID para visitantes
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
    
    // Limpar cache do avatar
    localStorage.removeItem("student_avatar_url");
    
    setIsStudentLoggedIn(false);
    setStudentData({
      id: '',
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
