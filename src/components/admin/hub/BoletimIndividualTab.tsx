import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Search, Award } from 'lucide-react';
import { BoletimEscolarView } from '@/components/shared/BoletimEscolarView';
import { Badge } from '@/components/ui/badge';

interface AlunoOpcao {
  id: string;
  nome: string;
  sobrenome: string;
  email: string;
  turma: string;
}

export function BoletimIndividualTab() {
  const [alunos, setAlunos] = useState<AlunoOpcao[]>([]);
  const [busca, setBusca] = useState('');
  const [selecionado, setSelecionado] = useState<AlunoOpcao | null>(null);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, nome, sobrenome, email, turma')
      .eq('user_type', 'aluno')
      .eq('is_authenticated_student', true)
      .order('nome')
      .then(({ data }) => setAlunos((data as AlunoOpcao[]) ?? []));
  }, []);

  const filtrados = busca.trim().length < 1
    ? alunos
    : alunos.filter(a => {
        const q = busca.toLowerCase();
        return (
          a.nome?.toLowerCase().includes(q) ||
          a.sobrenome?.toLowerCase().includes(q) ||
          a.email?.toLowerCase().includes(q) ||
          a.turma?.toLowerCase().includes(q)
        );
      });

  if (selecionado) {
    return (
      <div>
        {/* Breadcrumb do aluno selecionado */}
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <button
            onClick={() => setSelecionado(null)}
            className="text-xs text-primary hover:underline font-medium"
          >
            ← Selecionar outro aluno
          </button>
          <span className="text-xs text-muted-foreground">/</span>
          <span className="text-xs font-semibold text-foreground">
            {selecionado.nome} {selecionado.sobrenome}
          </span>
          <Badge variant="outline" className="text-xs">{selecionado.turma}</Badge>
        </div>

        <BoletimEscolarView
          email={selecionado.email}
          turma={selecionado.turma}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Award className="h-5 w-5 text-primary" />
        <h2 className="text-base font-semibold">Boletim Individual</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Selecione um aluno para visualizar o boletim escolar dele, igual ao que ele vê na plataforma.
      </p>

      {/* Busca */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, email ou turma..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Lista de alunos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[60vh] overflow-y-auto pr-1">
        {filtrados.map((a) => (
          <button
            key={a.id}
            onClick={() => setSelecionado(a)}
            className="text-left rounded-xl border bg-card p-3 hover:border-primary hover:bg-primary/5 transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-black shrink-0">
                {(a.nome?.[0] ?? '').toUpperCase()}{(a.sobrenome?.[0] ?? '').toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary">
                  {a.nome} {a.sobrenome}
                </p>
                <p className="text-xs text-muted-foreground truncate">{a.email}</p>
                <Badge variant="outline" className="text-[10px] mt-0.5">{a.turma}</Badge>
              </div>
            </div>
          </button>
        ))}

        {filtrados.length === 0 && (
          <div className="col-span-full py-10 text-center text-muted-foreground text-sm">
            Nenhum aluno encontrado.
          </div>
        )}
      </div>
    </div>
  );
}
