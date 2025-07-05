
import { Button } from "@/components/ui/button";

interface ProfileSelectorProps {
  selectedProfile: "aluno" | "visitante" | "corretor";
  onProfileChange: (profile: "aluno" | "visitante" | "corretor") => void;
}

export const ProfileSelector = ({ selectedProfile, onProfileChange }: ProfileSelectorProps) => {
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
      <Button
        variant={selectedProfile === "aluno" ? "default" : "outline"}
        onClick={() => onProfileChange("aluno")}
        className={`h-16 text-xs ${
          selectedProfile === "aluno"
            ? "bg-redator-primary hover:bg-redator-primary/90 text-white"
            : "border-redator-accent/30 text-redator-primary hover:bg-redator-primary/10"
        }`}
      >
        Sou Aluno
      </Button>
      <Button
        variant={selectedProfile === "visitante" ? "default" : "outline"}
        onClick={() => onProfileChange("visitante")}
        className={`h-16 text-xs ${
          selectedProfile === "visitante"
            ? "bg-redator-primary hover:bg-redator-primary/90 text-white"
            : "border-redator-accent/30 text-redator-primary hover:bg-redator-primary/10"
        }`}
      >
        Sou Visitante
      </Button>
      <Button
        variant={selectedProfile === "corretor" ? "default" : "outline"}
        onClick={() => onProfileChange("corretor")}
        className={`h-16 text-xs ${
          selectedProfile === "corretor"
            ? "bg-redator-primary hover:bg-redator-primary/90 text-white"
            : "border-redator-accent/30 text-redator-primary hover:bg-redator-primary/10"
        }`}
      >
        Sou Corretor
      </Button>
    </div>
  );
};
