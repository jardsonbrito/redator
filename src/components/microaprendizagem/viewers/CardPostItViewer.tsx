interface Props {
  texto: string;
  titulo: string;
}

export const CardPostItViewer = ({ texto, titulo }: Props) => {
  return (
    <div
      className="w-full rounded-2xl p-6 shadow-md border-l-4 border-yellow-400"
      style={{ background: 'linear-gradient(135deg, #fffde7 0%, #fff9c4 100%)' }}
    >
      <div className="flex items-start gap-3 mb-4">
        <span className="text-2xl">📌</span>
        <h2 className="text-base font-bold text-yellow-900">{titulo}</h2>
      </div>
      <div
        className="text-sm text-yellow-900 leading-relaxed whitespace-pre-wrap"
        style={{ fontFamily: "'Segoe UI', sans-serif" }}
      >
        {texto}
      </div>
    </div>
  );
};
