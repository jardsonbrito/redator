import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const formSchema = z.object({
  type: z.enum(["bloqueante", "amigavel"], {
    required_error: "Selecione o tipo de mensagem",
  }),
  validity: z.enum(["ate_resposta", "ate_data", "permanente"], {
    required_error: "Selecione a validade",
  }),
  validUntil: z.date().optional(),
});

type FormData = z.infer<typeof formSchema>;

export interface InboxConfiguracao {
  type: "bloqueante" | "amigavel";
  validity: "ate_resposta" | "ate_data" | "permanente";
  validUntil?: Date;
}

interface InboxConfiguracaoFormProps {
  onConfigChange: (config: InboxConfiguracao) => void;
  initialConfig?: Partial<InboxConfiguracao>;
}

export function InboxConfiguracaoForm({ onConfigChange, initialConfig }: InboxConfiguracaoFormProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: initialConfig?.type || "amigavel",
      validity: initialConfig?.validity || "permanente",
      validUntil: initialConfig?.validUntil,
    },
  });

  const watchValidity = form.watch("validity");
  const watchType = form.watch("type");

  const handleFormChange = () => {
    const values = form.getValues();
    if (values.type && values.validity) {
      onConfigChange({
        type: values.type,
        validity: values.validity,
        validUntil: values.validity === "ate_data" ? values.validUntil : undefined,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">Configurações da Mensagem</h3>

        <Form {...form}>
          <div className="space-y-6">
            {/* Tipo de Mensagem */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Mensagem</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={(value) => {
                        field.onChange(value);
                        handleFormChange();
                      }}
                      defaultValue={field.value}
                      className="flex flex-col space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="bloqueante" id="bloqueante" />
                        <label htmlFor="bloqueante" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          Bloqueante
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="amigavel" id="amigavel" />
                        <label htmlFor="amigavel" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          Amigável
                        </label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Descrição do Tipo */}
            <div className="bg-muted/50 p-3 rounded-lg text-sm">
              {watchType === "bloqueante" ? (
                <p><strong>Bloqueante:</strong> Abre pop-up no login e trava a navegação até que o usuário responda à mensagem.</p>
              ) : (
                <p><strong>Amigável:</strong> Aparece como toast persistente + sino até ser marcada como lida pelo usuário.</p>
              )}
            </div>

            {/* Validade */}
            <FormField
              control={form.control}
              name="validity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Validade da Mensagem</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      handleFormChange();
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a validade" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ate_resposta">Até ser respondida</SelectItem>
                      <SelectItem value="ate_data">Até data específica</SelectItem>
                      <SelectItem value="permanente">Permanente</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Data de Validade (só aparece se "até data" estiver selecionado) */}
            {watchValidity === "ate_data" && (
              <FormField
                control={form.control}
                name="validUntil"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data de Validade</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: ptBR })
                            ) : (
                              <span>Selecione uma data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            field.onChange(date);
                            handleFormChange();
                          }}
                          disabled={(date) =>
                            date < new Date()
                          }
                          initialFocus
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        </Form>
      </div>
    </div>
  );
}