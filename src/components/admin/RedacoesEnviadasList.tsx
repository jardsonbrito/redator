
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Copy, Search, User, Calendar, FileText } from 'lucide-react';
import { useRedacoesEnviadas } from '@/hooks/useRedacoesEnviadas';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface RedacoesEnviadasListProps {
  filtroStatus?: string;
  titulo: string;
}

export const RedacoesEnviadasList = ({ filtroStatus, titulo }: RedacoesEnviadasListProps) => {
  const { redacoes, loading, searchTerm, setSearchTerm, handleDeleteRedacao, handleCopyRedacao } = useRedacoesEnviadas(filtroStatus);

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-2">Carregando redações...</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (redacao: any) => {
    if (redacao.corrigida) {
      return <Badge className="bg-green-600 text-white">Corrigida</Badge>;
    }
    return <Badge className="bg-yellow-600 text-white">Pendente</Badge>;
  };

  const getCorretorInfo = (redacao: any) => {
    const corretores = [];
    if (redacao.corretor_nome_1) corretores.push(redacao.corretor_nome_1);
    if (redacao.corretor_nome_2) corretores.push(redacao.corretor_nome_2);
    
    if (corretores.length === 0) return "Não atribuído";
    return corretores.join(" • ");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {titulo} ({redacoes.length} redações)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email, turma ou tema..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {redacoes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-8 h-8 mx-auto mb-2" />
              <p>Nenhuma redação encontrada</p>
            </div>
          ) : (
            <div className="space-y-4">
              {redacoes.map((redacao) => (
                <Card key={redacao.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start gap-2">
                          <User className="w-4 h-4 text-muted-foreground mt-1" />
                          <div>
                            <h3 className="font-semibold">{redacao.nome_aluno}</h3>
                            <p className="text-sm text-muted-foreground">{redacao.email_aluno}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{redacao.turma}</Badge>
                          {getStatusBadge(redacao)}
                          {redacao.nota_total && (
                            <Badge className="bg-blue-600 text-white">
                              Nota: {redacao.nota_total}/1000
                            </Badge>
                          )}
                        </div>

                        <div>
                          <p className="text-sm font-medium text-gray-900 mb-1">
                            Tema: {redacao.frase_tematica}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Corretor(es): {getCorretorInfo(redacao)}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>
                            Enviada em: {new Date(redacao.data_envio).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyRedacao(redacao)}
                          title="Copiar redação"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          title="Editar redação"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir a redação de {redacao.nome_aluno}? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteRedacao(redacao.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
