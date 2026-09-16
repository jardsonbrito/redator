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
      if (u.pathname.startsWith('/embed')) return url;
      return `https://open.spotify.com/embed${u.pathname}?utm_source=generator`;
    }

    // SoundCloud
    if (u.hostname === 'soundcloud.com' || u.hostname === 'www.soundcloud.com') {
      return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%233f0776&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false`;
    }

    // Anchor.fm
    if (u.hostname === 'anchor.fm' || u.hostname === 'www.anchor.fm') {
      return `https://anchor.fm${u.pathname}/embed`;
    }

    // YouTube: youtube.com/watch?v=ID ou youtu.be/ID
    if (u.hostname === 'www.youtube.com' || u.hostname === 'youtube.com') {
      if (u.pathname.startsWith('/embed')) return url;
      const videoId = u.searchParams.get('v');
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }
    if (u.hostname === 'youtu.be') {
      const videoId = u.pathname.slice(1);
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }

    // Instagram: /p/ID/ ou /reel/ID/
    if (u.hostname === 'www.instagram.com' || u.hostname === 'instagram.com') {
      if (u.pathname.endsWith('/embed/')) return url;
      const path = u.pathname.replace(/\/$/, '');
      return `https://www.instagram.com${path}/embed/`;
    }
  } catch {
    // URL inválida, retorna como está
  }
  return url;
};

const isVideo = (url: string) => {
  try {
    const h = new URL(url).hostname;
    return h === 'www.youtube.com' || h === 'youtube.com' || h === 'youtu.be'
      || h === 'www.instagram.com' || h === 'instagram.com';
  } catch { return false; }
};

export const PodcastViewer = ({ url, onPlay }: Props) => {
  const embedUrl = toEmbedUrl(url);
  const onPlayRef = useRef(onPlay);
  onPlayRef.current = onPlay;

  useEffect(() => {
    onPlayRef.current?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const altura = isVideo(url) ? '400px' : '232px';

  return (
    <div className="w-full space-y-3">
      <div className="w-full rounded-xl overflow-hidden border border-gray-100 shadow-sm">
        <iframe
          src={embedUrl}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          className="w-full"
          style={{ minHeight: altura, border: 0 }}
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
