import React, { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  Search,
  Filter,
  Archive,
  StickyNote,
  X,
} from 'lucide-react';
import { useAdminNotes } from '@/hooks/useAdminNotes';
import { useAuth } from '@/hooks/useAuth';
import { NotesCard } from '@/components/admin/NotesCard';
import { NoteEditor } from '@/components/admin/notes/NoteEditor';
import {
  AdminNote,
  NoteFormData,
  NoteFilters,
  extractCategorias,
  extractTags,
  NoteColor,
  NOTE_COLORS,
  AdminNoteInsert,
  AdminNoteUpdate,
  NoteImage,
} from '@/types/admin-notes';

const AdminNotes = () => {
  const { user } = useAuth();
  const [filters, setFilters] = useState<NoteFilters>({
    termo_busca: '',
    categoria: '',
    tags: [],
    incluir_arquivadas: false,
    cor: undefined,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [editingNote, setEditingNote] = useState<AdminNote | undefined>();
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const {
    notes,
    isLoading,
    createNote,
    updateNote,
    deleteNote,
    togglePin,
    toggleArchive,
    uploadImage,
    deleteImage,
  } = useAdminNotes(filters);

  const categorias = useMemo(() => extractCategorias(notes), [notes]);
  const allTags = useMemo(() => extractTags(notes), [notes]);

  const handleOpenNew = () => {
    setEditingNote(undefined);
    setIsEditorOpen(true);
  };

  const handleEdit = (note: AdminNote) => {
    setEditingNote(note);
    setIsEditorOpen(true);
  };

  const handleSave = async (
    data: NoteFormData,
    newImages?: File[],
    imagesToRemove?: string[]
  ) => {
    if (!user?.id) return;

    try {
      // Fazer upload das novas imagens
      let uploadedImages: NoteImage[] = [];
      if (newImages && newImages.length > 0) {
        const noteId = editingNote?.id || crypto.randomUUID();
        const uploadPromises = newImages.map(file => uploadImage(file, noteId));
        const results = await Promise.all(uploadPromises);
        uploadedImages = results.filter((img): img is NoteImage => img !== null);
      }

      // Combinar imagens existentes (que não foram removidas) com novas
      let finalImages: NoteImage[] = [];
      if (editingNote && editingNote.imagens) {
        finalImages = editingNote.imagens.filter(
          img => !imagesToRemove?.includes(img.bucket_path || '')
        );
      }
      finalImages = [...finalImages, ...uploadedImages];

      // Deletar imagens removidas do storage
      if (imagesToRemove && imagesToRemove.length > 0) {
        await Promise.all(imagesToRemove.map(path => deleteImage(path)));
      }

      const noteData = {
        titulo: data.titulo,
        conteudo: data.conteudo || null,
        cor: data.cor,
        categoria: data.categoria || null,
        tags: data.tags.length > 0 ? data.tags : null,
        imagens: finalImages,
        links: data.links,
        fixado: data.fixado,
      };

      if (editingNote) {
        // Atualizar nota existente
        updateNote({
          id: editingNote.id,
          updates: noteData as AdminNoteUpdate,
        });
      } else {
        // Criar nova nota
        createNote({
          admin_id: user.id,
          ...noteData,
        } as AdminNoteInsert);
      }
    } catch (error) {
      console.error('Erro ao salvar anotação:', error);
    }
  };

  const handleToggleTag = (tag: string) => {
    const currentTags = filters.tags || [];
    if (currentTags.includes(tag)) {
      setFilters({ ...filters, tags: currentTags.filter(t => t !== tag) });
    } else {
      setFilters({ ...filters, tags: [...currentTags, tag] });
    }
  };

  const clearFilters = () => {
    setFilters({
      termo_busca: '',
      categoria: '',
      tags: [],
      incluir_arquivadas: false,
      cor: undefined,
    });
  };

  const hasActiveFilters =
    filters.termo_busca ||
    filters.categoria ||
    (filters.tags && filters.tags.length > 0) ||
    filters.incluir_arquivadas ||
    filters.cor;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <StickyNote className="h-8 w-8" />
              Minhas Anotações
            </h1>
            <p className="text-muted-foreground mt-1">
              Organize suas ideias com texto, imagens e links
            </p>
          </div>
          <Button onClick={handleOpenNew} size="lg">
            <Plus className="mr-2 h-5 w-5" />
            Nova Anotação
          </Button>
        </div>

        {/* Busca e Filtros */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar anotações..."
                className="pl-10"
                value={filters.termo_busca}
                onChange={(e) => setFilters({ ...filters, termo_busca: e.target.value })}
              />
            </div>
            <Button
              variant={showFilters ? 'default' : 'outline'}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="mr-2 h-4 w-4" />
              Filtros
            </Button>
          </div>

          {/* Painel de Filtros */}
          {showFilters && (
            <div className="p-4 border rounded-lg space-y-4 bg-muted/50">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Categoria</label>
                  <Select
                    value={filters.categoria}
                    onValueChange={(value) =>
                      setFilters({ ...filters, categoria: value === 'all' ? '' : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {categorias.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Cor</label>
                  <Select
                    value={filters.cor}
                    onValueChange={(value: NoteColor | 'all') =>
                      setFilters({ ...filters, cor: value === 'all' ? undefined : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {NOTE_COLORS.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded border ${color.class}`} />
                            {color.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setFilters({ ...filters, incluir_arquivadas: !filters.incluir_arquivadas })
                    }
                    className="w-full"
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    {filters.incluir_arquivadas ? 'Ocultar arquivadas' : 'Mostrar arquivadas'}
                  </Button>
                </div>
              </div>

              {/* Tags */}
              {allTags.length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {allTags.map((tag) => (
                      <Badge
                        key={tag}
                        variant={filters.tags?.includes(tag) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => handleToggleTag(tag)}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="mr-2 h-4 w-4" />
                  Limpar filtros
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Grid de Anotações */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-lg" />
            ))}
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-16">
            <StickyNote className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhuma anotação encontrada</h3>
            <p className="text-muted-foreground mb-6">
              {hasActiveFilters
                ? 'Tente ajustar seus filtros ou limpar a busca'
                : 'Comece criando sua primeira anotação'}
            </p>
            {!hasActiveFilters && (
              <Button onClick={handleOpenNew}>
                <Plus className="mr-2 h-4 w-4" />
                Criar primeira anotação
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {notes.map((note) => (
              <NotesCard
                key={note.id}
                note={note}
                onEdit={handleEdit}
                onDelete={deleteNote}
                onTogglePin={togglePin}
                onToggleArchive={toggleArchive}
              />
            ))}
          </div>
        )}

        {/* Estatísticas */}
        {notes.length > 0 && (
          <div className="text-sm text-muted-foreground text-center">
            {notes.length} {notes.length === 1 ? 'anotação' : 'anotações'} {hasActiveFilters && '(filtradas)'}
          </div>
        )}
      </div>

      {/* Editor Dialog */}
      <NoteEditor
        note={editingNote}
        onSave={handleSave}
        onCancel={() => setIsEditorOpen(false)}
        isOpen={isEditorOpen}
      />
    </AdminLayout>
  );
};

export default AdminNotes;
