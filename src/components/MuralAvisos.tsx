import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { MessageSquare, ExternalLink, AlertTriangle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
interface Aviso {
  id: string;
  titulo: string;
  descricao: string;
  turmas_autorizadas: string[] | null;
  imagem_url?: string;
  link_externo?: string;
  prioridade: string;
  criado_em: string;
}
interface AvisoLeitura {
  id: string;
  aviso_id: string;
  nome_aluno: string;
  sobrenome_aluno: string;
}
const formSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  sobrenome: z.string().min(2, "Sobrenome deve ter pelo menos 2 caracteres")
});
interface MuralAvisosProps {
  turmaCode: string;
}
export const MuralAvisos = ({
  turmaCode
}: MuralAvisosProps) => {
  const {
    studentData
  } = useStudentAuth();
  const {
    toast
  } = useToast();
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [leituras, setLeituras] = useState<AvisoLeitura[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openModal, setOpenModal] = useState<string | null>(null);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: "",
      sobrenome: ""
    }
  });
  useEffect(() => {
    fetchAvisos();
    fetchLeituras();
  }, [turmaCode]);
  const fetchAvisos = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("avisos").select("*").eq("status", "publicado").eq("ativo", true).order("criado_em", {
        ascending: false
      });
      if (error) throw error;

      // Filtrar avisos pela turma
      const avisosFiltrados = (data || []).filter(aviso => {
        const turmasAutorizadas = aviso.turmas_autorizadas || [];
        const isVisitante = studentData.userType === "visitante";

        // Se for visitante, não mostrar avisos (ou implementar lógica específica)
        if (isVisitante) return false;

        // Se não há turmas especificadas, mostrar para todos
        if (turmasAutorizadas.length === 0) return true;

        // Verificar se a turma do usuário está autorizada (case-insensitive)
        return turmasAutorizadas.some(turma => turma.toUpperCase() === turmaCode.toUpperCase());
      });
      setAvisos(avisosFiltrados);
    } catch (error) {
      console.error("Erro ao buscar avisos:", error);
    } finally {
      setIsLoading(false);
    }
  };
  const fetchLeituras = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("avisos_leitura").select("*");
      if (error) throw error;
      setLeituras(data || []);
    } catch (error) {
      console.error("Erro ao buscar leituras:", error);
    }
  };
  const handleConfirmarLeitura = async (values: z.infer<typeof formSchema>, avisoId: string) => {
    try {
      const {
        error
      } = await supabase.from("avisos_leitura").insert([{
        aviso_id: avisoId,
        nome_aluno: values.nome,
        sobrenome_aluno: values.sobrenome,
        turma: turmaCode,
        email_aluno: studentData.nomeUsuario || null
      }]);
      if (error) {
        if (error.code === '23505') {
          // Unique constraint violation
          toast({
            title: "Leitura já confirmada",
            description: "Você já confirmou a leitura deste aviso.",
            variant: "destructive"
          });
        } else {
          throw error;
        }
        return;
      }
      toast({
        title: "Leitura confirmada!",
        description: "Sua confirmação de leitura foi registrada com sucesso."
      });
      form.reset();
      setOpenModal(null);
      fetchLeituras();
    } catch (error) {
      console.error("Erro ao confirmar leitura:", error);
      toast({
        title: "Erro",
        description: "Não foi possível confirmar a leitura. Tente novamente.",
        variant: "destructive"
      });
    }
  };
  const jaLeu = (avisoId: string) => {
    return leituras.some(leitura => leitura.aviso_id === avisoId && leitura.nome_aluno.toLowerCase() === form.watch("nome")?.toLowerCase() && leitura.sobrenome_aluno.toLowerCase() === form.watch("sobrenome")?.toLowerCase());
  };
  if (isLoading) {
    return <Card className="mb-6">
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">Carregando avisos...</p>
        </CardContent>
      </Card>;
  }
  if (avisos.length === 0) {
    return <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Mural de Avisos
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">
            Nenhum aviso disponível no momento. Fique atento às atualizações da coordenação.
          </p>
        </CardContent>
      </Card>;
  }
  return <Card className="mb-8 bg-white/80 backdrop-blur-sm border-0 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-t-lg">
        <CardTitle className="flex items-center gap-3 text-primary">
          <div className="p-2 bg-gradient-to-r from-primary to-secondary rounded-lg">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold">Mural de Avisos</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-6">
        {avisos.map(aviso => <Card key={aviso.id} className={`${aviso.prioridade === 'destaque' ? 'border-l-4 border-l-orange-500 bg-orange-50 dark:bg-orange-950/20' : ''}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {aviso.prioridade === 'destaque' && <AlertTriangle className="w-5 h-5 text-orange-500" />}
                    {aviso.titulo}
                  </CardTitle>
                  {aviso.prioridade === 'destaque' && <Badge variant="secondary" className="mt-2 bg-orange-100 text-orange-800">
                      Destaque
                    </Badge>}
                </div>
                <span className="text-sm text-muted-foreground">
                  {new Date(aviso.criado_em).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {aviso.descricao}
              </div>
              
              {aviso.imagem_url && <div className="mt-3">
                  <img src={aviso.imagem_url} alt="Imagem do aviso" className="max-w-full h-auto rounded-lg border" />
                </div>}
              
              <div className="flex flex-col sm:flex-row gap-2 pt-3">
                {aviso.link_externo && <Button variant="outline" size="sm" onClick={() => window.open(aviso.link_externo, '_blank')} className="w-full sm:w-auto">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Acessar Link
                  </Button>}
                
                <Dialog open={openModal === aviso.id} onOpenChange={open => setOpenModal(open ? aviso.id : null)}>
                  <DialogTrigger asChild>
                    <Button variant="default" size="sm" className="w-full sm:w-auto">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Confirmar Leitura
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(values => handleConfirmarLeitura(values, aviso.id))}>
                        <DialogHeader>
                          <DialogTitle>Confirmar Leitura</DialogTitle>
                          <DialogDescription>
                            Para confirmar que você leu este aviso, informe seu nome completo:
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="grid gap-4 py-4">
                          <FormField control={form.control} name="nome" render={({
                        field
                      }) => <FormItem>
                                <FormLabel>Nome</FormLabel>
                                <FormControl>
                                  <Input placeholder="Seu nome" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>} />
                          
                          <FormField control={form.control} name="sobrenome" render={({
                        field
                      }) => <FormItem>
                                <FormLabel>Sobrenome</FormLabel>
                                <FormControl>
                                  <Input placeholder="Seu sobrenome" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>} />
                        </div>
                        
                        <DialogFooter>
                          <Button type="submit">
                            Confirmar Leitura
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>)}
      </CardContent>
    </Card>;
};