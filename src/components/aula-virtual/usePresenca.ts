
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

      const { data, error } = await supabase
        .from('presenca_aulas')
        .select('*')
        .eq('email_aluno', email);

      if (error) throw error;
      
      // Agrupar registros por aula_id e combinar entrada/saída
      const aulaMap = new Map<string, RegistroPresenca>();
      
      (data || []).forEach((record: any) => {
        const aulaId = record.aula_id;
        if (!aulaMap.has(aulaId)) {
          aulaMap.set(aulaId, {
            aula_id: aulaId,
            aluno_id: alunoId || record.aluno_id,
            entrada_at: null,
            saida_at: null
          });
        }
        
        const existing = aulaMap.get(aulaId)!;
        if (record.tipo_registro === 'entrada') {
          existing.entrada_at = record.data_registro;
        } else if (record.tipo_registro === 'saida') {
          existing.saida_at = record.data_registro;
        }
      });
      
      setRegistrosPresenca(Array.from(aulaMap.values()));
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
        // Registrar entrada
        const { error } = await supabase
          .from('presenca_aulas')
          .insert({
            aula_id: aulaId,
            nome_aluno: formData.nome.trim(),
            sobrenome_aluno: formData.sobrenome.trim(),
            email_aluno: email,
            turma: turma,
            data_registro: new Date().toISOString(),
            tipo_registro: 'entrada'
          });

        if (error) {
          console.error('Erro ao registrar entrada:', error);
          toast.error('Erro ao registrar entrada');
          return;
        }
      } else {
        // Verificar se existe entrada primeiro
        const { data: existingEntrada } = await supabase
          .from('presenca_aulas')
          .select('*')
          .eq('aula_id', aulaId)
          .eq('email_aluno', email)
          .eq('tipo_registro', 'entrada')
          .single();

        if (!existingEntrada) {
          toast.error('Entrada não registrada. Registre a entrada primeiro.');
          return;
        }

        // Verificar se já tem saída
        const { data: existingSaida } = await supabase
          .from('presenca_aulas')
          .select('*')
          .eq('aula_id', aulaId)
          .eq('email_aluno', email)
          .eq('tipo_registro', 'saida')
          .single();

        if (existingSaida) {
          toast.error('Saída já registrada.');
          return;
        }

        // Registrar saída
        const { error } = await supabase
          .from('presenca_aulas')
          .insert({
            aula_id: aulaId,
            nome_aluno: formData.nome.trim(),
            sobrenome_aluno: formData.sobrenome.trim(),
            email_aluno: email,
            turma: turma,
            data_registro: new Date().toISOString(),
            tipo_registro: 'saida'
          });

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
