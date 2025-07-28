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
      const userEmail = user?.email || studentData.email;
      if (!userEmail) {
        throw new Error('Email do usuário não encontrado');
      }

      console.log("🔍 Iniciando upload de avatar para o e-mail:", userEmail);

      // 1. Buscar o ID do usuário pela tabela profiles
      const { data: profileData, error: fetchError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", userEmail)
        .eq("user_type", "aluno")
        .maybeSingle();

      if (fetchError) {
        console.error("❌ Erro na consulta ao banco:", fetchError);
        throw new Error(`Erro na busca do usuário: ${fetchError.message}`);
      }

      let userId = profileData?.id;

      // 2. Se não encontrou o perfil, criar automaticamente
      if (!profileData) {
        console.warn("⚠️ Nenhum perfil encontrado. Criando novo perfil para:", userEmail);

        const { data: newProfile, error: insertError } = await supabase
          .rpc('create_simple_profile', {
            p_nome: studentData.nomeUsuario || 'Aluno',
            p_email: userEmail,
            p_turma: studentData.turma || ''
          });

        if (insertError) {
          console.error("❌ Erro ao criar perfil:", insertError.message);
          throw new Error('Erro ao criar perfil do usuário. Tente novamente.');
        }

        userId = newProfile?.[0]?.id;
        console.log("✅ Perfil criado com sucesso para ID:", userId);
      }

      if (!userId) {
        throw new Error('Erro ao obter ID do usuário.');
      }
      const fileExt = file.name.split(".").pop();
      const filePath = `avatars/${userId}.${fileExt}`;

      console.log("📁 Path final do novo avatar:", filePath);

      // 2. Upload no Supabase Storage com sobrescrita
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error("❌ Erro no upload:", uploadError);
        throw uploadError;
      }

      console.log("✅ Upload realizado com sucesso!");

      // 3. Atualizar avatar_url no banco
      const { error: updateError, data: updateResult } = await supabase
        .from("profiles")
        .update({ avatar_url: filePath })
        .eq("id", userId)
        .select();

      if (updateError) {
        console.error("❌ Erro ao atualizar avatar_url no banco:", updateError);
        throw updateError;
      }

      console.log("📝 avatar_url atualizado na tabela profiles");

      // 4. Atualizar visualização
      const { data: publicData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      setAvatarUrl(publicData?.publicUrl);
      onAvatarUpdate?.(true);
      
      console.log("🌐 URL pública da nova imagem gerada:", publicData?.publicUrl);

      // Cache para alunos simples
      if (!user?.id && studentData.email) {
        localStorage.setItem(`avatar_${studentData.email}`, publicData?.publicUrl || '');
        console.log('💾 Avatar salvo no cache local');
      }

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
        <AvatarImage src={avatarUrl || undefined} alt="Foto de perfil" />
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