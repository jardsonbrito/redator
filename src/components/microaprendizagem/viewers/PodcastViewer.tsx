import { useEffect, useRef } from 'react';

interface Props {
  url: string;
  onPlay?: () => void;
}

/** Converte URLs diretas de plataformas comuns para embed */
const toEmbedUrl = (url: string): string => {
  try {
    const u = new URL(url);

    // Spotify: open.spotify.com/episode/ID ou /show/ID
    if (u.hostname === 'open.spotify.com') {
      // Já é embed se o path começa com /embed
      if (u.pathname.startsWith('/embed')) return url;
      return `https://open.spotify.com/embed${u.pathname}?utm_source=generator`;
    }

    // SoundCloud
    if (u.hostname === 'soundcloud.com' || u.hostname === 'www.soundcloud.com') {
      return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%233f0776&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false`;
    }

    // Anchor.fm (redirecionado para Spotify)
    if (u.hostname === 'anchor.fm' || u.hostname === 'www.anchor.fm') {
      return `https://anchor.fm${u.pathname}/embed`;
    }
  } catch {
    // URL inválida, retorna como está
  }
  return url;
};

export const PodcastViewer = ({ url, onPlay }: Props) => {
  const embedUrl = toEmbedUrl(url);
  const onPlayRef = useRef(onPlay);
  onPlayRef.current = onPlay;

  useEffect(() => {
    // Marca em andamento ao montar (não depende do onLoad do iframe)
    onPlayRef.current?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full space-y-3">
      <div className="w-full rounded-xl overflow-hidden border border-gray-100 shadow-sm">
        <iframe
          src={embedUrl}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          className="w-full"
          style={{ minHeight: '232px', border: 0 }}
          title="Podcast"
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
