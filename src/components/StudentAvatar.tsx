import { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Camera, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import { useToast } from '@/hooks/use-toast';

interface StudentAvatarProps {
  size?: 'sm' | 'md' | 'lg';
  showUpload?: boolean;
  onAvatarUpdate?: (hasAvatar: boolean) => void;
}

export const StudentAvatar = ({ size = 'md', showUpload = true, onAvatarUpdate }: StudentAvatarProps) => {
  const { user } = useAuth();
  const { studentData, isStudentLoggedIn } = useStudentAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Carregar avatar do usuário (autenticado ou estudante simples)
  useEffect(() => {
    const loadUserProfile = async () => {
      console.log('🔄 Carregando perfil do usuário...', { user: !!user, studentData });
      
      // Primeiro, tentar carregar do localStorage (cache rápido)
      const cachedAvatar = localStorage.getItem('student_avatar_url');
      if (cachedAvatar) {
        setAvatarUrl(cachedAvatar);
        onAvatarUpdate?.(true);
      }

      if (user) {
        // Usuário autenticado do Supabase Auth
        console.log('📸 Carregando avatar para usuário autenticado:', user.id);
        const { data } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', user.id)
          .maybeSingle();
        
        if (data && data.avatar_url) {
          console.log('✅ Avatar encontrado para usuário autenticado:', data.avatar_url);
          setUserProfile(data);
          setAvatarUrl(data.avatar_url);
          localStorage.setItem('student_avatar_url', data.avatar_url);
          onAvatarUpdate?.(true);
        } else {
          console.log('❌ Nenhum avatar encontrado para usuário autenticado');
          if (!cachedAvatar) {
            setAvatarUrl(null);
            onAvatarUpdate?.(false);
          }
        }
      } else if (isStudentLoggedIn && studentData.email) {
        // Estudante simples (useStudentAuth)
        console.log('📸 Carregando avatar para estudante simples:', studentData.email);
        const { data } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('email', studentData.email)
          .eq('user_type', 'aluno')
          .maybeSingle();
        
        if (data && data.avatar_url) {
          console.log('✅ Avatar encontrado para estudante simples:', data.avatar_url);
          setUserProfile(data);
          setAvatarUrl(data.avatar_url);
          localStorage.setItem('student_avatar_url', data.avatar_url);
          onAvatarUpdate?.(true);
        } else {
          console.log('❌ Nenhum avatar encontrado para estudante simples');
          if (!cachedAvatar) {
            setAvatarUrl(null);
            onAvatarUpdate?.(false);
          }
        }
      }
    };

    loadUserProfile();
  }, [user, studentData.email, isStudentLoggedIn, onAvatarUpdate]);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-16 h-16',
    lg: 'w-32 h-32'
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
      const userIdentifier = user?.id || studentData.email || 'guest';
      const fileName = `${userIdentifier}_${Date.now()}.${fileExt}`;
      const filePath = `${userIdentifier}/${fileName}`;

      console.log('📤 Iniciando upload do avatar:', { userIdentifier, fileName, filePath });

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

      console.log('✅ Upload concluído. URL pública:', publicUrl);
      setAvatarUrl(publicUrl);

      // Salvar URL no perfil do usuário
      if (user) {
        // Usuário autenticado do Supabase Auth
        console.log('💾 Salvando avatar para usuário autenticado:', user.id);
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: publicUrl })
          .eq('id', user.id);

        if (updateError) {
          throw updateError;
        }
      } else if (isStudentLoggedIn && studentData.email) {
        // Estudante simples (useStudentAuth)
        console.log('💾 Salvando avatar para estudante simples:', studentData.email);
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: publicUrl })
          .eq('email', studentData.email)
          .eq('user_type', 'aluno');

        if (updateError) {
          console.warn('⚠️ Erro ao salvar avatar para estudante simples:', updateError);
          // Não falhar se não conseguir salvar no banco - o cache local funciona
        }
      }

      // Salvar no cache local para persistência
      localStorage.setItem('student_avatar_url', publicUrl);

      // Notificar o componente pai sobre a atualização
      onAvatarUpdate?.(true);

      toast({
        title: 'Sucesso',
        description: 'Foto de perfil atualizada com sucesso!',
      });

    } catch (error) {
      console.error('❌ Erro no upload:', error);
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
        className={`${sizeClasses[size]} border border-primary/20 transition-all hover:shadow-lg ${uploading ? 'opacity-50' : ''} ${showUpload && !avatarUrl ? 'cursor-pointer' : ''}`}
        onClick={showUpload && !avatarUrl ? handleAvatarClick : undefined}
      >
        <AvatarImage src={avatarUrl || undefined} alt="Foto de perfil" />
        <AvatarFallback className="bg-primary/10 text-primary">
          {studentData.nomeUsuario ? getInitials() : <User className={size === 'lg' ? 'w-8 h-8' : 'w-5 h-5'} />}
        </AvatarFallback>
      </Avatar>
      
      {showUpload && (
        <>
          {!avatarUrl && (
            <div 
              className={`absolute -bottom-1 -right-1 bg-primary rounded-full shadow-lg cursor-pointer hover:bg-primary/80 transition-colors ${
                size === 'lg' ? 'p-2' : 'p-1.5'
              }`}
              onClick={handleAvatarClick}
            >
              <Camera className={`text-primary-foreground ${size === 'lg' ? 'w-4 h-4' : 'w-3 h-3'}`} />
            </div>
          )}
          
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