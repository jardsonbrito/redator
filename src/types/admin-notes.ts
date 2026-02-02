// Tipos TypeScript para o Sistema de Anotações do Administrador

export interface NoteImage {
  url: string;
  nome: string;
  tamanho: number;
  bucket_path?: string;
}

export interface NoteLink {
  url: string;
  titulo: string;
  descricao?: string;
}

export type NoteColor = 'default' | 'yellow' | 'blue' | 'green' | 'red' | 'purple' | 'pink';

export interface AdminNote {
  id: string;
  admin_id: string;
  titulo: string;
  conteudo?: string;
  cor: NoteColor;
  categoria?: string;
  tags?: string[];
  imagens: NoteImage[];
  links: NoteLink[];
  fixado: boolean;
  arquivado: boolean;
  criado_em: string;
  atualizado_em: string;
}

// Tipos para insert/update
export interface AdminNoteInsert {
  admin_id: string;
  titulo: string;
  conteudo?: string;
  cor?: NoteColor;
  categoria?: string;
  tags?: string[];
  imagens?: NoteImage[];
  links?: NoteLink[];
  fixado?: boolean;
  arquivado?: boolean;
}

export interface AdminNoteUpdate {
  titulo?: string;
  conteudo?: string;
  cor?: NoteColor;
  categoria?: string;
  tags?: string[];
  imagens?: NoteImage[];
  links?: NoteLink[];
  fixado?: boolean;
  arquivado?: boolean;
}

// Tipos para formulários
export interface NoteFormData {
  titulo: string;
  conteudo: string;
  cor: NoteColor;
  categoria?: string;
  tags: string[];
  links: NoteLink[];
  fixado: boolean;
}

// Tipos para filtros de busca
export interface NoteFilters {
  termo_busca?: string;
  categoria?: string;
  tags?: string[];
  incluir_arquivadas?: boolean;
  cor?: NoteColor;
}

// Props para componentes
export interface NotesCardProps {
  note: AdminNote;
  onEdit: (note: AdminNote) => void;
  onDelete: (noteId: string) => void;
  onTogglePin: (noteId: string, fixado: boolean) => void;
  onToggleArchive: (noteId: string, arquivado: boolean) => void;
}

export interface NoteEditorProps {
  note?: AdminNote;
  onSave: (data: NoteFormData, images?: File[]) => Promise<void>;
  onCancel: () => void;
  isOpen: boolean;
}

export interface NoteSearchProps {
  filters: NoteFilters;
  onFiltersChange: (filters: NoteFilters) => void;
  categorias: string[];
  tags: string[];
}

export interface ImageUploadProps {
  onImagesChange: (images: File[]) => void;
  existingImages?: NoteImage[];
  onRemoveExisting?: (imageUrl: string) => void;
  maxImages?: number;
}

export interface LinkInputProps {
  links: NoteLink[];
  onLinksChange: (links: NoteLink[]) => void;
}

// Constantes
export const NOTE_COLORS: { value: NoteColor; label: string; class: string }[] = [
  { value: 'default', label: 'Padrão', class: 'bg-white border-gray-200' },
  { value: 'yellow', label: 'Amarelo', class: 'bg-yellow-50 border-yellow-200' },
  { value: 'blue', label: 'Azul', class: 'bg-blue-50 border-blue-200' },
  { value: 'green', label: 'Verde', class: 'bg-green-50 border-green-200' },
  { value: 'red', label: 'Vermelho', class: 'bg-red-50 border-red-200' },
  { value: 'purple', label: 'Roxo', class: 'bg-purple-50 border-purple-200' },
  { value: 'pink', label: 'Rosa', class: 'bg-pink-50 border-pink-200' },
];

// Utilitários
export const getColorClass = (cor: NoteColor): string => {
  return NOTE_COLORS.find(c => c.value === cor)?.class || NOTE_COLORS[0].class;
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const extractTags = (notes: AdminNote[]): string[] => {
  const allTags = notes.flatMap(note => note.tags || []);
  return Array.from(new Set(allTags)).sort();
};

export const extractCategorias = (notes: AdminNote[]): string[] => {
  const allCategorias = notes
    .map(note => note.categoria)
    .filter((cat): cat is string => !!cat);
  return Array.from(new Set(allCategorias)).sort();
};
