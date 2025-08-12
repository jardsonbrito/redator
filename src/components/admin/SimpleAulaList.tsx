import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, ExternalLink, FileText, Edit } from "lucide-react";
import { AulaForm } from "./AulaForm";
import { UnifiedCard, UnifiedCardSkeleton, type BadgeTone } from "@/components/ui/unified-card";
import { resolveAulaCover } from "@/utils/coverUtils";

interface Aula {
  id: string;
  titulo: string;
  descricao: string | null;
  modulo: string;
  link_conteudo: string;
  pdf_url: string | null;
  pdf_nome: string | null;
  turmas_autorizadas: string[] | null;
  permite_visitante: boolean | null;
  ativo: boolean | null;
  criado_em: string | null;
  // Video metadata fields
  video_thumbnail_url?: string | null;
  platform?: string | null;
  video_id?: string | null;
  embed_url?: string | null;
  video_url_original?: string | null;
  cover_source?: string | null;
  cover_file_path?: string | null;
  cover_url?: string | null;
}

export const SimpleAulaList = () => {
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aulaEditando, setAulaEditando] = useState<Aula | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchAulas = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from("aulas")
        .select("*")
        .order("criado_em", { ascending: false });

      if (error) throw error;
      
      setAulas(data || []);
    } catch (err: any) {
      console.error("Erro ao buscar aulas:", err);
      setError(err.message || "Erro ao carregar aulas");
      toast.error("Erro ao carregar aulas");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta aula?")) return;

    try {
      const { error } = await supabase
        .from("aulas")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Aula excluída com sucesso!");
      fetchAulas();
    } catch (err: any) {
      console.error("Erro ao excluir aula:", err);
      toast.error("Erro ao excluir aula");
    }
  };

  const toggleAtivo = async (id: string, ativo: boolean | null) => {
    try {
      const { error } = await supabase
        .from("aulas")
        .update({ ativo: !ativo })
        .eq("id", id);

      if (error) throw error;

      toast.success(`Aula ${!ativo ? 'ativada' : 'desativada'} com sucesso!`);
      fetchAulas();
    } catch (err: any) {
      console.error("Erro ao alterar status:", err);
      toast.error("Erro ao alterar status da aula");
    }
  };

  const handleEdit = (aula: Aula) => {
    setAulaEditando(aula);
    setShowForm(true);
  };

  const handleCancelEdit = () => {
    setAulaEditando(null);
    setShowForm(false);
  };

  const handleSuccess = () => {
    setAulaEditando(null);
    setShowForm(false);
    fetchAulas();
  };

  useEffect(() => {
    fetchAulas();
  }, []);

if (isLoading) {
    return (
      <div className="space-y-4">
        <UnifiedCardSkeleton />
        <UnifiedCardSkeleton />
        <UnifiedCardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-red-500">Erro: {error}</p>
          <Button onClick={fetchAulas} className="mt-2">
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (showForm) {
    return (
      <div className="space-y-4">
        <AulaForm 
          aulaEditando={aulaEditando}
          onSuccess={handleSuccess}
          onCancelEdit={handleCancelEdit}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Aulas Cadastradas</h2>
        <div className="flex gap-2">
          <Button onClick={() => setShowForm(true)} variant="default" size="sm">
            Nova Aula
          </Button>
          <Button onClick={fetchAulas} variant="outline" size="sm">
            Atualizar
          </Button>
        </div>
      </div>

      {aulas.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">Nenhuma aula encontrada.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {aulas.map((aula) => {
            const coverUrl = resolveAulaCover(aula);
            const badges: { label: string; tone?: BadgeTone }[] = [];
            if (aula.modulo) badges.push({ label: aula.modulo, tone: 'primary' });
            if (aula.platform) badges.push({ label: aula.platform.toUpperCase(), tone: 'neutral' });
            badges.push({ label: aula.ativo ? 'Ativo' : 'Inativo', tone: aula.ativo ? 'success' : 'neutral' });

            const meta = [
              ...(aula.turmas_autorizadas && aula.turmas_autorizadas.length > 0
                ? [{ icon: ExternalLink, text: `Turmas: ${aula.turmas_autorizadas.join(', ')}` }]
                : []),
              ...(aula.criado_em ? [{ icon: ExternalLink, text: `Criado em: ${new Date(aula.criado_em).toLocaleString('pt-BR')}` }] : []),
            ];

            const actions = [
              { icon: ExternalLink, label: 'Abrir', onClick: () => window.open(aula.link_conteudo, '_blank') },
              ...(aula.pdf_url ? [{ icon: FileText, label: 'PDF', onClick: () => window.open(aula.pdf_url!, '_blank') }] : []),
              { icon: Edit, label: 'Editar', onClick: () => handleEdit(aula) },
              { icon: Edit, label: aula.ativo ? 'Desativar' : 'Ativar', onClick: () => toggleAtivo(aula.id, aula.ativo) },
              { icon: Trash2, label: 'Excluir', onClick: () => handleDelete(aula.id), tone: 'danger' as const },
            ];

            return (
              <UnifiedCard
                key={aula.id}
                variant="admin"
                item={{
                  id: aula.id,
                  module: 'aulas',
                  coverUrl,
                  title: aula.titulo,
                  subtitle: aula.descricao || undefined,
                  badges,
                  meta,
                  actions,
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};