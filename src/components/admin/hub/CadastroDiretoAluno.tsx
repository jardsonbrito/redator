import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTurmasAtivas } from '@/hooks/useTurmasAtivas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Loader2, CheckCircle } from 'lucide-react';

const schema = z.object({
  nome_completo: z.string().min(2, 'Informe o nome completo'),
  email: z.string().email('E-mail inválido'),
  turma_id: z.string().min(1, 'Selecione a turma'),
});

type FormData = z.infer<typeof schema>;

interface ResultadoCadastro {
  tipo: 'criado' | 'vinculado' | 'ja_vinculado';
  nome: string;
  email: string;
}

export function CadastroDiretoAluno() {
  const { toast } = useToast();
  const { turmasDinamicas } = useTurmasAtivas();
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<ResultadoCadastro | null>(null);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const turmaIdSelecionada = watch('turma_id');

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setResultado(null);
    try {
      // Buscar dados da turma selecionada
      const { data: turma, error: turmaErr } = await supabase
        .from('turmas_alunos')
        .select('id, nome, codigo_acesso')
        .eq('id', data.turma_id)
        .single();

      if (turmaErr || !turma) throw new Error('Turma não encontrada');

      const email = data.email.toLowerCase().trim();
      const nomeCompleto = data.nome_completo.trim();
      const partes = nomeCompleto.split(' ');
      const primeiro = partes[0];
      const sobrenome = partes.slice(1).join(' ') || '-';

      // Verificar se o e-mail já existe
      const { data: perfilExistente } = await supabase
        .from('profiles')
        .select('id, turma, turma_id')
        .eq('email', email)
        .maybeSingle();

      if (perfilExistente) {
        // Já vinculado à mesma turma
        if (perfilExistente.turma_id === turma.id) {
          setResultado({ tipo: 'ja_vinculado', nome: nomeCompleto, email });
          return;
        }

        // Existe mas em outra turma → atualiza vínculo
        const { error: updateErr } = await supabase
          .from('profiles')
          .update({
            turma: turma.codigo_acesso,
            turma_id: turma.id,
            ativo: true,
          })
          .eq('id', perfilExistente.id);

        if (updateErr) throw updateErr;
        setResultado({ tipo: 'vinculado', nome: nomeCompleto, email });
      } else {
        // Novo aluno — criar perfil
        const { error: insertErr } = await supabase
          .from('profiles')
          .insert({
            nome: primeiro,
            sobrenome,
            email,
            turma: turma.codigo_acesso,
            turma_id: turma.id,
            user_type: 'aluno',
            ativo: true,
            is_authenticated_student: false,
          });

        if (insertErr) throw insertErr;
        setResultado({ tipo: 'criado', nome: nomeCompleto, email });
      }

      reset();
    } catch (err: any) {
      toast({
        title: 'Erro ao cadastrar aluno',
        description: err.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const mensagemResultado = {
    criado: { icon: '✅', texto: 'Aluno criado e vinculado à turma com sucesso.' },
    vinculado: { icon: '🔄', texto: 'Aluno já existia no sistema e foi vinculado à nova turma.' },
    ja_vinculado: { icon: 'ℹ️', texto: 'Aluno já estava vinculado a essa turma. Nenhuma alteração foi feita.' },
  };

  return (
    <div className="max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="w-4 h-4" />
            Cadastro Direto de Aluno
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Cadastre o aluno imediatamente, sem necessidade de convite. O aluno poderá acessar a plataforma pelo link de autoatendimento.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="nome_completo">Nome completo *</Label>
              <Input
                id="nome_completo"
                placeholder="Ex: João da Silva"
                {...register('nome_completo')}
              />
              {errors.nome_completo && (
                <p className="text-xs text-destructive">{errors.nome_completo.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                placeholder="aluno@exemplo.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label>Turma *</Label>
              <Select
                value={turmaIdSelecionada || ''}
                onValueChange={(v) => setValue('turma_id', v, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a turma..." />
                </SelectTrigger>
                <SelectContent>
                  {turmasDinamicas.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.turma_id && (
                <p className="text-xs text-destructive">{errors.turma_id.message}</p>
              )}
            </div>

            {resultado && (
              <div className="rounded-lg bg-muted px-4 py-3 text-sm flex items-start gap-2">
                <span>{mensagemResultado[resultado.tipo].icon}</span>
                <div>
                  <p className="font-medium">{resultado.nome} — {resultado.email}</p>
                  <p className="text-muted-foreground">{mensagemResultado[resultado.tipo].texto}</p>
                </div>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Cadastrando...</>
              ) : (
                <><CheckCircle className="w-4 h-4 mr-2" />Cadastrar aluno</>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
