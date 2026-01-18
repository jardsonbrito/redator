import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save } from 'lucide-react';
import { Secao } from '@/hooks/useProcessoSeletivo';

interface PSSecaoEditorProps {
  secao?: Secao;
  onSave: (dados: { titulo: string; descricao?: string }) => void;
  onCancel: () => void;
}

export const PSSecaoEditor: React.FC<PSSecaoEditorProps> = ({
  secao,
  onSave,
  onCancel
}) => {
  const [titulo, setTitulo] = useState(secao?.titulo || '');
  const [descricao, setDescricao] = useState(secao?.descricao || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;

    onSave({
      titulo: titulo.trim(),
      descricao: descricao.trim() || undefined
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="titulo">Título da Seção *</Label>
        <Input
          id="titulo"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ex: Dados Pessoais"
          required
        />
      </div>

      <div>
        <Label htmlFor="descricao">Descrição (opcional)</Label>
        <Textarea
          id="descricao"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Instruções ou explicações para esta seção..."
          rows={3}
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={!titulo.trim()}>
          <Save className="h-4 w-4 mr-2" />
          Salvar Seção
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
};

export default PSSecaoEditor;
