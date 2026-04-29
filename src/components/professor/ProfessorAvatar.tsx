import { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { User, Camera } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useProfessorAuth } from '@/hooks/useProfessorAuth';
import { useToast } from '@/hooks/use-toast';

interface ProfessorAvatarProps {
  size?: 'sm' | 'md' | 'lg';
  showUpload?: boolean;
  onAvatarUpdate?: (hasAvatar: boolean) => void;
}

export const ProfessorAvatar = ({ size = 'md', showUpload = true, onAvatarUpdate }: ProfessorAvatarProps) => {
  const { professor } = useProfessorAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);

  // Carrega avatar a partir de profiles (mesmo mecanismo do aluno)
  useEffect(() => {
    if (!professor?.email) return;

    const loadAvatar = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, avatar_url')
        .eq('email', professor.email.toLowerCase())
        .maybeSingle();

      if (error) {
        console.error('Erro ao carregar avatar do professor:', error);
        return;
      }

      if (data) {
        setProfileId(data.id);
        if (data.avatar_url) {
          const url = data.avatar_url.startsWith('http')
            ? data.avatar_url
            : supabase.storage.from('avatars').getPublicUrl(
                data.avatar_url.startsWith('avatars/')
                  ? data.avatar_url.substring(8)
                  : data.avatar_url
              ).data.publicUrl;
          setAvatarUrl(url);
          onAvatarUpdate?.(true);
        } else {
          setAvatarUrl(null);
          onAvatarUpdate?.(false);
        }
      } else {
        setAvatarUrl(null);
        onAvatarUpdate?.(false);
      }
    };

    loadAvatar();
  }, [professor?.email, onAvatarUpdate]);

  const sizeClasses = { sm: 'w-8 h-8', md: 'w-16 h-16', lg: 'w-32 h-32' };
  const cameraIconSize = size === 'lg' ? 'w-6 h-6' : 'w-4 h-4';

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !professor?.email) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Erro', description: 'Selecione uma imagem válida.', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Erro', description: 'A imagem deve ter no máximo 5 MB.', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      // Usa profileId se já carregado, senão professor.id como nome de arquivo
      const fileId = profileId || professor.id;
      const fileExt = file.name.split('.').pop();
      const filePath = `${fileId}-${Date.now()}.${fileExt}`;

      // 1. Upload para o bucket avatars
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      const newAvatarUrl = supabase.storage.from('avatars').getPublicUrl(filePath).data.publicUrl;

      if (profileId) {
        // 2a. Profile já existe — atualiza avatar_url por email (policy pública permite)
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: filePath })
          .eq('email', professor.email.toLowerCase())
          .eq('user_type', 'professor');

        if (updateError) throw updateError;
      } else {
        // 2b. Professor sem profile — insere com campos obrigatórios
        const parts = (professor.nome_completo || '').trim().split(/\s+/);
        const nome = parts[0] || 'Professor';
        const sobrenome = parts.length > 1 ? parts.slice(1).join(' ') : '-';

        const { data: inserted, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: crypto.randomUUID(),
            nome,
            sobrenome,
            email: professor.email.toLowerCase(),
            avatar_url: filePath,
            user_type: 'professor',
            ativo: true,
          })
          .select('id')
          .single();

        if (insertError) throw insertError;
        if (inserted?.id) setProfileId(inserted.id);
      }

      setAvatarUrl(newAvatarUrl);
      onAvatarUpdate?.(true);
      toast({ title: 'Sucesso', description: 'Foto de perfil atualizada!' });
    } catch (error) {
      console.error('Erro no upload do avatar do professor:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao fazer upload.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const getInitials = () => {
    const name = professor?.nome_completo || 'P';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div
      className="relative group"
      title={showUpload ? 'Clique para alterar a foto de perfil' : undefined}
    >
      <Avatar
        className={`${sizeClasses[size]} border border-primary/20 transition-all ${uploading ? 'opacity-50' : ''} ${showUpload ? 'cursor-pointer hover:ring-2 hover:ring-primary/50 hover:ring-offset-2 hover:shadow-lg' : ''}`}
        onClick={() => showUpload && fileInputRef.current?.click()}
      >
        {avatarUrl && (
          <AvatarImage src={avatarUrl} alt="Avatar do professor" className="object-cover" />
        )}
        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
          {professor?.nome_completo ? getInitials() : <User className={size === 'lg' ? 'w-8 h-8' : 'w-5 h-5'} />}
        </AvatarFallback>
      </Avatar>

      {showUpload && !uploading && (
        <div
          className={`absolute inset-0 rounded-full flex items-center justify-center transition-opacity duration-200 pointer-events-none ${
            avatarUrl ? 'bg-black/50 opacity-0 group-hover:opacity-100' : 'bg-black/30 opacity-100'
          }`}
        >
          <Camera className={`${cameraIconSize} text-white`} />
        </div>
      )}

      {showUpload && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      )}
    </div>
  );
};
