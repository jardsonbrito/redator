import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStudentAuth } from "./useStudentAuth";
import { 
  verificarPermissaoMaterial, 
  criarUsuarioBiblioteca, 
  type MaterialBiblioteca 
} from "@/utils/bibliotecaPermissions";

export const useBibliotecaData = (busca: string, categoriaFiltro: string) => {
  const { studentData } = useStudentAuth();
  
  // Determina a turma do usuário
  let turmaCode = "Visitante";
  if (studentData.userType === "aluno" && studentData.turma) {
    turmaCode = studentData.turma;
  }

  const usuario = criarUsuarioBiblioteca(turmaCode);

  const { data: materiais, isLoading, error } = useQuery({
    queryKey: ['biblioteca-materiais-filtrados', turmaCode, busca, categoriaFiltro],
    queryFn: async () => {
      try {
        let query = supabase
          .from('biblioteca_materiais')
          .select(`
            *,
            categorias (
              id,
              nome,
              slug
            )
          `)
          .eq('status', 'publicado')
          .order('data_publicacao', { ascending: false });

        // Aplica filtros de busca
        if (busca) {
          query = query.or(`titulo.ilike.%${busca}%,descricao.ilike.%${busca}%`);
        }

        if (categoriaFiltro && categoriaFiltro !== "todas") {
          query = query.eq('categoria_id', categoriaFiltro);
        }
        
        const { data, error } = await query;
        
        if (error) {
          console.error('Database error:', error);
          throw error;
        }
        
        // Filtrar materiais usando a lógica centralizada de permissões
        console.log('=== ANTES DO FILTRO DE PERMISSÕES ===');
        console.log('Total materiais da query:', data?.length || 0);
        
        const materiaisPermitidos = (data || []).filter((material) => {
          const podeAcessar = verificarPermissaoMaterial(material as MaterialBiblioteca, usuario);
          return podeAcessar;
        });
        
        console.log('=== BIBLIOTECA DATA DEBUG FINAL ===');
        console.log('Turma Code:', turmaCode);
        console.log('Usuario:', usuario);
        console.log('Total materiais encontrados na query:', data?.length || 0);
        console.log('Materiais após filtro de permissão:', materiaisPermitidos.length);
        console.log('Lista de materiais permitidos:', materiaisPermitidos.map(m => m.titulo));
        
        return materiaisPermitidos;
      } catch (error) {
        console.error('Query error:', error);
        throw error;
      }
    }
  });

  return {
    materiais,
    isLoading,
    error,
    turmaCode,
    usuario
  };
};