import { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfessorAuth } from '@/hooks/useProfessorAuth';
import { useToast } from '@/hooks/use-toast';

interface ProfessorAvatarProps {
  size?: 'sm' | 'md' | 'lg';
  showUpload?: boolean;
  onAvatarUpdate?: (hasAvatar: boolean) => void;
}

export const ProfessorAvatar = ({ size = 'md', showUpload = true, onAvatarUpdate }: ProfessorAvatarProps) => {
  const { user } = useAuth();
  const { professor } = useProfessorAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Carregar avatar do professor
  useEffect(() => {
    const loadAvatar = async () => {
      try {
        let profileData = null;
        
        console.log('🔍 Carregando avatar do professor. user?.id:', user?.id, 'professor.email:', professor.email);
        
        // Buscar por user.id primeiro (professor autenticado)
        if (user?.id) {
          const { data, error } = await supabase
            .from('profiles')
            .select('avatar_url, id, email')
            .eq('id', user.id)
            .maybeSingle();
          
          if (error) console.error('❌ Erro ao buscar avatar do professor por user.id:', error);
          if (data) {
            console.log('✅ Perfil do professor encontrado por user.id:', data);
            profileData = data;
          }
        }
        
        // Fallback para buscar por email se não encontrou por ID
        if (!profileData && professor.email) {
          const { data, error } = await supabase
            .from('profiles')
            .select('avatar_url, id, email')
            .eq('email', professor.email.toLowerCase())
            .maybeSingle();
          
          if (error) console.error('❌ Erro ao buscar avatar do professor por email:', error);
          if (data) {
            console.log('✅ Perfil do professor encontrado por email:', data);
            profileData = data;
          }
        }

        // Se encontrou perfil com avatar_url, gerar URL pública
        if (profileData?.avatar_url) {
          let finalAvatarUrl: string;
          
          // Verificar se é URL externa (http/https) ou arquivo do Storage
          if (profileData.avatar_url.startsWith('http')) {
            finalAvatarUrl = profileData.avatar_url;
            console.log('🌐 Usando avatar externo do professor:', finalAvatarUrl);
          } else {
            // Arquivo do Storage
            const cleanPath = profileData.avatar_url.startsWith('avatars/') 
              ? profileData.avatar_url.substring(8) 
              : profileData.avatar_url;
            
            const { data } = supabase.storage
              .from('avatars')
              .getPublicUrl(cleanPath);
            
            finalAvatarUrl = data.publicUrl;
            console.log('📁 Usando avatar do professor do Storage:', finalAvatarUrl);
          }
          
          setAvatarUrl(finalAvatarUrl);
          onAvatarUpdate?.(true);
          setUserProfile(profileData);
          
          console.log('✅ Avatar do professor carregado:', finalAvatarUrl);
        } else {
          setAvatarUrl(null);
          onAvatarUpdate?.(false);
          setUserProfile(profileData);
          console.log('ℹ️ Professor sem avatar configurado');
        }
      } catch (error) {
        console.error('❌ Erro ao carregar avatar do professor:', error);
        setAvatarUrl(null);
        onAvatarUpdate?.(false);
      }
    };

    loadAvatar();
  }, [user, professor.email, onAvatarUpdate]);

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
      // Usar perfil já carregado ou buscar user.id
      let userId = userProfile?.id || user?.id;
      
      if (!userId) {
        console.error('❌ Perfil do professor não encontrado para upload');
        throw new Error('Perfil do professor não encontrado. Verifique se você está logado corretamente.');
      }

      const fileExt = file.name.split(".").pop();
      const timestamp = Date.now();
      const filePath = `${userId}-${timestamp}.${fileExt}`;

      console.log("📁 Path do novo avatar do professor:", filePath);

      // Upload no Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { 
          cacheControl: '3600',
          upsert: true 
        });

      if (uploadError) {
        console.error("❌ Erro no upload do avatar do professor:", uploadError);
        throw uploadError;
      }

      console.log("✅ Upload do avatar do professor realizado com sucesso!");

      // Gerar URL pública
      const { data: publicData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);
      
      const newAvatarUrl = publicData.publicUrl;
      
      console.log("🌐 Nova URL pública do professor:", newAvatarUrl);

      // Atualizar avatar_url no banco
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: filePath })
        .eq('id', userId);

      if (updateError) {
        console.error("❌ Erro ao atualizar avatar do professor no banco:", updateError);
        throw updateError;
      }

      console.log("✅ Avatar do professor atualizado no banco!");

      // Atualizar visualização
      setAvatarUrl(newAvatarUrl);
      onAvatarUpdate?.(true);
      
      console.log("✅ Avatar do professor atualizado com sucesso! Nova URL:", newAvatarUrl);

      toast({
        title: 'Sucesso',
        description: 'Foto de perfil atualizada com sucesso!',
      });

    } catch (error) {
      console.error("❌ Erro inesperado no upload do professor:", error);
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
    if (fileInputRef.current && showUpload) {
      console.log('🖱️ Avatar do professor clicado. Abrindo seletor de arquivo...');
      fileInputRef.current.click();
    }
  };

  const getInitials = () => {
    const name = professor.nome_completo || user?.email || 'Professor';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="relative group">
      <Avatar 
        className={`${sizeClasses[size]} border border-primary/20 transition-all ${uploading ? 'opacity-50' : ''} ${showUpload ? 'cursor-pointer hover:ring-2 hover:ring-primary/50 hover:ring-offset-2 hover:shadow-lg' : ''}`}
        onClick={handleAvatarClick}
      >
        {avatarUrl && (
          <AvatarImage 
            src={avatarUrl} 
            alt="Avatar do professor"
            className="object-cover"
          />
        )}
        <AvatarFallback className="bg-primary/10 text-primary">
          {professor.nome_completo ? getInitials() : <User className={size === 'lg' ? 'w-8 h-8' : 'w-5 h-5'} />}
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