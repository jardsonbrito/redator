
import { supabase } from "@/integrations/supabase/client";

interface StudentDiagnostic {
  totalStudents: number;
  studentsWithProblematicEmails: any[];
  duplicateEmails: any[];
  emailsWithSpaces: any[];
  emailsWithSpecialChars: any[];
}

export const diagnoseStudentData = async (): Promise<StudentDiagnostic> => {
  console.log('🔍 DIAGNÓSTICO - Iniciando análise dos dados dos alunos...');
  
  try {
    // Buscar todos os alunos
    const { data: students, error } = await supabase
      .from("profiles")
      .select("id, nome, email, turma")
      .eq("user_type", "aluno");

    if (error) {
      console.error('🚨 Erro ao buscar alunos:', error);
      throw error;
    }

    const totalStudents = students?.length || 0;
    console.log(`📊 Total de alunos encontrados: ${totalStudents}`);

    // Analisar emails problemáticos
    const studentsWithProblematicEmails = students?.filter(student => {
      const email = student.email;
      return (
        email.includes(' ') || // Espaços
        email !== email.trim() || // Espaços no início/fim
        email !== email.toLowerCase() || // Maiúsculas
        /[^\w@.-]/.test(email.replace(/[@.-]/g, '')) // Caracteres especiais
      );
    }) || [];

    // Buscar emails duplicados
    const emailCounts: { [key: string]: any[] } = {};
    students?.forEach(student => {
      const normalizedEmail = student.email.trim().toLowerCase();
      if (!emailCounts[normalizedEmail]) {
        emailCounts[normalizedEmail] = [];
      }
      emailCounts[normalizedEmail].push(student);
    });

    const duplicateEmails = Object.entries(emailCounts)
      .filter(([_, students]) => students.length > 1)
      .map(([email, students]) => ({ email, students }));

    // Emails com espaços
    const emailsWithSpaces = students?.filter(student => 
      student.email.includes(' ') || student.email !== student.email.trim()
    ) || [];

    // Emails com caracteres especiais
    const emailsWithSpecialChars = students?.filter(student => 
      /[^\w@.-]/.test(student.email.replace(/[@.-]/g, ''))
    ) || [];

    const diagnostic: StudentDiagnostic = {
      totalStudents,
      studentsWithProblematicEmails,
      duplicateEmails,
      emailsWithSpaces,
      emailsWithSpecialChars
    };

    console.log('📊 DIAGNÓSTICO COMPLETO:', diagnostic);
    return diagnostic;

  } catch (error) {
    console.error('🚨 Erro no diagnóstico:', error);
    throw error;
  }
};

export const fixStudentEmails = async (): Promise<boolean> => {
  console.log('🔧 CORREÇÃO - Iniciando normalização dos emails dos alunos...');
  
  try {
    // Buscar todos os alunos
    const { data: students, error } = await supabase
      .from("profiles")
      .select("id, nome, email, turma")
      .eq("user_type", "aluno");

    if (error) {
      console.error('🚨 Erro ao buscar alunos para correção:', error);
      throw error;
    }

    let fixedCount = 0;

    for (const student of students || []) {
      const originalEmail = student.email;
      const normalizedEmail = originalEmail
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[^\w@.-]/g, '');

      if (originalEmail !== normalizedEmail) {
        console.log(`🔧 Corrigindo email: ${originalEmail} → ${normalizedEmail}`);
        
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ email: normalizedEmail })
          .eq("id", student.id);

        if (updateError) {
          console.error(`🚨 Erro ao corrigir email para ${student.nome}:`, updateError);
        } else {
          fixedCount++;
          console.log(`✅ Email corrigido para ${student.nome}`);
        }
      }
    }

    console.log(`✅ CORREÇÃO CONCLUÍDA: ${fixedCount} emails corrigidos`);
    return true;

  } catch (error) {
    console.error('🚨 Erro na correção dos emails:', error);
    return false;
  }
};

// Executar diagnóstico automaticamente em desenvolvimento
if (process.env.NODE_ENV === 'development') {
  setTimeout(async () => {
    try {
      await diagnoseStudentData();
      // Comentar a linha abaixo após confirmar que não há problemas
      // await fixStudentEmails();
    } catch (error) {
      console.error('Erro no diagnóstico automático:', error);
    }
  }, 3000);
}
