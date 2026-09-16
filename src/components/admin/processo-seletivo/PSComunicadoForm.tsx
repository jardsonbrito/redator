import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { MessageSquare, Save, Link, ExternalLink } from 'lucide-react';
import { useProcessoSeletivoAdminComContexto } from '@/contexts/ProcessoSeletivoAdminContext';

export const PSComunicadoForm: React.FC = () => {
  const {
    comunicado,
    isLoadingComunicado,
    salvarComunicado,
    isSalvandoComunicado
  } = useProcessoSeletivoAdminComContexto();

  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    link_externo: '',
    ativo: true
  });

  useEffect(() => {
    if (comunicado) {
      setForm({
        titulo: comunicado.titulo || '',
        descricao: comunicado.descricao || '',
        link_externo: comunicado.link_externo || '',
        ativo: comunicado.ativo
      });
    }
  }, [comunicado]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titulo.trim()) return;

    salvarComunicado({
      id: comunicado?.id,
      titulo: form.titulo,
      descricao: form.descricao || undefined,
      link_externo: form.link_externo || undefined,
      ativo: form.ativo
    });
  };

  if (isLoadingComunicado) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Comunicado para Aprovados (Etapa 2)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Switch
              id="ativo"
              checked={form.ativo}
              onCheckedChange={(ativo) => setForm({ ...form, ativo })}
            />
            <Label htmlFor="ativo">Comunicado ativo</Label>
          </div>

          <div>
            <Label htmlFor="titulo">Título do Comunicado *</Label>
            <Input
              id="titulo"
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              placeholder="Ex: Parabéns! Você foi aprovado na primeira etapa"
              required
            />
          </div>

          <div>
            <Label htmlFor="descricao">Descrição / Mensagem</Label>
            <Textarea
              id="descricao"
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              placeholder="Mensagem detalhada para os candidatos aprovados..."
              rows={5}
            />
          </div>

          <div>
            <Label htmlFor="link_externo" className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              Link Externo (para grupo de finalistas)
            </Label>
            <Input
              id="link_externo"
              value={form.link_externo}
              onChange={(e) => setForm({ ...form, link_externo: e.target.value })}
              placeholder="https://..."
              type="url"
            />
          </div>

          {/* Preview - Mostra como o aluno verá */}
          {(form.titulo || form.descricao || form.link_externo) && (
            <div className="border rounded-lg p-4 bg-muted/30">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Preview (como o aluno verá):
              </h4>
              <div className="bg-background rounded-lg p-4 border text-center space-y-3">
                {form.titulo && (
                  <h3 className="text-lg font-semibold">{form.titulo}</h3>
                )}
                {form.descricao && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {form.descricao}
                  </p>
                )}
                {form.link_externo && (
                  <Button size="sm" className="mt-2">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Acessar Link
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="pt-4">
            <Button type="submit" disabled={!form.titulo.trim() || isSalvandoComunicado}>
              <Save className="h-4 w-4 mr-2" />
              {comunicado ? 'Atualizar Comunicado' : 'Criar Comunicado'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default PSComunicadoForm;
