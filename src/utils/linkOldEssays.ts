
import { supabase } from "@/integrations/supabase/client";

// Função para vincular redações antigas aos e-mails corretos dos alunos
export const linkOldEssaysToStudents = async () => {
  console.log("🔄 Iniciando vinculação de redações antigas...");

  try {
    // Atualizar redações de Ruth Constantatino Esteves
    const { error: ruthError } = await supabase
      .from('redacoes_enviadas')
      .update({ email_aluno: 'ruthesteves@laboratoriodoredator.com' })
      .ilike('nome_aluno', '%Ruth%Constantatino%Esteves%');

    if (ruthError) {
      console.error('❌ Erro ao atualizar redações da Ruth:', ruthError);
    } else {
      console.log('✅ Redações da Ruth vinculadas ao e-mail: ruthesteves@laboratoriodoredator.com');
    }

    // Atualizar redações de Joana Évelyn
    const { error: joanaError } = await supabase
      .from('redacoes_enviadas')
      .update({ email_aluno: 'joana@laboratoriodoredator.com' })
      .ilike('nome_aluno', '%Joana%Évelyn%');

    if (joanaError) {
      console.error('❌ Erro ao atualizar redações da Joana:', joanaError);
    } else {
      console.log('✅ Redações da Joana vinculadas ao e-mail: joana@laboratoriodoredator.com');
    }

    // Atualizar redações de Lucas Julião
    const { error: lucasError } = await supabase
      .from('redacoes_enviadas')
      .update({ email_aluno: 'lucasfreitas@laboratoriodoredator.com' })
      .ilike('nome_aluno', '%Lucas%Julião%');

    if (lucasError) {
      console.error('❌ Erro ao atualizar redações do Lucas:', lucasError);
    } else {
      console.log('✅ Redações do Lucas vinculadas ao e-mail: lucasfreitas@laboratoriodoredator.com');
    }

    // Fazer o mesmo para redações de simulado se existirem
    await supabase
      .from('redacoes_simulado')
      .update({ email_aluno: 'ruthesteves@laboratoriodoredator.com' })
      .ilike('nome_aluno', '%Ruth%Constantatino%Esteves%');

    await supabase
      .from('redacoes_simulado')
      .update({ email_aluno: 'joana@laboratoriodoredator.com' })
      .ilike('nome_aluno', '%Joana%Évelyn%');

    await supabase
      .from('redacoes_simulado')
      .update({ email_aluno: 'lucasfreitas@laboratoriodoredator.com' })
      .ilike('nome_aluno', '%Lucas%Julião%');

    console.log('🎉 Processo de vinculação de redações antigas concluído!');
    return true;

  } catch (error) {
    console.error('💥 Erro geral na vinculação de redações antigas:', error);
    return false;
  }
};
