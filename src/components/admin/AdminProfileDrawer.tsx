import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AdminAvatar } from '@/components/admin/AdminAvatar';
import { LogOut, Pencil, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@supabase/supabase-js';

interface AdminProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  user: User | null;
}

export const AdminProfileDrawer = ({
  isOpen,
  onClose,
  onLogout,
  user,
}: AdminProfileDrawerProps) => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [nome, setNome] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const displayName =
    (user?.user_metadata?.nome_completo as string | undefined) ||
    user?.email?.split('@')[0] ||
    'Administrador';
  const displayEmail = user?.email || '';

  const handleStartEdit = () => {
    setNome(displayName);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setNome('');
  };

  const handleSaveNome = async () => {
    if (!nome.trim() || !user?.id) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('admin_users')
        .update({ nome_completo: nome.trim() })
        .eq('id', user.id);

      if (error) throw error;

      // Atualizar sessão no localStorage
      const saved = localStorage.getItem('admin_session');
      if (saved) {
        try {
          const session = JSON.parse(saved);
          session.nome_completo = nome.trim();
          localStorage.setItem('admin_session', JSON.stringify(session));
        } catch {
          // ignorar erro de parse
        }
      }

      toast({ title: 'Nome atualizado com sucesso.' });
      setIsEditing(false);
    } catch {
      toast({
        title: 'Erro ao atualizar nome.',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoutClick = () => {
    onClose();
    onLogout();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-80 sm:w-96 flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-gray-100">
          <SheetTitle className="text-base font-semibold text-gray-900">
            Meu Perfil
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-2">
            <div className="ring-2 ring-violet-400 ring-offset-2 rounded-full">
              <AdminAvatar size="lg" showUpload={true} />
            </div>
            <p className="text-xs text-gray-400">Clique na foto para alterar</p>
          </div>

          {/* Dados principais */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Dados Principais
            </h3>

            {/* Nome */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Nome</Label>
              {isEditing ? (
                <div className="flex gap-2">
                  <Input
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="flex-1 h-9 text-sm"
                    placeholder="Nome completo"
                    disabled={isSaving}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveNome();
                      if (e.key === 'Escape') handleCancelEdit();
                    }}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleSaveNome}
                    disabled={isSaving}
                    className="h-9 w-9 text-green-600 hover:text-green-700 hover:bg-green-50"
                    type="button"
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="h-9 w-9 text-gray-400 hover:text-gray-600"
                    type="button"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="text-sm text-gray-800 truncate">{displayName}</span>
                  <button
                    type="button"
                    onClick={handleStartEdit}
                    className="ml-2 text-gray-400 hover:text-violet-600 transition-colors flex-shrink-0"
                    title="Editar nome"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* E-mail */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">E-mail</Label>
              <div className="py-2 px-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-sm text-gray-500">{displayEmail}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="px-6 py-4 border-t border-gray-100 space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-2 text-sm border-gray-200 text-gray-700 hover:border-violet-300 hover:text-violet-700"
            onClick={handleStartEdit}
            type="button"
          >
            <Pencil className="w-4 h-4" />
            Editar Perfil
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-sm text-red-500 hover:text-red-700 hover:bg-red-50"
            onClick={handleLogoutClick}
            type="button"
          >
            <LogOut className="w-4 h-4" />
            Sair da conta
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
