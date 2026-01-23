import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Check, ExternalLink, Loader2 } from "lucide-react";
import { TURMAS_VALIDAS, TurmaLetra, getTurmaColorClasses } from "@/utils/turmaUtils";

interface AlunoSelfServiceProps {
  onSuccess: () => void;
}

type TurmasConfig = Record<string, boolean>;

const LinkBlock = ({
  title,
  link,
  onCopy,
  onOpen,
  copied,
}: {
  title: string;
  link: string;
  onCopy: () => void;
  onOpen: () => void;
  copied: boolean;
}) => (
  <Card className="flex-1">
    <CardHeader className="pb-3">
      <CardTitle className="text-lg">{title}</CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={link}
          readOnly
          className="flex-1"
        />
        <Button
          onClick={onCopy}
          variant="outline"
          size="icon"
          className="shrink-0"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-600" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </Button>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={onCopy}
          className="flex-1"
          variant="default"
        >
          <Copy className="w-4 h-4 mr-2" />
          Copiar Link
        </Button>
        <Button
          onClick={onOpen}
          variant="outline"
          className="flex-1"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Abrir Link
        </Button>
      </div>
    </CardContent>
  </Card>
);

export const AlunoSelfService = ({ onSuccess }: AlunoSelfServiceProps) => {
  const [copiado1, setCopiado1] = useState(false);
  const [copiado2, setCopiado2] = useState(false);
  const [copiadoTurma, setCopiadoTurma] = useState<string | null>(null);
  const [turmasConfig, setTurmasConfig] = useState<TurmasConfig>({});
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingTurma, setSavingTurma] = useState<string | null>(null);
  const { toast } = useToast();

  // Links de autoatendimento
  const linkCadastro = `${window.location.origin}/cadastro-aluno`;
  const linkTrocaEmail = `${window.location.origin}/atualizar-email`;

  // Carregar configuração das turmas
  useEffect(() => {
    const carregarConfiguracao = async () => {
      try {
        const { data, error } = await supabase
          .from("configuracoes_sistema")
          .select("valor")
          .eq("chave", "autoatendimento_turmas")
          .maybeSingle();

        if (error) throw error;

        if (data?.valor) {
          setTurmasConfig(data.valor as TurmasConfig);
        } else {
          // Configuração padrão: todas habilitadas
          const configPadrao: TurmasConfig = {};
          TURMAS_VALIDAS.forEach(turma => {
            configPadrao[turma] = true;
          });
          setTurmasConfig(configPadrao);
        }
      } catch (error) {
        console.error("Erro ao carregar configuração:", error);
        // Em caso de erro, assume todas habilitadas
        const configPadrao: TurmasConfig = {};
        TURMAS_VALIDAS.forEach(turma => {
          configPadrao[turma] = true;
        });
        setTurmasConfig(configPadrao);
      } finally {
        setLoadingConfig(false);
      }
    };

    carregarConfiguracao();
  }, []);

  // Salvar configuração de uma turma
  const handleToggleTurma = async (turma: string, habilitado: boolean) => {
    setSavingTurma(turma);
    try {
      const novaConfig = {
        ...turmasConfig,
        [turma]: habilitado
      };

      const { error } = await supabase
        .from("configuracoes_sistema")
        .upsert({
          chave: "autoatendimento_turmas",
          valor: novaConfig,
          descricao: "Controla quais turmas têm o link de autoatendimento habilitado"
        }, {
          onConflict: "chave"
        });

      if (error) throw error;

      setTurmasConfig(novaConfig);
      toast({
        title: habilitado ? `Turma ${turma} habilitada` : `Turma ${turma} desabilitada`,
        description: habilitado
          ? `Alunos podem se cadastrar na Turma ${turma}.`
          : `Cadastro desativado para a Turma ${turma}.`
      });
    } catch (error: any) {
      console.error("Erro ao salvar configuração:", error);
      toast({
        title: "Erro ao salvar configuração",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    } finally {
      setSavingTurma(null);
    }
  };

  const handleCopiarLink = async (link: string, setCopied: (value: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast({
        title: "Link copiado!",
        description: "O link foi copiado para a área de transferência."
      });

      // Resetar o ícone após 2 segundos
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o link. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const handleCopiarLinkTurma = async (turma: string) => {
    const link = `${window.location.origin}/cadastro-aluno?turma=${turma}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiadoTurma(turma);
      toast({
        title: "Link copiado!",
        description: `Link de cadastro da Turma ${turma} copiado.`
      });

      setTimeout(() => {
        setCopiadoTurma(null);
      }, 2000);
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o link. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const handleAbrirLink = (link: string) => {
    window.open(link, '_blank');
  };

  // Contar turmas habilitadas
  const turmasHabilitadas = Object.values(turmasConfig).filter(Boolean).length;
  const totalTurmas = TURMAS_VALIDAS.length;

  return (
    <div className="space-y-4">
      {/* Configuração por turma */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Autoatendimento por Turma</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Habilite ou desabilite o cadastro de alunos para cada turma individualmente
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              {loadingConfig ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span className="font-medium">{turmasHabilitadas}/{totalTurmas} habilitadas</span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {TURMAS_VALIDAS.map((turma) => {
              const habilitado = turmasConfig[turma] ?? true;
              const isSaving = savingTurma === turma;
              const colorClasses = getTurmaColorClasses(turma);

              return (
                <div
                  key={turma}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    habilitado ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colorClasses}`}>
                      {turma}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleCopiarLinkTurma(turma)}
                      title={`Copiar link da Turma ${turma}`}
                      disabled={!habilitado}
                    >
                      {copiadoTurma === turma ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                  <div className="flex items-center gap-1">
                    {(loadingConfig || isSaving) && (
                      <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                    )}
                    <Switch
                      checked={habilitado}
                      onCheckedChange={(checked) => handleToggleTurma(turma, checked)}
                      disabled={loadingConfig || isSaving}
                      className="scale-75"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Links gerais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LinkBlock
          title="Link de Cadastro (Geral)"
          link={linkCadastro}
          onCopy={() => handleCopiarLink(linkCadastro, setCopiado1)}
          onOpen={() => handleAbrirLink(linkCadastro)}
          copied={copiado1}
        />

        <LinkBlock
          title="Link de Troca de E-mail"
          link={linkTrocaEmail}
          onCopy={() => handleCopiarLink(linkTrocaEmail, setCopiado2)}
          onOpen={() => handleAbrirLink(linkTrocaEmail)}
          copied={copiado2}
        />
      </div>
    </div>
  );
};
