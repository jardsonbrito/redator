import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { UnlockModal } from "./UnlockModal";
import { useState } from "react";

interface LockedResourceCardProps {
  title: string;
  description?: string;
  resourceName?: string;
}

export const LockedResourceCard = ({ title, description, resourceName }: LockedResourceCardProps) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <Card className="group hover:shadow-lg transition-all duration-300 border-muted">
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 bg-muted rounded-full">
              <Lock className="h-8 w-8 text-muted-foreground" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">
                {title}
              </h3>
              {description && (
                <p className="text-sm text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
            
            <Button 
              onClick={() => setShowModal(true)}
              className="w-full"
              variant="default"
            >
              <Lock size={16} className="mr-2" />
              Desbloquear
            </Button>
          </div>
        </CardContent>
      </Card>

      <UnlockModal 
        open={showModal}
        onOpenChange={setShowModal}
        resourceName={resourceName}
      />
    </>
  );
};