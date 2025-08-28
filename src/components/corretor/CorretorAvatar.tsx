import { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCorretorAuth } from '@/hooks/useCorretorAuth';
import { useToast } from '@/hooks/use-toast';

interface CorretorAvatarProps {
  size?: 'sm' | 'md' | 'lg';
  showUpload?: boolean;
  onAvatarUpdate?: (hasAvatar: boolean) => void;
}

export const CorretorAvatar = ({ size = 'md', showUpload = true, onAvatarUpdate }: CorretorAvatarProps) => {
  const { corretor } = useCorretorAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Carregar avatar do corretor - SEMPRE da tabela profiles
  useEffect(() => {
    const loadAvatar = async () => {
      try {
        let profileData = null;
        
        console.log('🔍 Carregando avatar do corretor. corretor.email:', corretor.email);
        
        // Buscar por email do corretor
        if (corretor.email) {
          const { data, error } = await supabase
            .from('profiles')
            .select('avatar_url, id, email')
            .eq('email', corretor.email.toLowerCase())
            .maybeSingle();
          
          if (error) console.error('❌ Erro ao buscar avatar do corretor:', error);
          if (data) {
            console.log('✅ Perfil do corretor encontrado:', data);
            profileData = data;
          }
        }

        // Se encontrou perfil com avatar_url, gerar URL pública
        if (profileData?.avatar_url) {
          let finalAvatarUrl: string;
          
          // Verificar se é URL externa (http/https) ou arquivo do Storage
          if (profileData.avatar_url.startsWith('http')) {
            finalAvatarUrl = profileData.avatar_url;
            console.log('🌐 Usando avatar externo do corretor:', finalAvatarUrl);
          } else {
            // Arquivo do Storage
            const cleanPath = profileData.avatar_url.startsWith('avatars/') 
              ? profileData.avatar_url.substring(8) 
              : profileData.avatar_url;
            
            const { data } = supabase.storage
              .from('avatars')
              .getPublicUrl(cleanPath);
            
            finalAvatarUrl = data.publicUrl;
            console.log('📁 Usando avatar do corretor do Storage:', finalAvatarUrl);
          }
          
          setAvatarUrl(finalAvatarUrl);
          onAvatarUpdate?.(true);
          setUserProfile(profileData);
          
          console.log('✅ Avatar do corretor carregado:', finalAvatarUrl);
        } else {
          setAvatarUrl(null);
          onAvatarUpdate?.(false);
          setUserProfile(profileData);
          console.log('ℹ️ Corretor sem avatar configurado');
        }
      } catch (error) {
        console.error('❌ Erro ao carregar avatar do corretor:', error);
        setAvatarUrl(null);
        onAvatarUpdate?.(false);
      }
    };

    if (corretor.email) {
      loadAvatar();
    }
  }, [corretor.email, onAvatarUpdate]);

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
      // Usar perfil já carregado ou buscar pelo email
      let userId = userProfile?.id;
      
      if (!userId && corretor.email) {
        console.log("🔍 Buscando perfil do corretor para upload...");
        const { data: profileData, error } = await supabase
          .from("profiles")
          .select("id, email")
          .eq("email", corretor.email.toLowerCase())
          .maybeSingle();
        
        if (error || !profileData) {
          console.error("❌ Perfil do corretor não encontrado:", error);
          throw new Error('Perfil do corretor não encontrado. Verifique se você está logado corretamente.');
        }
        
        userId = profileData.id;
        setUserProfile(profileData);
        console.log("✅ Profile do corretor definido para upload:", profileData);
      }

      if (!userId) {
        throw new Error('Perfil do corretor não encontrado.');
      }

      const fileExt = file.name.split(".").pop();
      const timestamp = Date.now();
      const filePath = `${userId}-${timestamp}.${fileExt}`;

      console.log("📁 Path do novo avatar do corretor:", filePath);

      // Upload no Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { 
          cacheControl: '3600',
          upsert: true 
        });

      if (uploadError) {
        console.error("❌ Erro no upload do avatar do corretor:", uploadError);
        throw uploadError;
      }

      console.log("✅ Upload do avatar do corretor realizado com sucesso!");

      // Gerar URL pública
      const { data: publicData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);
      
      const newAvatarUrl = publicData.publicUrl;
      
      console.log("🌐 Nova URL pública do corretor:", newAvatarUrl);

      // Atualizar avatar_url no banco
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: filePath })
        .eq('id', userId);

      if (updateError) {
        console.error("❌ Erro ao atualizar avatar do corretor no banco:", updateError);
        throw updateError;
      }

      console.log("✅ Avatar do corretor atualizado no banco!");

      // Atualizar visualização
      setAvatarUrl(newAvatarUrl);
      onAvatarUpdate?.(true);
      
      console.log("✅ Avatar do corretor atualizado com sucesso! Nova URL:", newAvatarUrl);

      toast({
        title: 'Sucesso',
        description: 'Foto de perfil atualizada com sucesso!',
      });

    } catch (error) {
      console.error("❌ Erro inesperado no upload do corretor:", error);
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
      console.log('🖱️ Avatar do corretor clicado. Abrindo seletor de arquivo...');
      fileInputRef.current.click();
    }
  };

  const getInitials = () => {
    const name = corretor.nome_completo || 'Corretor';
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
            alt="Avatar do corretor"
            className="object-cover"
          />
        )}
        <AvatarFallback className="bg-primary/10 text-primary">
          {corretor.nome_completo ? getInitials() : <User className={size === 'lg' ? 'w-8 h-8' : 'w-5 h-5'} />}
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