
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { RegistroPresenca } from "./types";

export const usePresenca = (registrosPresenca: RegistroPresenca[], setRegistrosPresenca: (registros: RegistroPresenca[]) => void) => {
  const { studentData } = useStudentAuth();
  const [openDialog, setOpenDialog] = useState<{tipo: 'entrada' | 'saida', aulaId: string} | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    sobrenome: ""
  });

  // Buscar registros ao inicializar o hook
  useEffect(() => {
    fetchRegistrosPresenca();
  }, [studentData]);

  const fetchRegistrosPresenca = async () => {
    try {
      // Para visitantes, usar email se disponível, senão usar um identificador temporário
      let email = 'email_nao_disponivel';
      let alunoId = null;
      
      if (studentData.userType === 'visitante' && studentData.visitanteInfo?.email) {
        email = studentData.visitanteInfo.email;
      } else if (studentData.userType === 'aluno') {
        email = 'aluno@exemplo.com'; // Placeholder para alunos
      }

      // Buscar o ID do aluno pelo email
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (profile) {
        alunoId = profile.id;
      }

      if (!alunoId) {
        console.warn('Aluno não encontrado para buscar registros de presença');
        setRegistrosPresenca([]);
        return;
      }

      const { data, error } = await (supabase as any)
        .from('presenca_aulas')
        .select('*')
        .or(`aluno_id.eq.${alunoId},email_aluno.eq.${email}`);

      if (error) throw error;
      
      // Transformar dados para o formato esperado
      const transformedData = (data || []).map((record: any) => ({
        aula_id: record.aula_id,
        aluno_id: record.aluno_id || alunoId,
        entrada_at: record.entrada_at || null,
        saida_at: record.saida_at || null
      }));
      
      setRegistrosPresenca(transformedData as RegistroPresenca[]);
    } catch (error: any) {
      console.error('Erro ao buscar registros de presença:', error);
    }
  };

  const registrarPresenca = async (tipo: 'entrada' | 'saida', aulaId: string) => {
    if (!formData.nome.trim() || !formData.sobrenome.trim()) {
      toast.error("Preencha nome e sobrenome");
      return;
    }

    try {
      const email = studentData.userType === 'visitante' 
        ? studentData.visitanteInfo?.email || 'visitante@exemplo.com'
        : 'aluno@exemplo.com';
      
      const turma = studentData.userType === 'visitante' ? 'visitante' : studentData.turma;

      // Buscar ou criar o perfil do aluno
      let alunoId;
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (profile) {
        alunoId = profile.id;
      } else {
        // Criar perfil se não existir
        const newId = crypto.randomUUID();
        const { data: newProfile, error: profileError } = await supabase
          .from('profiles')
          .insert([{
            id: newId,
            nome: formData.nome.trim(),
            sobrenome: formData.sobrenome.trim(),
            email: email,
            turma: turma,
            user_type: 'aluno'
          }])
          .select('id')
          .single();
        
        if (profileError) throw profileError;
        alunoId = newProfile.id;
      }

      if (tipo === 'entrada') {
        // Registrar entrada usando upsert
        const agora = new Date().toISOString();
        
        const { error } = await (supabase as any)
          .from('presenca_aulas')
          .upsert({
            aula_id: aulaId,
            aluno_id: alunoId,
            nome_aluno: formData.nome.trim(),
            sobrenome_aluno: formData.sobrenome.trim(),
            email_aluno: email,
            turma: turma,
            entrada_at: agora,
            data_registro: agora,
            tipo_registro: 'entrada'
          }, {
            onConflict: 'aula_id,aluno_id'
          });

        if (error) {
          console.error('Erro ao registrar entrada:', error);
          toast.error('Erro ao registrar entrada');
          return;
        }
      } else {
        // Registrar saída 
        const agora = new Date().toISOString();
        
        // Primeiro verificar se existe entrada
        const { data: existingRecords } = await (supabase as any)
          .from('presenca_aulas')
          .select('*')
          .eq('aula_id', aulaId)
          .eq('aluno_id', alunoId);

        const existingRecord = existingRecords?.[0] as any;
        if (!existingRecord || !(existingRecord as any).entrada_at) {
          toast.error('Entrada não registrada. Registre a entrada primeiro.');
          return;
        }

        if ((existingRecord as any).saida_at) {
          toast.error('Saída já registrada.');
          return;
        }

        // Atualizar com saída
        const { error } = await (supabase as any)
          .from('presenca_aulas')
          .update({ saida_at: agora })
          .eq('id', existingRecord.id);

        if (error) {
          console.error('Erro ao registrar saída:', error);
          toast.error('Erro ao registrar saída');
          return;
        }
      }

      toast.success(`${tipo === 'entrada' ? 'Entrada' : 'Saída'} registrada com sucesso!`);
      setOpenDialog(null);
      setFormData({ nome: "", sobrenome: "" });
      fetchRegistrosPresenca();
    } catch (error: any) {
      console.error('Erro ao registrar presença:', error);
      toast.error('Erro ao registrar presença');
    }
  };

  const jaRegistrou = (aulaId: string, tipo: 'entrada' | 'saida') => {
    const registro = registrosPresenca.find(r => r.aula_id === aulaId);
    if (!registro) return false;
    
    if (tipo === 'entrada') {
      return !!registro.entrada_at;
    } else {
      return !!registro.saida_at;
    }
  };

  const openPresencaDialog = (tipo: 'entrada' | 'saida', aulaId: string) => {
    setFormData({
      nome: studentData.nomeUsuario.split(' ')[0] || "",
      sobrenome: studentData.nomeUsuario.split(' ').slice(1).join(' ') || ""
    });
    setOpenDialog({ tipo, aulaId });
  };

  return {
    openDialog,
    setOpenDialog,
    formData,
    setFormData,
    fetchRegistrosPresenca,
    registrarPresenca,
    jaRegistrou,
    openPresencaDialog
  };
};
