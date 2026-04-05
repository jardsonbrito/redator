interface Props {
  texto: string;
}

export const MicrotextoViewer = ({ texto }: Props) => {
  const paragrafos = texto.split(/\n+/).filter(p => p.trim());

  return (
    <div className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed space-y-4">
        {paragrafos.length > 0 ? (
          paragrafos.map((p, i) => (
            <p key={i} className="text-sm leading-7 text-gray-700">{p}</p>
          ))
        ) : (
          <p className="text-sm text-gray-400 italic">Nenhum conteúdo cadastrado.</p>
        )}
      </div>
    </div>
  );
};
