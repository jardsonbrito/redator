
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Users, AlertCircle } from "lucide-react";
import { normalizeTurmaToLetter } from "@/utils/turmaUtils";

interface Corretor {
  id: string;
  nome_completo: string;
  email: string;
  turmas_autorizadas: string[] | null;
}

interface CorretorSelectorProps {
  selectedCorretores: string[];
  onCorretoresChange: (corretores: string[]) => void;
  isSimulado?: boolean;
  required?: boolean;
  maxCorretores?: number; // Limite máximo de corretores
  turmaAluno?: string; // Turma do aluno para filtrar corretores
}

export const CorretorSelector = ({
  selectedCorretores,
  onCorretoresChange,
  isSimulado = false,
  required = false,
  maxCorretores,
  turmaAluno
}: CorretorSelectorProps) => {
  const [corretores, setCorretores] = useState<Corretor[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  console.log('🎯 CorretorSelector RENDERIZADO - turmaAluno:', turmaAluno);

  useEffect(() => {
    console.log('🔄 useEffect DISPARADO - turmaAluno mudou para:', turmaAluno);
    fetchCorretores();
  }, [turmaAluno]);

  const fetchCorretores = async () => {
    console.log('═══════════════════════════════════════════════════════');
    console.log('🚀 INICIANDO BUSCA DE CORRETORES');
    console.log('═══════════════════════════════════════════════════════');

    try {
      const { data, error } = await supabase
        .from('corretores')
        .select('id, nome_completo, email, turmas_autorizadas')
        .eq('ativo', true)
        .eq('visivel_no_formulario', true)
        .order('nome_completo');

      if (error) throw error;

      console.log('📦 DADOS RECEBIDOS DO BANCO:', data);
      console.log('👤 TURMA DO ALUNO (original):', turmaAluno);
      console.log('🔤 TIPO DA TURMA:', typeof turmaAluno);

      // Filtrar corretores baseado na turma do aluno
      let corretoresFiltrados = data || [];

      if (turmaAluno) {
        // Normalizar a turma do aluno usando a função do turmaUtils
        // Isso converte "Turma A", "TURMA A", "A" -> "A"
        const turmaNormalizada = normalizeTurmaToLetter(turmaAluno);
        console.log('✨ TURMA NORMALIZADA (extraída):', turmaNormalizada);

        if (!turmaNormalizada) {
          console.log('⚠️ Turma do aluno inválida, mostrando todos os corretores');
        } else {
          corretoresFiltrados = corretoresFiltrados.filter(corretor => {
            // Se turmas_autorizadas é null, o corretor está disponível para todas as turmas
            if (!corretor.turmas_autorizadas || corretor.turmas_autorizadas.length === 0) {
              console.log(`✅ ${corretor.nome_completo} - Disponível para todas as turmas (null/vazio)`);
              return true;
            }

            // Normalizar as turmas autorizadas usando a mesma função
            const turmasNormalizadas = corretor.turmas_autorizadas
              .map(t => normalizeTurmaToLetter(t))
              .filter(Boolean);

            console.log(`🔍 ${corretor.nome_completo}:`);
            console.log(`   - Turmas autorizadas (original):`, corretor.turmas_autorizadas);
            console.log(`   - Turmas autorizadas (normalizado):`, turmasNormalizadas);
            console.log(`   - Turma do aluno (normalizada): "${turmaNormalizada}"`);

            // Verificar se a turma do aluno está nas turmas autorizadas
            const incluido = turmasNormalizadas.includes(turmaNormalizada);
            console.log(`   - ${incluido ? '✅ INCLUÍDO' : '❌ EXCLUÍDO'}`);

            return incluido;
          });
        }
      }

      console.log('🔍 DEBUG CorretorSelector - Corretores filtrados:', corretoresFiltrados);
      setCorretores(corretoresFiltrados);
    } catch (error: any) {
      console.error('Erro ao buscar corretores:', error);
      toast({
        title: "Erro ao carregar corretores",
        description: "Não foi possível carregar a lista de corretores.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCorretorToggle = (corretorId: string, checked: boolean) => {
    let newSelected = [...selectedCorretores];

    if (checked) {
      // Definir limite baseado nas props
      const limite = isSimulado ? 2 : (maxCorretores || 2);
      
      if (newSelected.length >= limite) {
        const tipoEnvio = isSimulado ? "Simulados" : "Envios regulares";
        const limiteTexto = limite === 1 ? "apenas 1 corretor" : `exatamente ${limite} corretores`;
        toast({
          title: "Limite excedido",
          description: `${tipoEnvio} podem selecionar ${limiteTexto}.`,
          variant: "destructive"
        });
        return;
      }
      newSelected.push(corretorId);
    } else {
      newSelected = newSelected.filter(id => id !== corretorId);
    }

    onCorretoresChange(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    const limite = maxCorretores || 2;
    
    if (isSimulado || limite === 1) {
      const tipoEnvio = isSimulado ? "simulados" : "envios regulares";
      const limiteTexto = limite === 1 ? "apenas 1 corretor" : `exatamente ${limite} corretores`;
      toast({
        title: "Não disponível",
        description: `${tipoEnvio} requerem ${limiteTexto}.`,
        variant: "destructive"
      });
      return;
    }

    if (checked) {
      onCorretoresChange(corretores.map(c => c.id));
    } else {
      onCorretoresChange([]);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Seleção de Corretores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando corretores...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Selecione os corretores {required && <span className="text-red-500">*</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {(isSimulado || maxCorretores === 1) && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {isSimulado ? (
                <><strong>Simulado:</strong> É obrigatório selecionar exatamente 2 corretores.</>
              ) : maxCorretores === 1 ? (
                <><strong>Envio regular:</strong> É obrigatório selecionar apenas 1 corretor.</>
              ) : null}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          {!isSimulado && maxCorretores !== 1 && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all-corretores"
                checked={selectedCorretores.length === corretores.length && corretores.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <Label htmlFor="select-all-corretores" className="font-medium">
                Selecionar todos os corretores
              </Label>
            </div>
          )}
          
          <div className="grid grid-cols-1 gap-3">
            {corretores.map((corretor) => (
              <div key={corretor.id} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
                <Checkbox
                  id={`corretor-${corretor.id}`}
                  checked={selectedCorretores.includes(corretor.id)}
                  onCheckedChange={(checked) => 
                    handleCorretorToggle(corretor.id, checked === true)
                  }
                />
                <Label 
                  htmlFor={`corretor-${corretor.id}`}
                  className="flex-1 cursor-pointer"
                >
                  <div>
                    <p className="font-medium">{corretor.nome_completo}</p>
                  </div>
                </Label>
              </div>
            ))}
          </div>

          {corretores.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Nenhum corretor ativo encontrado. Entre em contato com o administrador.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          <p>Corretores selecionados: {selectedCorretores.length}/{maxCorretores || corretores.length}</p>
        </div>
      </CardContent>
    </Card>
  );
};
