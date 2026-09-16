interface ProfileSelectorProps {
  selectedProfile: "professor" | "aluno" | "visitante" | "corretor";
  onProfileChange: (profile: "professor" | "aluno" | "visitante" | "corretor") => void;
}

const PROFILES: { key: "professor" | "aluno" | "visitante" | "corretor"; label: string }[] = [
  { key: "professor", label: "Sou Professor" },
  { key: "aluno",     label: "Sou Aluno" },
  { key: "visitante", label: "Sou Visitante" },
  { key: "corretor",  label: "Sou Corretor" },
];

export const ProfileSelector = ({ selectedProfile, onProfileChange }: ProfileSelectorProps) => {
  return (
    <div className="grid grid-cols-2 gap-2">
      {PROFILES.map(({ key, label }) => {
        const active = selectedProfile === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onProfileChange(key)}
            className={[
              "rounded-xl py-3 px-4 text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
              active
                ? "bg-violet-600 text-white shadow-md shadow-violet-200"
                : "border border-violet-200 bg-white text-violet-700 hover:bg-violet-50 hover:border-violet-400",
            ].join(" ")}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
};
