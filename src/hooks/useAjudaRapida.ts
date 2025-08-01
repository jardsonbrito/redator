import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Mensagem {
  id: string;
  aluno_id: string;
  corretor_id: string;
  mensagem: string;
  autor: 'aluno' | 'corretor';
  criado_em: string;
  lida: boolean;
  editada: boolean;
  editada_em: string | null;
}

export interface Conversa {
  aluno_id: string;
  corretor_id: string;
  aluno_nome: string;
  corretor_nome: string;
  ultima_mensagem: string;
  ultima_data: string;
  mensagens_nao_lidas: number;
  eh_respondida: boolean;
}

export const useAjudaRapida = () => {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Buscar perfil do aluno por email para obter UUID
  const buscarPerfilAluno = async (email: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nome, sobrenome')
      .eq('email', email)
      .eq('user_type', 'aluno')
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar perfil do aluno:', error);
      return null;
    }
    return data;
  };

  const buscarConversasAluno = async (alunoEmail: string) => {
    try {
      setLoading(true);
      console.log('🔍 Buscando conversas para email:', alunoEmail);

      // Primeiro, buscar o perfil do aluno pelo email para obter o UUID
      const perfilAluno = await buscarPerfilAluno(alunoEmail);
      
      if (!perfilAluno) {
        console.log('ℹ️ Perfil não encontrado - usuário pode não ter conversas ainda');
        // ETAPA 3: Não mostrar erro se usuário simplesmente não tem conversas
        setConversas([]);
        return;
      }

      console.log('✅ Perfil encontrado:', perfilAluno);

      const { data, error } = await supabase
        .from('ajuda_rapida_mensagens')
        .select(`
          aluno_id,
          corretor_id,
          mensagem,
          criado_em,
          corretores(nome_completo)
        `)
        .eq('aluno_id', perfilAluno.id)
        .order('criado_em', { ascending: false });

      if (error) throw error;

      console.log('📬 Mensagens encontradas:', data?.length || 0);

      // Agrupar por corretor e pegar a última mensagem de cada
      const conversasMap = new Map<string, Conversa>();
      
      data?.forEach((msg: any) => {
        const key = msg.corretor_id;
        if (!conversasMap.has(key)) {
          conversasMap.set(key, {
            aluno_id: msg.aluno_id,
            corretor_id: msg.corretor_id,
            aluno_nome: `${perfilAluno.nome} ${perfilAluno.sobrenome || ''}`.trim(),
            corretor_nome: msg.corretores?.nome_completo || 'Corretor',
            ultima_mensagem: msg.mensagem,
            ultima_data: msg.criado_em,
            mensagens_nao_lidas: 0,
            eh_respondida: false
          });
        }
      });

      setConversas(Array.from(conversasMap.values()));
      console.log('✅ Conversas carregadas:', conversasMap.size);
    } catch (error) {
      console.error('❌ Erro ao buscar conversas:', error);
      // ETAPA 3: Só mostrar erro toast se for erro real (não falta de dados)
      if (!error.message?.includes('not found')) {
        toast({
          title: "Erro",
          description: "Não foi possível carregar as conversas",
          variant: "destructive"
        });
      }
      setConversas([]); // Garantir lista vazia em caso de erro
    } finally {
      setLoading(false);
    }
  };

  // Buscar conversas do corretor
  const buscarConversasCorretor = async (corretorId: string) => {
    try {
      setLoading(true);
      console.log('🔍 Buscando conversas para corretor ID:', corretorId);
      
      const { data, error } = await supabase
        .from('ajuda_rapida_mensagens')
        .select(`
          aluno_id,
          corretor_id,
          mensagem,
          criado_em,
          autor,
          lida
        `)
        .eq('corretor_id', corretorId)
        .order('criado_em', { ascending: false });

      if (error) {
        console.error('❌ Erro na query de mensagens:', error);
        throw error;
      }

      console.log('📦 Mensagens encontradas:', data?.length || 0);

      // Buscar perfis dos alunos separadamente
      const alunoIds = [...new Set(data?.map(msg => msg.aluno_id) || [])];
      console.log('👥 IDs de alunos únicos:', alunoIds);
      
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, nome, sobrenome')
        .in('id', alunoIds);

      if (profileError) {
        console.error('❌ Erro ao buscar perfis:', profileError);
        throw profileError;
      }

      console.log('👤 Perfis encontrados:', profiles?.length || 0);

      // Criar mapa de perfis para acesso rápido
      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Agrupar por aluno
      const conversasMap = new Map<string, Conversa>();
      
      data?.forEach((msg: any) => {
        const key = msg.aluno_id;
        const perfil = profilesMap.get(msg.aluno_id);
        const nomeCompleto = perfil ? `${perfil.nome} ${perfil.sobrenome || ''}`.trim() : 'Aluno';
        
        if (!conversasMap.has(key)) {
          conversasMap.set(key, {
            aluno_id: msg.aluno_id,
            corretor_id: msg.corretor_id,
            aluno_nome: nomeCompleto,
            corretor_nome: '',
            ultima_mensagem: msg.mensagem,
            ultima_data: msg.criado_em,
            mensagens_nao_lidas: 0,
            eh_respondida: false
          });
        }
        
        // Contar mensagens não lidas (do aluno para o corretor)
        if (msg.autor === 'aluno' && !msg.lida) {
          const conversa = conversasMap.get(key)!;
          conversa.mensagens_nao_lidas++;
        }
      });

      // Verificar se há resposta do corretor para marcar como respondida
      data?.forEach((msg: any) => {
        if (msg.autor === 'corretor') {
          const conversa = conversasMap.get(msg.aluno_id);
          if (conversa) {
            conversa.eh_respondida = true;
          }
        }
      });

      const conversasArray = Array.from(conversasMap.values());
      console.log('✅ Conversas processadas:', conversasArray.length);
      setConversas(conversasArray);
    } catch (error) {
      console.error('Erro ao buscar conversas do corretor:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as conversas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Buscar mensagens de uma conversa específica
  const buscarMensagensConversa = async (alunoIdOrEmail: string, corretorId: string) => {
    try {
      setLoading(true);
      console.log('🔍 Buscando mensagens para:', { alunoIdOrEmail, corretorId });

      // Se alunoIdOrEmail parece ser um email, converter para UUID
      let alunoId = alunoIdOrEmail;
      if (alunoIdOrEmail.includes('@')) {
        const perfilAluno = await buscarPerfilAluno(alunoIdOrEmail);
        if (!perfilAluno) {
          console.log('ℹ️ Perfil do aluno não encontrado - conversas vazias');
          setMensagens([]);
          return;
        }
        alunoId = perfilAluno.id;
      }

      const { data, error } = await supabase
        .from('ajuda_rapida_mensagens')
        .select('*')
        .eq('aluno_id', alunoId)
        .eq('corretor_id', corretorId)
        .order('criado_em', { ascending: true });

      if (error) throw error;
      
      setMensagens(data || []);
      console.log('✅ Mensagens carregadas:', data?.length || 0);
    } catch (error) {
      console.error('❌ Erro ao buscar mensagens:', error);
      // ETAPA 3: Só mostrar erro se for erro real de sistema
      setMensagens([]);
    } finally {
      setLoading(false);
    }
  };

  // Enviar mensagem
  const enviarMensagem = async (
    alunoEmail: string, 
    corretorId: string, 
    mensagem: string, 
    autor: 'aluno' | 'corretor'
  ) => {
    try {
      console.log('📤 Enviando mensagem...', { alunoEmail, corretorId, mensagem, autor });
      
      // Se for aluno, precisamos converter email para UUID
      let alunoId = alunoEmail;
      if (autor === 'aluno') {
        const perfilAluno = await buscarPerfilAluno(alunoEmail);
        
        if (!perfilAluno) {
          console.error('❌ Perfil do aluno não encontrado para envio');
          throw new Error('Perfil do aluno não encontrado');
        }
        
        alunoId = perfilAluno.id;
        console.log('✅ UUID do aluno:', alunoId);
      }

      const { error } = await supabase
        .from('ajuda_rapida_mensagens')
        .insert({
          aluno_id: alunoId,
          corretor_id: corretorId,
          mensagem,
          autor,
          lida: autor === 'corretor' // Se o corretor envia, marca como lida automaticamente
        });

      if (error) {
        console.error('❌ Erro detalhado ao inserir:', error);
        throw error;
      }

      console.log('✅ Mensagem enviada com sucesso');

      // Recarregar mensagens da conversa
      await buscarMensagensConversa(alunoId, corretorId);
      
      // Toast removido conforme solicitado - mensagem aparece automaticamente no chat
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar a mensagem",
        variant: "destructive"
      });
    }
  };

  // Marcar conversa como lida (para corretor)
  const marcarComoLida = async (alunoId: string, corretorId: string) => {
    try {
      const { error } = await supabase.rpc('marcar_conversa_como_lida', {
        p_aluno_id: alunoId,
        p_corretor_id: corretorId
      });

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
    }
  };

  // Buscar número de mensagens não lidas para corretor
  const buscarMensagensNaoLidas = async (corretorEmail: string) => {
    try {
      const { data, error } = await supabase.rpc('contar_mensagens_nao_lidas_corretor', {
        corretor_email: corretorEmail
      });

      if (error) throw error;
      return data || 0;
    } catch (error) {
      console.error('Erro ao buscar mensagens não lidas:', error);
      return 0;
    }
  };

  // Buscar número de mensagens não lidas para aluno
  const buscarMensagensNaoLidasAluno = async (alunoEmail: string) => {
    try {
      console.log('🔍 Hook - Buscando mensagens não lidas para aluno:', alunoEmail);
      const { data, error } = await supabase.rpc('contar_mensagens_nao_lidas_aluno', {
        aluno_email: alunoEmail
      });

      if (error) {
        console.error('❌ Hook - Erro ao buscar mensagens não lidas:', error);
        throw error;
      }
      console.log('✅ Hook - Resultado:', data);
      return data || 0;
    } catch (error) {
      console.error('Erro ao buscar mensagens não lidas do aluno:', error);
      return 0;
    }
  };

  // Marcar mensagens como lidas para aluno
  const marcarComoLidaAluno = async (alunoEmail: string, corretorId: string) => {
    try {
      const perfilAluno = await buscarPerfilAluno(alunoEmail);
      if (!perfilAluno) return;

      const { error } = await supabase
        .from('ajuda_rapida_mensagens')
        .update({ lida: true })
        .eq('aluno_id', perfilAluno.id)
        .eq('corretor_id', corretorId)
        .eq('autor', 'corretor')
        .eq('lida', false);

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao marcar mensagens como lidas para aluno:', error);
    }
  };

  // Buscar todas as conversas para admin
  const buscarTodasConversas = async () => {
    try {
      // Buscar todas as mensagens
      const { data: mensagens, error } = await supabase
        .from('ajuda_rapida_mensagens')
        .select('*')
        .order('criado_em', { ascending: false });

      if (error) throw error;

      // Buscar IDs únicos de alunos e corretores
      const alunoIds = [...new Set(mensagens?.map(m => m.aluno_id) || [])];
      const corretorIds = [...new Set(mensagens?.map(m => m.corretor_id) || [])];

      // Buscar perfis dos alunos
      const { data: alunos, error: alunosError } = await supabase
        .from('profiles')
        .select('id, nome, sobrenome')
        .in('id', alunoIds);

      if (alunosError) throw alunosError;

      // Buscar perfis dos corretores
      const { data: corretores, error: corretoresError } = await supabase
        .from('corretores')
        .select('id, nome_completo')
        .in('id', corretorIds);

      if (corretoresError) throw corretoresError;

      // Criar mapas para acesso rápido
      const alunosMap = new Map(alunos?.map(a => [a.id, `${a.nome} ${a.sobrenome || ''}`.trim()]) || []);
      const corretoresMap = new Map(corretores?.map(c => [c.id, c.nome_completo]) || []);

      // Agrupar mensagens por conversa
      const conversasMap = new Map();
      
      mensagens?.forEach((mensagem) => {
        const chaveConversa = `${mensagem.aluno_id}-${mensagem.corretor_id}`;
        
        if (!conversasMap.has(chaveConversa)) {
          conversasMap.set(chaveConversa, {
            aluno_id: mensagem.aluno_id,
            corretor_id: mensagem.corretor_id,
            aluno_nome: alunosMap.get(mensagem.aluno_id) || 'Aluno',
            corretor_nome: corretoresMap.get(mensagem.corretor_id) || 'Corretor',
            ultima_mensagem: mensagem.mensagem,
            ultima_data: mensagem.criado_em,
            total_mensagens: 1,
          });
        } else {
          const conversa = conversasMap.get(chaveConversa);
          conversa.total_mensagens++;
          // Manter a mensagem mais recente como última mensagem
          if (new Date(mensagem.criado_em) > new Date(conversa.ultima_data)) {
            conversa.ultima_mensagem = mensagem.mensagem;
            conversa.ultima_data = mensagem.criado_em;
          }
        }
      });

      return Array.from(conversasMap.values()).sort((a, b) => 
        new Date(b.ultima_data).getTime() - new Date(a.ultima_data).getTime()
      );
    } catch (error) {
      console.error('Erro ao buscar todas as conversas:', error);
      throw error;
    }
  };

  // Editar mensagem
  const editarMensagem = async (mensagemId: string, novoTexto: string) => {
    try {
      const { error } = await supabase
        .from('ajuda_rapida_mensagens')
        .update({
          mensagem: novoTexto,
          editada: true,
          editada_em: new Date().toISOString()
        })
        .eq('id', mensagemId);

      if (error) throw error;
      
      // Atualizar o estado local das mensagens
      setMensagens(mensagensAtuais => 
        mensagensAtuais.map(msg => 
          msg.id === mensagemId 
            ? { 
                ...msg, 
                mensagem: novoTexto, 
                editada: true, 
                editada_em: new Date().toISOString() 
              }
            : msg
        )
      );
      
      console.log('✅ Mensagem editada com sucesso');
    } catch (error) {
      console.error('❌ Erro ao editar mensagem:', error);
      toast({
        title: "Erro",
        description: "Não foi possível editar a mensagem",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Apagar mensagem
  const apagarMensagem = async (mensagemId: string) => {
    try {
      const { error } = await supabase
        .from('ajuda_rapida_mensagens')
        .delete()
        .eq('id', mensagemId);

      if (error) throw error;
      
      console.log('✅ Mensagem apagada com sucesso');
    } catch (error) {
      console.error('❌ Erro ao apagar mensagem:', error);
      toast({
        title: "Erro",
        description: "Não foi possível apagar a mensagem",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Deletar conversa (hard delete)
  const deletarConversa = async (alunoId: string, corretorId: string) => {
    try {
      const { error } = await supabase
        .from('ajuda_rapida_mensagens')
        .delete()
        .eq('aluno_id', alunoId)
        .eq('corretor_id', corretorId);

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao deletar conversa:', error);
      throw error;
    }
  };

  return {
    mensagens,
    conversas,
    loading,
    buscarConversasAluno,
    buscarConversasCorretor,
    buscarMensagensConversa,
    enviarMensagem,
    editarMensagem,
    apagarMensagem,
    marcarComoLida,
    marcarComoLidaAluno,
    buscarMensagensNaoLidas,
    buscarMensagensNaoLidasAluno,
    buscarTodasConversas,
    deletarConversa,
  };
};
