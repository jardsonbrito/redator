
import { supabase } from "@/integrations/supabase/client";

// Função para vincular redações antigas aos e-mails corretos dos alunos
export const linkOldEssaysToStudents = async () => {
  console.log("🔄 Iniciando vinculação de redações antigas...");

  try {
    // Mapeamento correto dos nomes para e-mails
    const estudantes = [
      {
        nomes: ['Ruth Constantatino Esteves', 'Ruth Constantino Esteves', 'Ruth Constantino', 'Ruth Constantatino'],
        email: 'ruthesteves@laboratoriodoredator.com'
      },
      {
        nomes: ['Joana Évelyn', 'Joana Evelyn'],
        email: 'joana@laboratoriodoredator.com'
      },
      {
        nomes: ['Lucas Julião', 'Lucas Juliao'],
        email: 'lucasfreitas@laboratoriodoredator.com'
      }
    ];

    // Atualizar redações enviadas
    for (const estudante of estudantes) {
      for (const nome of estudante.nomes) {
        console.log(`🔍 Procurando redações para: ${nome}`);
        
        // Atualizar em redacoes_enviadas
        const { error: errorEnviadas } = await supabase
          .from('redacoes_enviadas')
          .update({ email_aluno: estudante.email })
          .ilike('nome_aluno', `%${nome}%`);

        if (errorEnviadas) {
          console.error(`❌ Erro ao atualizar redações enviadas de ${nome}:`, errorEnviadas);
        } else {
          console.log(`✅ Redações enviadas de ${nome} vinculadas ao e-mail: ${estudante.email}`);
        }

        // Atualizar em redacoes_simulado
        const { error: errorSimulado } = await supabase
          .from('redacoes_simulado')
          .update({ email_aluno: estudante.email })
          .ilike('nome_aluno', `%${nome}%`);

        if (errorSimulado) {
          console.error(`❌ Erro ao atualizar redações de simulado de ${nome}:`, errorSimulado);
        } else {
          console.log(`✅ Redações de simulado de ${nome} vinculadas ao e-mail: ${estudante.email}`);
        }
      }
    }

    console.log('🎉 Processo de vinculação de redações antigas concluído!');
    return true;

  } catch (error) {
    console.error('💥 Erro geral na vinculação de redações antigas:', error);
    return false;
  }
};
