import { MensagensAdmin } from "@/components/ajuda-rapida/MensagensAdmin";

export const AjudaRapidaAdmin = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Ajuda Rápida - Administração</h1>
      </div>
      
      <MensagensAdmin />
    </div>
  );
};