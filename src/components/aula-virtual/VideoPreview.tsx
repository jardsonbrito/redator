import React from 'react';
import { resolveAulaCover, VideoParser } from '@/utils/aulaImageUtils';
import { Play } from 'lucide-react';

interface VideoPreviewProps {
  url: string;
  title?: string;
  className?: string;
}

export function VideoPreview({ url, title, className = '' }: VideoPreviewProps) {
  const metadata = VideoParser.extractVideoMetadata(url);
  const thumbnailUrl = metadata?.thumbnailUrl || resolveAulaCover({});
  
  return (
    <div className={`relative rounded-lg overflow-hidden bg-gray-100 ${className}`}>
      <img 
        src={thumbnailUrl}
        alt={title ? `Preview de ${title}` : 'Preview do vídeo'}
        className="w-full h-full object-cover"
        onError={(e) => {
          e.currentTarget.src = resolveAulaCover({});
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 hover:bg-opacity-30 transition-all">
        <div className="bg-white bg-opacity-90 rounded-full p-3">
          <Play className="w-6 h-6 text-gray-800 ml-1" />
        </div>
      </div>
    </div>
  );
}