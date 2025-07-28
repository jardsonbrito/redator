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

  // Carregar avatar do usuário - SEMPRE da tabela profiles
  useEffect(() => {
    const loadAvatar = async () => {
      try {
        let profileData = null;
        
        // Priorizar user.id se disponível (usuário autenticado)
        if (user?.id) {
          const { data } = await supabase
            .from('profiles')
            .select('avatar_url, id')
            .eq('id', user.id)
            .maybeSingle();
          profileData = data;
        } 
        // Fallback para email se for aluno simples
        else if (isStudentLoggedIn && studentData.email) {
          const { data } = await supabase
            .from('profiles')
            .select('avatar_url, id')
            .eq('email', studentData.email)
            .eq('user_type', 'aluno')
            .maybeSingle();
          profileData = data;
        }

        // Se encontrou perfil com avatar_url, gerar URL pública
        if (profileData?.avatar_url) {
          const { data } = supabase.storage
            .from('avatars')
            .getPublicUrl(profileData.avatar_url);
          
          setAvatarUrl(data.publicUrl);
          onAvatarUpdate?.(true);
          setUserProfile(profileData);
          
          console.log('✅ Avatar carregado do Supabase:', data.publicUrl);
        } else {
          setAvatarUrl(null);
          onAvatarUpdate?.(false);
          setUserProfile(profileData);
          console.log('ℹ️ Nenhum avatar encontrado no perfil');
        }
      } catch (error) {
        console.error('❌ Erro ao carregar avatar:', error);
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
      // Usar perfil já carregado ou buscar novamente se necessário
      let userId = userProfile?.id;
      
      if (!userId) {
        const userEmail = user?.email || studentData.email;
        if (!userEmail) {
          throw new Error('Email do usuário não encontrado');
        }

        console.log("🔍 Buscando perfil para o e-mail:", userEmail);

        // Buscar perfil por user.id primeiro, depois por email
        let profileData = null;
        
        if (user?.id) {
          const { data } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", user.id)
            .maybeSingle();
          profileData = data;
        }
        
        if (!profileData && userEmail) {
          const { data } = await supabase
            .from("profiles")
            .select("id")
            .eq("email", userEmail)
            .eq("user_type", "aluno")
            .maybeSingle();
          profileData = data;
        }

        if (!profileData?.id) {
          throw new Error('Perfil do usuário não encontrado. Verifique se você está logado corretamente.');
        }

        userId = profileData.id;
        setUserProfile(profileData);
      }
      const fileExt = file.name.split(".").pop();
      // Usar timestamp para criar nome único e evitar cache
      const timestamp = Date.now();
      const filePath = `avatars/${userId}-${timestamp}.${fileExt}`;

      console.log("📁 Path final do novo avatar com timestamp:", filePath);

      // 2. Upload no Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { 
          cacheControl: '3600',
          upsert: true 
        });

      if (uploadError) {
        console.error("❌ Erro no upload:", uploadError);
        throw uploadError;
      }

      console.log("✅ Upload realizado com sucesso!");

      // 3. Gerar URL pública do novo arquivo
      const { data: publicData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);
      
      const newAvatarUrl = publicData.publicUrl;
      
      console.log("🌐 Nova URL pública gerada:", newAvatarUrl);

      // 4. Atualizar avatar_url no banco COM VERIFICAÇÃO
      console.log("🔍 Tentando atualizar avatar_url para userId:", userId);
      
      const { error: updateError, data: updateResult } = await supabase
        .from("profiles")
        .update({ avatar_url: filePath })
        .eq("id", userId)
        .select("*");

      if (updateError) {
        console.error("❌ Erro ao atualizar avatar_url:", updateError);
        throw updateError;
      }

      // Verificar se alguma linha foi realmente afetada
      if (!updateResult || updateResult.length === 0) {
        console.error("❌ avatar_url NÃO foi atualizado! Nenhuma linha afetada.");
        console.error("🔍 Dados retornados:", { updateResult, userId });
        throw new Error("Nenhuma linha foi atualizada no banco de dados");
      }

      console.log("✅ avatar_url atualizado na tabela profiles! Linhas afetadas:", updateResult.length);
      console.log("📝 Dados atualizados:", updateResult[0]);

      // 5. Atualizar visualização SOMENTE após confirmação do banco
      setAvatarUrl(newAvatarUrl);
      onAvatarUpdate?.(true);
      
      console.log("✅ Avatar atualizado com sucesso! Nova URL:", newAvatarUrl);
      console.log("📁 Caminho salvo no banco:", filePath);

      toast({
        title: 'Sucesso',
        description: 'Foto de perfil atualizada com sucesso!',
      });

    } catch (error) {
      console.error("❌ Erro inesperado:", error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao fazer upload da imagem. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleAvatarClick = () => {
    if (fileInputRef.current) {
      console.log('🖱️ Avatar clicado. Abrindo seletor de arquivo...');
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
        className={`${sizeClasses[size]} border border-primary/20 transition-all hover:shadow-lg ${uploading ? 'opacity-50' : ''} ${showUpload ? 'cursor-pointer' : ''}`}
        onClick={showUpload ? handleAvatarClick : undefined}
      >
        
        {avatarUrl && (
          <AvatarImage 
            src={avatarUrl} 
            alt="Avatar do usuário"
            className="object-cover"
          />
        )}
        <AvatarFallback className="bg-primary/10 text-primary">
          {studentData.nomeUsuario ? getInitials() : <User className={size === 'lg' ? 'w-8 h-8' : 'w-5 h-5'} />}
        </AvatarFallback>
      </Avatar>
      
      {showUpload && (
        <>
          <div 
            className={`absolute -bottom-1 -right-1 bg-primary rounded-full shadow-lg cursor-pointer hover:bg-primary/80 transition-colors ${
              size === 'lg' ? 'p-2' : 'p-1.5'
            }`}
            onClick={handleAvatarClick}
          >
            <Camera className={`text-primary-foreground ${size === 'lg' ? 'w-4 h-4' : 'w-3 h-3'}`} />
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