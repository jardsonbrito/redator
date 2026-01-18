import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { MessageSquare, Save, Image, Link, Calendar, Clock } from 'lucide-react';
import { useProcessoSeletivoAdmin } from '@/hooks/useProcessoSeletivoAdmin';

export const PSComunicadoForm: React.FC = () => {
  const {
    comunicado,
    isLoadingComunicado,
    salvarComunicado,
    isSalvandoComunicado
  } = useProcessoSeletivoAdmin();

  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    imagem_url: '',
    link_externo: '',
    data_evento: '',
    hora_evento: '',
    ativo: true
  });

  useEffect(() => {
    if (comunicado) {
      setForm({
        titulo: comunicado.titulo || '',
        descricao: comunicado.descricao || '',
        imagem_url: comunicado.imagem_url || '',
        link_externo: comunicado.link_externo || '',
        data_evento: comunicado.data_evento || '',
        hora_evento: comunicado.hora_evento || '',
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
      imagem_url: form.imagem_url || undefined,
      link_externo: form.link_externo || undefined,
      data_evento: form.data_evento || undefined,
      hora_evento: form.hora_evento || undefined,
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="imagem_url" className="flex items-center gap-2">
                <Image className="h-4 w-4" />
                URL da Imagem (opcional)
              </Label>
              <Input
                id="imagem_url"
                value={form.imagem_url}
                onChange={(e) => setForm({ ...form, imagem_url: e.target.value })}
                placeholder="https://..."
                type="url"
              />
            </div>

            <div>
              <Label htmlFor="link_externo" className="flex items-center gap-2">
                <Link className="h-4 w-4" />
                Link Externo (opcional)
              </Label>
              <Input
                id="link_externo"
                value={form.link_externo}
                onChange={(e) => setForm({ ...form, link_externo: e.target.value })}
                placeholder="https://..."
                type="url"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="data_evento" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Data do Evento (opcional)
              </Label>
              <Input
                id="data_evento"
                type="date"
                value={form.data_evento}
                onChange={(e) => setForm({ ...form, data_evento: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="hora_evento" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Horário do Evento (opcional)
              </Label>
              <Input
                id="hora_evento"
                type="time"
                value={form.hora_evento}
                onChange={(e) => setForm({ ...form, hora_evento: e.target.value })}
              />
            </div>
          </div>

          {/* Preview */}
          {form.titulo && (
            <div className="border rounded-lg p-4 bg-muted/30">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Preview:</h4>
              <div className="bg-background rounded-lg p-4 border">
                {form.imagem_url && (
                  <img
                    src={form.imagem_url}
                    alt="Preview"
                    className="w-full h-40 object-cover rounded-lg mb-4"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
                <h3 className="text-lg font-bold mb-2">{form.titulo}</h3>
                {form.descricao && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-4">
                    {form.descricao}
                  </p>
                )}
                {(form.data_evento || form.hora_evento) && (
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {form.data_evento && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(form.data_evento + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </span>
                    )}
                    {form.hora_evento && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {form.hora_evento}
                      </span>
                    )}
                  </div>
                )}
                {form.link_externo && (
                  <Button variant="outline" size="sm" className="mt-4">
                    <Link className="h-4 w-4 mr-2" />
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
