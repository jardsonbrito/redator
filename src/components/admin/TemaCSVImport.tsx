import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { TemaImportWizard } from './TemaImportWizard';
import { useState } from 'react';

export const TemaCSVImport = () => {
  const [showWizard, setShowWizard] = useState(false);

  if (showWizard) {
    return <TemaImportWizard />;
  }

  return (
    <div className="text-center space-y-4">
      <div>
        <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Importação em Lote</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Importe múltiplos temas de uma vez usando um arquivo CSV. 
          Placeholders automáticos serão aplicados quando necessário.
        </p>
      </div>
      
      <Button 
        onClick={() => setShowWizard(true)}
        size="lg"
        className="mt-6"
      >
        <FileText className="mr-2 h-4 w-4" />
        Iniciar Importação CSV
      </Button>
    </div>
  );
};