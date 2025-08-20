import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CorretorLayout } from '@/components/corretor/CorretorLayout';
import { LousaRespostasCorretor } from '@/components/corretor/LousaRespostasCorretor';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function CorretorLousaDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: lousa, isLoading } = useQuery({
    queryKey: ['lousa', id],
    queryFn: async () => {
      if (!id) throw new Error('ID da lousa não fornecido');
      
      const { data, error } = await supabase
        .from('lousa')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  if (isLoading) {
    return (
      <CorretorLayout>
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </CorretorLayout>
    );
  }

  if (!lousa) {
    return (
      <CorretorLayout>
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold mb-2">Lousa não encontrada</h2>
          <Button onClick={() => navigate('/corretor/lousas')}>
            Voltar para Lousas
          </Button>
        </div>
      </CorretorLayout>
    );
  }

  return (
    <CorretorLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/corretor/lousas')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>

        <LousaRespostasCorretor lousa={lousa} />
      </div>
    </CorretorLayout>
  );
}