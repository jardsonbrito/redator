interface Props {
  url: string;
  onPlay?: () => void;
}

export const PodcastViewer = ({ url, onPlay }: Props) => {
  return (
    <div className="w-full space-y-3">
      <div className="w-full rounded-xl overflow-hidden border border-gray-100 shadow-sm">
        <iframe
          src={url}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          className="w-full"
          style={{ minHeight: '232px', border: 0 }}
          title="Podcast"
          onLoad={onPlay}
        />
      </div>
      <p className="text-xs text-gray-400 text-center">
        Caso o player não carregue,{' '}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#3f0776] underline"
        >
          abra o podcast aqui
        </a>
        .
      </p>
    </div>
  );
};
