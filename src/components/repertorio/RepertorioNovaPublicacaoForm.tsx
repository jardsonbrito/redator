import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const formSchema = z.object({
  fraseTematica: z
    .string()
    .min(10, "A frase temática deve ter pelo menos 10 caracteres")
    .max(500, "A frase temática deve ter no máximo 500 caracteres"),
  tipoParagrafo: z.enum(["introducao", "desenvolvimento", "conclusao"], {
    required_error: "Selecione o tipo de parágrafo",
  }),
  paragrafo: z
    .string()
    .min(50, "O parágrafo deve ter pelo menos 50 caracteres")
    .max(3000, "O parágrafo deve ter no máximo 3000 caracteres"),
});

type FormData = z.infer<typeof formSchema>;

interface RepertorioNovaPublicacaoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    fraseTematica: string,
    tipoParagrafo: "introducao" | "desenvolvimento" | "conclusao",
    paragrafo: string
  ) => void;
  initialData?: {
    fraseTematica: string;
    tipoParagrafo: "introducao" | "desenvolvimento" | "conclusao";
    paragrafo: string;
  };
  isEditing?: boolean;
  isSubmitting?: boolean;
}

export const RepertorioNovaPublicacaoForm = ({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isEditing = false,
  isSubmitting = false,
}: RepertorioNovaPublicacaoFormProps) => {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fraseTematica: initialData?.fraseTematica || "",
      tipoParagrafo: initialData?.tipoParagrafo || undefined,
      paragrafo: initialData?.paragrafo || "",
    },
  });

  // Reset form quando os dados iniciais mudam
  useEffect(() => {
    if (open) {
      form.reset({
        fraseTematica: initialData?.fraseTematica || "",
        tipoParagrafo: initialData?.tipoParagrafo || undefined,
        paragrafo: initialData?.paragrafo || "",
      });
    }
  }, [open, initialData, form]);

  const handleSubmit = (data: FormData) => {
    onSubmit(data.fraseTematica, data.tipoParagrafo, data.paragrafo);
    if (!isEditing) {
      form.reset();
    }
  };

  const paragrafoLength = form.watch("paragrafo")?.length || 0;
  const fraseTematicaLength = form.watch("fraseTematica")?.length || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Publicação" : "Nova Publicação"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Edite os campos abaixo para atualizar sua publicação."
              : "Compartilhe um parágrafo da sua redação com repertório aplicado para receber feedback dos colegas e professores."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fraseTematica"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Frase Temática</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: A persistência do racismo estrutural no Brasil"
                      {...field}
                    />
                  </FormControl>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Qual é a ideia central do seu parágrafo?</span>
                    <span>{fraseTematicaLength}/500</span>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tipoParagrafo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Parágrafo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo de parágrafo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="introducao">Introdução</SelectItem>
                      <SelectItem value="desenvolvimento">
                        Desenvolvimento
                      </SelectItem>
                      <SelectItem value="conclusao">Conclusão</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paragrafo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parágrafo com Repertório</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Digite seu parágrafo aqui, incluindo o repertório sociocultural aplicado..."
                      className="min-h-[200px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      Inclua citações, dados ou referências culturais relevantes
                    </span>
                    <span
                      className={
                        paragrafoLength > 2800
                          ? "text-yellow-600"
                          : paragrafoLength > 2900
                          ? "text-red-600"
                          : ""
                      }
                    >
                      {paragrafoLength}/3000
                    </span>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "Salvando..."
                  : isEditing
                  ? "Salvar Alterações"
                  : "Publicar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
