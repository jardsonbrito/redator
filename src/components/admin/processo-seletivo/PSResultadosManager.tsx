import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Award,
  Trophy,
  MessageSquare,
  Save,
  Plus,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
  Percent,
  Medal,
  Edit2
} from 'lucide-react';
import { useProcessoSeletivoAdmin, RankingCandidato } from '@/hooks/useProcessoSeletivoAdmin';
import { BolsaConfig, Candidato } from '@/hooks/useProcessoSeletivo';
import { cn } from '@/lib/utils';

export const PSResultadosManager: React.FC = () => {
  const {
    formularioAtivo,
    candidatos,
    resultadoConfig,
    ranking,
    isLoadingRanking,
    isLoadingResultadoConfig,
    salvarConfigResultado,
    atualizarCandidatoResultado,
    togglePublicacaoResultados,
    recalcularClassificacoes,
    refetchRanking,
    isSalvandoResultado,
    isPublicandoResultados,
    isRecalculandoClassificacoes
  } = useProcessoSeletivoAdmin();

  // Estado para configuração de bolsas
  const [bolsas, setBolsas] = useState<BolsaConfig[]>([]);
  const [novaBolsa, setNovaBolsa] = useState({ nome: '', percentual: 0, vagas: 1 });
  const [showAddBolsa, setShowAddBolsa] = useState(false);

  // Estado para edição de mensagem individual
  const [editandoCandidato, setEditandoCandidato] = useState<{
    id: string;
    nome: string;
    mensagem: string;
    bolsa: string;
    percentual: number;
    classificacao: number;
  } | null>(null);

  // Carregar bolsas do config
  useEffect(() => {
    if (resultadoConfig?.bolsas) {
      setBolsas(resultadoConfig.bolsas);
    }
  }, [resultadoConfig]);

  // Adicionar bolsa
  const handleAdicionarBolsa = () => {
    if (!novaBolsa.nome.trim() || novaBolsa.percentual <= 0) return;

    const novasBolsas = [...bolsas, { ...novaBolsa }];
    setBolsas(novasBolsas);
    salvarConfigResultado({ bolsas: novasBolsas });
    setNovaBolsa({ nome: '', percentual: 0, vagas: 1 });
    setShowAddBolsa(false);
  };

  // Remover bolsa
  const handleRemoverBolsa = (index: number) => {
    const novasBolsas = bolsas.filter((_, i) => i !== index);
    setBolsas(novasBolsas);
    salvarConfigResultado({ bolsas: novasBolsas });
  };

  // Abrir editor de candidato
  const handleEditarCandidato = (candidatoId: string) => {
    const candidato = candidatos?.find(c => c.id === candidatoId);
    const rankingItem = ranking?.find(r => r.candidato_id === candidatoId);
    const candidatoComRanking = candidatosComRanking?.find(c => c.candidato_id === candidatoId);

    // Usar dados do ranking se candidato não for encontrado na lista principal
    const nome = candidato?.nome_aluno || rankingItem?.nome_aluno || candidatoComRanking?.nome_aluno || '';
    const mensagem = candidato?.mensagem_resultado || candidatoComRanking?.mensagem_resultado || '';
    const bolsa = candidato?.bolsa_conquistada || candidatoComRanking?.bolsa_conquistada || '';
    const percentual = candidato?.percentual_bolsa || candidatoComRanking?.percentual_bolsa || 0;
    const classificacao = rankingItem?.classificacao || candidato?.classificacao || 0;

    setEditandoCandidato({
      id: candidatoId,
      nome,
      mensagem,
      bolsa,
      percentual,
      classificacao
    });
  };

  // Salvar edição do candidato
  const handleSalvarCandidato = () => {
    if (!editandoCandidato) return;

    atualizarCandidatoResultado({
      candidatoId: editandoCandidato.id,
      mensagem: editandoCandidato.mensagem,
      bolsa: editandoCandidato.bolsa || undefined,
      percentual: editandoCandidato.percentual || undefined,
      classificacao: editandoCandidato.classificacao || undefined
    });

    setEditandoCandidato(null);
  };

  // Selecionar bolsa para candidato
  const handleSelecionarBolsa = (bolsaNome: string) => {
    if (!editandoCandidato) return;

    const bolsaSelecionada = bolsas.find(b => b.nome === bolsaNome);
    setEditandoCandidato({
      ...editandoCandidato,
      bolsa: bolsaNome,
      percentual: bolsaSelecionada?.percentual || 0
    });
  };

  // Combinar ranking com dados dos candidatos
  const candidatosComRanking = ranking?.map(r => {
    const candidato = candidatos?.find(c => c.id === r.candidato_id);
    return {
      ...r,
      bolsa_conquistada: candidato?.bolsa_conquistada,
      percentual_bolsa: candidato?.percentual_bolsa,
      mensagem_resultado: candidato?.mensagem_resultado
    };
  }) || [];

  if (!formularioAtivo) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum formulário ativo encontrado.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com Status de Publicação */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Award className="w-5 h-5 text-purple-600" />
            Gerenciamento de Resultados
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Configure as bolsas, defina mensagens individuais e publique os resultados
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {resultadoConfig?.resultado_publicado ? (
              <Eye className="w-4 h-4 text-green-600" />
            ) : (
              <EyeOff className="w-4 h-4 text-gray-400" />
            )}
            <span className="text-sm">Resultados</span>
            <Switch
              checked={resultadoConfig?.resultado_publicado || false}
              onCheckedChange={(checked) => togglePublicacaoResultados(checked)}
              disabled={isPublicandoResultados}
            />
            <span className="text-sm font-medium">
              {resultadoConfig?.resultado_publicado ? 'Publicados' : 'Ocultos'}
            </span>
          </div>
        </div>
      </div>

      {/* Configuração de Bolsas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Percent className="w-4 h-4" />
            Configuração de Bolsas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bolsas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma bolsa configurada. Adicione tipos de bolsa para atribuir aos candidatos.
            </p>
          ) : (
            <div className="flex flex-wrap gap-3 mb-4">
              {bolsas.map((bolsa, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2"
                >
                  <Medal className="w-4 h-4 text-purple-600" />
                  <span className="font-medium">{bolsa.nome}</span>
                  <Badge variant="secondary">{bolsa.percentual}%</Badge>
                  <span className="text-xs text-muted-foreground">
                    ({bolsa.vagas} vaga{bolsa.vagas !== 1 ? 's' : ''})
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handleRemoverBolsa(index)}
                  >
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {showAddBolsa ? (
            <div className="border rounded-lg p-4 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Nome da Bolsa</Label>
                  <Input
                    placeholder="Ex: Bolsa Integral"
                    value={novaBolsa.nome}
                    onChange={(e) => setNovaBolsa({ ...novaBolsa, nome: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Percentual (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={novaBolsa.percentual}
                    onChange={(e) => setNovaBolsa({ ...novaBolsa, percentual: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Vagas</Label>
                  <Input
                    type="number"
                    min={1}
                    value={novaBolsa.vagas}
                    onChange={(e) => setNovaBolsa({ ...novaBolsa, vagas: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAdicionarBolsa} disabled={isSalvandoResultado} className="bg-[#3F0077] hover:bg-[#662F96]">
                  <Save className="w-4 h-4 mr-2" />
                  Adicionar
                </Button>
                <Button variant="outline" onClick={() => setShowAddBolsa(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => setShowAddBolsa(true)}
              className="border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Tipo de Bolsa
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Ranking e Atribuição de Resultados */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Ranking de Candidatos
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                recalcularClassificacoes();
                refetchRanking();
              }}
              disabled={isRecalculandoClassificacoes || isLoadingRanking}
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", (isRecalculandoClassificacoes || isLoadingRanking) && "animate-spin")} />
              Atualizar Ranking
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingRanking ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando ranking...
            </div>
          ) : candidatosComRanking.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum candidato concluído encontrado. O ranking é calculado apenas para candidatos que enviaram a redação.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16 text-center">#</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead className="text-center">Nota</TableHead>
                    <TableHead>Bolsa</TableHead>
                    <TableHead>Mensagem</TableHead>
                    <TableHead className="w-20 text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidatosComRanking.map((item) => (
                    <TableRow key={item.candidato_id}>
                      <TableCell className="text-center">
                        <div className={cn(
                          "inline-flex items-center justify-center w-8 h-8 rounded-full font-bold",
                          item.classificacao === 1 && "bg-yellow-100 text-yellow-700",
                          item.classificacao === 2 && "bg-gray-100 text-gray-700",
                          item.classificacao === 3 && "bg-orange-100 text-orange-700",
                          item.classificacao > 3 && "bg-muted text-muted-foreground"
                        )}>
                          {item.classificacao}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.nome_aluno}</p>
                          <p className="text-xs text-muted-foreground">{item.email_aluno}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="text-lg font-bold">
                          {item.nota_total}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.bolsa_conquistada ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                            {item.bolsa_conquistada} ({item.percentual_bolsa}%)
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.mensagem_resultado ? (
                          <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
                            {item.mensagem_resultado.substring(0, 50)}
                            {item.mensagem_resultado.length > 50 && '...'}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditarCandidato(item.candidato_id)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Edição de Candidato */}
      <Dialog open={!!editandoCandidato} onOpenChange={() => setEditandoCandidato(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Editar Resultado - {editandoCandidato?.nome}
            </DialogTitle>
          </DialogHeader>

          {editandoCandidato && (
            <div className="space-y-4">
              {/* Classificação */}
              <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                <Trophy className="w-5 h-5 text-yellow-600" />
                <div>
                  <span className="text-sm text-muted-foreground">Classificação:</span>
                  <span className="ml-2 font-bold text-lg">{editandoCandidato.classificacao}º lugar</span>
                </div>
              </div>

              {/* Seleção de Bolsa */}
              <div className="space-y-2">
                <Label>Bolsa Conquistada</Label>
                <Select
                  value={editandoCandidato.bolsa || "_none"}
                  onValueChange={(value) => handleSelecionarBolsa(value === "_none" ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma bolsa (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Nenhuma bolsa</SelectItem>
                    {bolsas.map((bolsa, index) => (
                      <SelectItem key={index} value={bolsa.nome}>
                        {bolsa.nome} ({bolsa.percentual}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {editandoCandidato.bolsa && editandoCandidato.bolsa !== "_none" && (
                  <p className="text-sm text-green-600">
                    Percentual de desconto: {editandoCandidato.percentual}%
                  </p>
                )}
              </div>

              {/* Mensagem Individual */}
              <div className="space-y-2">
                <Label>Mensagem Personalizada</Label>
                <Textarea
                  placeholder="Digite uma mensagem personalizada para este candidato..."
                  value={editandoCandidato.mensagem}
                  onChange={(e) => setEditandoCandidato({
                    ...editandoCandidato,
                    mensagem: e.target.value
                  })}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Esta mensagem será exibida para o candidato junto com o resultado.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditandoCandidato(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSalvarCandidato} className="bg-[#3F0077] hover:bg-[#662F96]">
              <Save className="w-4 h-4 mr-2" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PSResultadosManager;
