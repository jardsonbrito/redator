
import { supabase } from "@/integrations/supabase/client";

// Função de teste para validar o comportamento da autenticação
export const testEmailValidation = async () => {
  console.log('🧪 INICIANDO TESTES DE VALIDAÇÃO DE E-MAIL');
  
  const testCases = [
    {
      name: 'E-mails idênticos',
      redacaoEmail: 'teste@exemplo.com',
      userEmail: 'teste@exemplo.com',
      expectedResult: true
    },
    {
      name: 'E-mails diferentes',
      redacaoEmail: 'teste@exemplo.com',
      userEmail: 'outro@exemplo.com',
      expectedResult: false
    },
    {
      name: 'Case insensitive',
      redacaoEmail: 'TESTE@EXEMPLO.COM',
      userEmail: 'teste@exemplo.com',
      expectedResult: true
    },
    {
      name: 'Com espaços',
      redacaoEmail: ' teste@exemplo.com ',
      userEmail: 'teste@exemplo.com',
      expectedResult: true
    },
    {
      name: 'E-mail null',
      redacaoEmail: null,
      userEmail: 'teste@exemplo.com',
      expectedResult: false
    },
    {
      name: 'User email null',
      redacaoEmail: 'teste@exemplo.com',
      userEmail: null,
      expectedResult: false
    }
  ];

  for (const testCase of testCases) {
    try {
      const { data: result, error } = await supabase.rpc('can_access_redacao', {
        redacao_email: testCase.redacaoEmail,
        user_email: testCase.userEmail
      });

      const passed = result === testCase.expectedResult && !error;
      
      console.log(`${passed ? '✅' : '❌'} TESTE: ${testCase.name}`, {
        redacaoEmail: testCase.redacaoEmail,
        userEmail: testCase.userEmail,
        expected: testCase.expectedResult,
        actual: result,
        error: error,
        passed: passed
      });

      if (!passed) {
        console.error(`❌ FALHA NO TESTE: ${testCase.name}`);
      }
    } catch (error) {
      console.error(`💥 ERRO NO TESTE: ${testCase.name}`, error);
    }
  }

  console.log('🧪 TESTES DE VALIDAÇÃO CONCLUÍDOS');
};

// Executar testes automaticamente em desenvolvimento
if (process.env.NODE_ENV === 'development') {
  // Atraso para aguardar inicialização do Supabase
  setTimeout(() => {
    testEmailValidation();
  }, 2000);
}
