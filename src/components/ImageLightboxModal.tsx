import React from 'react';
import { X, Download, ExternalLink } from 'lucide-react';

interface ImageLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  imageName?: string;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  imageName = 'Shared Attachment',
}) => {
  if (!isOpen || !imageUrl) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-5xl max-h-[90vh] flex flex-col items-center justify-center"
      >
        <div className="absolute -top-12 left-0 right-0 flex items-center justify-between text-white text-sm font-medium px-2">
          <span className="truncate max-w-xs">{imageName}</span>
          <div className="flex items-center space-x-3">
            <a
              href={imageUrl}
              download={imageName}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center space-x-1 px-2.5 text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download</span>
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <img
          src={imageUrl}
          alt={imageName}
          className="max-w-full max-h-[82vh] object-contain rounded-lg shadow-2xl border border-slate-800"
        />
      </div>
    </div>
  );
};
