import { useState, useRef } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Camera, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import { useToast } from '@/hooks/use-toast';

interface StudentAvatarProps {
  size?: 'sm' | 'md' | 'lg';
  showUpload?: boolean;
}

export const StudentAvatar = ({ size = 'md', showUpload = true }: StudentAvatarProps) => {
  const { user } = useAuth();
  const { studentData } = useStudentAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-16 h-16',
    lg: 'w-24 h-24'
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar formato e tamanho
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione uma imagem válida.',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      toast({
        title: 'Erro',
        description: 'A imagem deve ter no máximo 5MB.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    
    try {
      // Criar nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id || 'guest'}_${Date.now()}.${fileExt}`;
      const filePath = `${user?.id || 'guest'}/${fileName}`;

      // Upload para o Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);

      // Salvar URL no perfil do usuário se autenticado
      if (user) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: publicUrl })
          .eq('id', user.id);

        if (updateError) {
          throw updateError;
        }
      }

      toast({
        title: 'Sucesso',
        description: 'Foto de perfil atualizada com sucesso!',
      });

    } catch (error) {
      console.error('Erro no upload:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao fazer upload da imagem. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleAvatarClick = () => {
    if (showUpload && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const getInitials = () => {
    const name = studentData.nomeUsuario || 'User';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="relative">
      <Avatar 
        className={`${sizeClasses[size]} cursor-pointer transition-all hover:shadow-lg ${uploading ? 'opacity-50' : ''}`}
        onClick={handleAvatarClick}
      >
        <AvatarImage src={avatarUrl || undefined} alt="Foto de perfil" />
        <AvatarFallback className="bg-primary/10 text-primary">
          {studentData.nomeUsuario ? getInitials() : <User className="w-5 h-5" />}
        </AvatarFallback>
      </Avatar>
      
      {showUpload && (
        <>
          <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-1 shadow-lg">
            <Camera className="w-3 h-3 text-primary-foreground" />
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </>
      )}
    </div>
  );
};