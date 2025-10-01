import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const formSchema = z.object({
  message: z.string().min(1, "A mensagem é obrigatória").min(10, "A mensagem deve ter pelo menos 10 caracteres"),
});

type FormData = z.infer<typeof formSchema>;

interface InboxBasicoFormProps {
  onMessageChange: (message: string) => void;
  initialMessage?: string;
}

export function InboxBasicoForm({ onMessageChange, initialMessage = "" }: InboxBasicoFormProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: initialMessage,
    },
  });

  const handleMessageChange = (value: string) => {
    onMessageChange(value);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">Mensagem</h3>

        <Form {...form}>
          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Conteúdo da Mensagem *</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Digite aqui o conteúdo da mensagem que será enviada aos destinatários..."
                    rows={6}
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      handleMessageChange(e.target.value);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </Form>

        <div className="mt-4 text-sm text-muted-foreground">
          <p>• Este campo é obrigatório para criação da mensagem</p>
          <p>• A mensagem será exibida para os destinatários selecionados</p>
          <p>• Configure o tipo (bloqueante/amigável) na aba "Configuração"</p>
        </div>
      </div>
    </div>
  );
}