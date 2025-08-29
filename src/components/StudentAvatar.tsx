import { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { User } from 'lucide-react';
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
        
        console.log('🔍 Carregando avatar. user?.id:', user?.id, 'studentData.email:', studentData.email);
        
        // 1. Tentar por user.id primeiro (admin/auth)
        if (user?.id) {
          const { data, error } = await supabase
            .from('profiles')
            .select('avatar_url, id, email')
            .eq('id', user.id)
            .maybeSingle();
          
          if (error) console.error('❌ Erro ao buscar avatar por user.id:', error);
          if (data) {
            console.log('✅ Perfil encontrado por user.id para avatar:', data);
            profileData = data;
          }
        }
        
        // 2. Se não encontrou por user.id, tentar por email (aluno) usando query direta
        if (!profileData && studentData.email) {
          console.log('🔍 Carregando avatar - busca por email:', studentData.email.toLowerCase());
          
          const { data: directData, error: directError } = await supabase
            .from('profiles')
            .select('id, nome, sobrenome, email, turma, user_type, avatar_url')
            .eq('email', studentData.email.toLowerCase())
            .eq('user_type', 'aluno')
            .maybeSingle();
          
          console.log('🔍 Carregando avatar - resultado da busca direta:', { directData, directError });
          
          if (directError) {
            console.error('❌ Erro ao buscar avatar:', directError);
          } else if (directData) {
            console.log('✅ Perfil encontrado para avatar:', directData);
            profileData = directData;
          } else {
            console.log('❌ Avatar - nenhum perfil encontrado para email:', studentData.email.toLowerCase());
          }
        }
        
        // 3. Fallback para user.email se disponível
        if (!profileData && user?.email) {
          const { data, error } = await supabase
            .from('profiles')
            .select('avatar_url, id, email')
            .eq('email', user.email.toLowerCase())
            .maybeSingle();
          
          if (error) console.error('❌ Erro ao buscar avatar por user.email:', error);
          if (data) {
            console.log('✅ Perfil encontrado por user.email para avatar:', data);
            profileData = data;
          }
        }

        // Se encontrou perfil com avatar_url, gerar URL pública
        if (profileData?.avatar_url) {
          let finalAvatarUrl: string;
          
          // Verificar se é URL externa (http/https) ou arquivo do Storage
          if (profileData.avatar_url.startsWith('http')) {
            // URL externa - usar diretamente
            finalAvatarUrl = profileData.avatar_url;
            console.log('🌐 Usando avatar externo:', finalAvatarUrl);
          } else {
            // Arquivo do Storage - processar normalmente
            const cleanPath = profileData.avatar_url.startsWith('avatars/') 
              ? profileData.avatar_url.substring(8) 
              : profileData.avatar_url;
            
            const { data } = supabase.storage
              .from('avatars')
              .getPublicUrl(cleanPath);
            
            finalAvatarUrl = data.publicUrl;
            console.log('📁 Usando avatar do Storage:', finalAvatarUrl);
          }
          
          setAvatarUrl(finalAvatarUrl);
          onAvatarUpdate?.(true);
          setUserProfile(profileData);
          
          console.log('✅ Avatar carregado:', finalAvatarUrl);
        } else {
          setAvatarUrl(null);
          onAvatarUpdate?.(false);
          setUserProfile(profileData);
          if (profileData) {
            console.log('ℹ️ Perfil encontrado mas sem avatar:', profileData);
          } else {
            console.log('⚠️ Nenhum perfil encontrado para este usuário');
          }
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
        console.log("🔍 Buscando perfil do usuário...");
        console.log("🔍 user?.id:", user?.id);
        console.log("🔍 user?.email:", user?.email);
        console.log("🔍 studentData:", {
          email: studentData.email,
          nomeUsuario: studentData.nomeUsuario,
          userType: studentData.userType,
          turma: studentData.turma
        });

        // Debug: testar conectividade básica do Supabase
        try {
          const { data: testData, error: testError } = await supabase
            .from("profiles")
            .select("count")
            .limit(1);
          console.log("🔍 Teste de conectividade Supabase:", { testData, testError });
        } catch (testErr) {
          console.error("❌ Erro de conectividade Supabase:", testErr);
        }

        let profileData = null;
        
        // 1. Tentar por user.id (admin/auth)
        if (user?.id) {
          console.log("🔍 Tentando buscar por user.id:", user.id);
          const { data, error } = await supabase
            .from("profiles")
            .select("id, email")
            .eq("id", user.id)
            .maybeSingle();
          
          if (error) console.error("❌ Erro ao buscar por user.id:", error);
          if (data) {
            console.log("✅ Perfil encontrado por user.id:", data);
            profileData = data;
          }
        }
        
        // 2. Se não encontrou por user.id, tentar por email (aluno) usando query direta
        if (!profileData && studentData.email) {
          console.log("🔍 Tentando buscar por email:", studentData.email);
          
          const { data: directData, error: directError } = await supabase
            .from('profiles')
            .select('id, nome, sobrenome, email, turma, user_type, avatar_url')
            .eq('email', studentData.email.toLowerCase())
            .eq('user_type', 'aluno')
            .maybeSingle();
          
          console.log("🔍 Resultado da busca direta no upload:", { directData, directError });
          
          if (directError) {
            console.error("❌ Erro ao buscar por email:", directError);
          } else if (directData) {
            console.log("✅ Perfil encontrado para upload:", directData);
            profileData = directData;
          } else {
            console.log("❌ Nenhum perfil encontrado para email:", studentData.email);
          }
        }

        // 3. Se ainda não encontrou, tentar por user.email (fallback)
        if (!profileData && user?.email) {
          console.log("🔍 Tentando buscar por user.email:", user.email);
          const { data, error } = await supabase
            .from("profiles")
            .select("id, email")
            .eq("email", user.email.toLowerCase())
            .maybeSingle();
          
          if (error) console.error("❌ Erro ao buscar por user.email:", error);
          if (data) {
            console.log("✅ Perfil encontrado por user.email:", data);
            profileData = data;
          }
        }

        if (!profileData?.id) {
          console.error("❌ Perfil não encontrado após todas as tentativas");
          console.error("🔍 Dados disponíveis:", { user, studentData });
          throw new Error('Perfil do usuário não encontrado. Verifique se você está logado corretamente.');
        }

        userId = profileData.id;
        setUserProfile(profileData);
        console.log("✅ Profile definido para upload:", profileData);
      }
      const fileExt = file.name.split(".").pop();
      // Usar timestamp para criar nome único e evitar cache
      const timestamp = Date.now();
      const filePath = `${userId}-${timestamp}.${fileExt}`;

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

      // 4. Atualizar avatar_url no banco usando update direto
      console.log("🔍 Tentando atualizar avatar_url para email:", studentData.email);
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: newAvatarUrl })
        .eq('email', studentData.email.toLowerCase())
        .eq('user_type', 'aluno');

      if (updateError) {
        console.error("❌ Erro ao atualizar avatar:", updateError);
        throw updateError;
      }

      console.log("✅ Avatar atualizado com sucesso!");

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
    const name = studentData.nomeUsuario || user?.email || 'User';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="relative group">
      <Avatar 
        className={`${sizeClasses[size]} border border-primary/20 transition-all ${uploading ? 'opacity-50' : ''} ${showUpload ? 'cursor-pointer hover:ring-2 hover:ring-primary/50 hover:ring-offset-2 hover:shadow-lg' : ''}`}
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