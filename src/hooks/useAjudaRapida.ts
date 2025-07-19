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

  // Buscar conversas do aluno (usando email para obter UUID)
  const buscarConversasAluno = async (emailAluno: string) => {
    try {
      setLoading(true);
      
      // Primeiro buscar o UUID do aluno
      const perfilAluno = await buscarPerfilAluno(emailAluno);
      if (!perfilAluno) {
        toast({
          title: "Erro",
          description: "Aluno não encontrado",
          variant: "destructive",
        });
        return;
      }

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

      // Agrupar por corretor e pegar a última mensagem de cada
      const conversasMap = new Map<string, Conversa>();
      
      data?.forEach((msg: any) => {
        const key = msg.corretor_id;
        if (!conversasMap.has(key)) {
          conversasMap.set(key, {
            aluno_id: msg.aluno_id,
            corretor_id: msg.corretor_id,
            aluno_nome: `${perfilAluno.nome} ${perfilAluno.sobrenome}`.trim(),
            corretor_nome: msg.corretores?.nome_completo || 'Corretor',
            ultima_mensagem: msg.mensagem,
            ultima_data: msg.criado_em,
            mensagens_nao_lidas: 0,
            eh_respondida: false
          });
        }
      });

      setConversas(Array.from(conversasMap.values()));
    } catch (error) {
      console.error('Erro ao buscar conversas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as conversas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Buscar conversas do corretor
  const buscarConversasCorretor = async (corretorId: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('ajuda_rapida_mensagens')
        .select(`
          aluno_id,
          corretor_id,
          mensagem,
          criado_em,
          autor,
          lida,
          profiles!ajuda_rapida_mensagens_aluno_id_fkey(nome, sobrenome)
        `)
        .eq('corretor_id', corretorId)
        .order('criado_em', { ascending: false });

      if (error) throw error;

      // Agrupar por aluno
      const conversasMap = new Map<string, Conversa>();
      
      data?.forEach((msg: any) => {
        const key = msg.aluno_id;
        const nomeCompleto = `${msg.profiles?.nome || ''} ${msg.profiles?.sobrenome || ''}`.trim();
        
        if (!conversasMap.has(key)) {
          conversasMap.set(key, {
            aluno_id: msg.aluno_id,
            corretor_id: msg.corretor_id,
            aluno_nome: nomeCompleto || 'Aluno',
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

      setConversas(Array.from(conversasMap.values()));
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
  const buscarMensagensConversa = async (emailAlunoOuId: string, corretorId: string) => {
    try {
      setLoading(true);
      
      let alunoId = emailAlunoOuId;
      
      // Se parece com email, buscar o UUID
      if (emailAlunoOuId.includes('@')) {
        const perfilAluno = await buscarPerfilAluno(emailAlunoOuId);
        if (!perfilAluno) {
          toast({
            title: "Erro",
            description: "Aluno não encontrado",
            variant: "destructive",
          });
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
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as mensagens",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Enviar mensagem
  const enviarMensagem = async (
    emailAlunoOuId: string, 
    corretorId: string, 
    mensagem: string, 
    autor: 'aluno' | 'corretor'
  ) => {
    try {
      let alunoId = emailAlunoOuId;
      
      // Se parece com email, buscar o UUID
      if (emailAlunoOuId.includes('@')) {
        const perfilAluno = await buscarPerfilAluno(emailAlunoOuId);
        if (!perfilAluno) {
          toast({
            title: "Erro",
            description: "Aluno não encontrado",
            variant: "destructive",
          });
          return;
        }
        alunoId = perfilAluno.id;
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

      if (error) throw error;

      // Recarregar mensagens da conversa
      await buscarMensagensConversa(alunoId, corretorId);
      
      toast({
        title: "Sucesso",
        description: "Mensagem enviada!",
      });
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar a mensagem",
        variant: "destructive"
      });
    }
  };

  // Marcar conversa como lida (para corretor)
  const marcarComoLida = async (emailAlunoOuId: string, corretorId: string) => {
    try {
      let alunoId = emailAlunoOuId;
      
      // Se parece com email, buscar o UUID
      if (emailAlunoOuId.includes('@')) {
        const perfilAluno = await buscarPerfilAluno(emailAlunoOuId);
        if (!perfilAluno) return;
        alunoId = perfilAluno.id;
      }

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

  return {
    mensagens,
    conversas,
    loading,
    buscarConversasAluno,
    buscarConversasCorretor,
    buscarMensagensConversa,
    enviarMensagem,
    marcarComoLida,
    buscarMensagensNaoLidas
  };
};