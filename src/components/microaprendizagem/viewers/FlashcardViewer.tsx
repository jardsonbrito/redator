import { PdfViewer } from './PdfViewer';

interface Props {
  storagePath: string;
  onOpen?: () => void;
}

export const FlashcardViewer = ({ storagePath, onOpen }: Props) => {
  return <PdfViewer storagePath={storagePath} bucket="micro-pdfs" onOpen={onOpen} />;
};
