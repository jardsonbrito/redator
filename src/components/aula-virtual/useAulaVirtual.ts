import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { parseISO, addHours } from "date-fns";
import { AulaVirtual, RegistroPresenca } from "./types";

export const useAulaVirtual = (turmaCode: string) => {
  const [registrosPresenca, setRegistrosPresenca] = useState<RegistroPresenca[]>([]);

  const { data: aulaAtiva, isLoading } = useQuery({
    queryKey: ['aula-virtual-ativa', turmaCode],
    queryFn: async () => {
      try {
        const agora = new Date();
        const dataAtual = agora.toISOString().split('T')[0];

        console.log('Buscando aula virtual ativa para turma:', turmaCode);

        let query = supabase
          .from('aulas_virtuais')
          .select('*')
          .eq('ativo', true)
          .gte('data_aula', dataAtual)
          .order('data_aula', { ascending: true });

        // Filtrar por turma ou visitante
        if (turmaCode === "Visitante") {
          console.log('Filtrando aulas para visitante...');
          // Para visitantes, buscar aulas que permitem visitantes
          query = query.eq('permite_visitante', true);
        } else {
          console.log('Filtrando aulas para turma:', turmaCode);
          // Para alunos, buscar por turma específica
          query = query.contains('turmas_autorizadas', [turmaCode]);
        }
        
        const { data, error } = await query.limit(1);
        
        if (error) {
          console.error('Erro ao buscar aula virtual:', error);
          return null;
        }
        
        if (!data || data.length === 0) {
          console.log('Nenhuma aula virtual ativa encontrada para:', turmaCode);
          return null;
        }

        const aula = data[0];
        console.log('Aula virtual encontrada:', aula);

        // Verifica se a aula ainda está no período de exibição (até 1h após o fim)
        const fimAula = parseISO(`${aula.data_aula}T${aula.horario_fim}`);
        const fimEstendido = addHours(fimAula, 1);
        
        if (agora > fimEstendido) {
          console.log('Aula virtual já encerrada há mais de 1h, não será exibida');
          return null;
        }

        return aula as AulaVirtual;
      } catch (error) {
        console.error('Erro na busca de aula virtual:', error);
        return null;
      }
    },
    refetchInterval: 2000, // Verificar a cada 2 segundos para mudança automática de status
    retry: 2,
    staleTime: 0,
  });

  return {
    aulaAtiva,
    isLoading,
    registrosPresenca,
    setRegistrosPresenca
  };
};