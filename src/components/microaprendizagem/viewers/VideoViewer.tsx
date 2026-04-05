interface Props {
  url: string;
  onPlay?: () => void;
}

const extrairYouTubeId = (url: string): string | null => {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match?.[1] ?? null;
};

export const VideoViewer = ({ url, onPlay }: Props) => {
  const videoId = extrairYouTubeId(url);

  if (!videoId) {
    return (
      <div className="w-full aspect-video bg-gray-100 rounded-xl flex items-center justify-center">
        <p className="text-sm text-gray-400">URL do YouTube inválida.</p>
      </div>
    );
  }

  return (
    <div className="w-full aspect-video rounded-xl overflow-hidden shadow-sm">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full border-0"
        title="Vídeo"
        onLoad={onPlay}
      />
    </div>
  );
};
