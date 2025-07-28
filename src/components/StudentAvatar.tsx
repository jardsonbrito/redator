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

  // Carregar avatar do usuário
  useEffect(() => {
    const loadAvatar = async () => {
      try {
        let avatarPath = null;
        
        if (user?.id) {
          // Usuário autenticado - buscar do perfil
          const { data: profileData } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', user.id)
            .maybeSingle();
          
          avatarPath = profileData?.avatar_url;
        } else if (isStudentLoggedIn && studentData.email) {
          // Aluno simples - usar localStorage primeiro
          const storedAvatar = localStorage.getItem(`avatar_${studentData.email}`);
          if (storedAvatar) {
            setAvatarUrl(storedAvatar);
            onAvatarUpdate?.(true);
            return;
          }
          
          // Buscar no perfil por email
          const { data: profileData } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('email', studentData.email)
            .eq('user_type', 'aluno')
            .maybeSingle();
          
          avatarPath = profileData?.avatar_url;
        }

        if (avatarPath) {
          const { data } = supabase.storage
            .from('avatars')
            .getPublicUrl(avatarPath);
          
          setAvatarUrl(data.publicUrl);
          onAvatarUpdate?.(true);
          
          // Cache para alunos simples
          if (!user?.id && studentData.email) {
            localStorage.setItem(`avatar_${studentData.email}`, data.publicUrl);
          }
        } else {
          setAvatarUrl(null);
          onAvatarUpdate?.(false);
        }
      } catch (error) {
        console.error('Erro ao carregar avatar:', error);
        setAvatarUrl(null);
        onAvatarUpdate?.(false);
      }
    };

    loadAvatar();
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
      const userIdentifier = user?.id || studentData.email?.replace(/[^a-zA-Z0-9]/g, '_') || 'guest';
      const filePath = `${userIdentifier}.${fileExt}`;

      console.log('🔄 Iniciando upload do avatar:', {
        userIdentifier,
        filePath,
        hasUser: !!user?.id,
        hasStudentData: !!studentData.email,
        isStudentLoggedIn
      });

      // 1. Upload da imagem para o Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error('❌ Erro no upload do Storage:', uploadError);
        throw uploadError;
      }

      console.log('✅ Upload do Storage concluído com sucesso');

      // 2. Obter URL pública da imagem
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      console.log('🔗 URL pública gerada:', publicUrl);

      // 3. Atualizar avatar_url na tabela profiles (salvar apenas o path, não a URL completa)
      let updateSuccess = false;
      
      if (user?.id) {
        // Usuário autenticado
        console.log('👤 Tentando atualizar perfil autenticado. User ID:', user.id);
        
        const { data, error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: filePath })
          .eq('id', user.id)
          .select();

        console.log('📊 Resultado do update autenticado:', { data, error: updateError });

        if (updateError) {
          console.error('❌ Erro ao atualizar perfil autenticado:', updateError);
          throw updateError;
        }
        
        updateSuccess = !!data && data.length > 0;
        console.log('✅ Update autenticado:', updateSuccess ? 'SUCESSO' : 'NENHUMA LINHA AFETADA');
        
      } else if (isStudentLoggedIn && studentData.email) {
        // Aluno simples - salvar path e cache
        console.log('🎓 Tentando atualizar perfil simples. Email:', studentData.email);
        
        const { data, error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: filePath })
          .eq('email', studentData.email)
          .eq('user_type', 'aluno')
          .select();

        console.log('📊 Resultado do update simples:', { data, error: updateError });

        if (updateError) {
          console.error('❌ Erro ao atualizar perfil simples:', updateError);
          console.warn('⚠️ Mantendo apenas no cache devido ao erro');
        } else {
          updateSuccess = !!data && data.length > 0;
          console.log('✅ Update simples:', updateSuccess ? 'SUCESSO' : 'NENHUMA LINHA AFETADA');
        }

        // Cache para alunos simples (sempre, independente do update)
        localStorage.setItem(`avatar_${studentData.email}`, publicUrl);
        console.log('💾 Avatar salvo no cache local');
      }

      // 4. Atualizar a imagem exibida
      setAvatarUrl(publicUrl);
      onAvatarUpdate?.(true);

      const message = updateSuccess 
        ? 'Foto de perfil atualizada com sucesso!' 
        : 'Upload realizado! Foto será exibida localmente.';

      toast({
        title: 'Sucesso',
        description: message,
      });

      console.log('🎉 Processo de upload concluído com sucesso');

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