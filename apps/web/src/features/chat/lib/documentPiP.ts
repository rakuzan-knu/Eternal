export interface DocumentPiPWindowOptions {
  width?: number;
  height?: number;
}

declare global {
  interface Window {
    documentPictureInPicture?: {
      requestWindow: (options?: {
        width?: number;
        height?: number;
        disallowReturnToOpener?: boolean;
      }) => Promise<Window>;
      window: Window | null;
      addEventListener?: (type: string, listener: EventListener) => void;
      removeEventListener?: (type: string, listener: EventListener) => void;
    };
  }
}

export function isDocumentPiPSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'documentPictureInPicture' in window &&
    typeof window.documentPictureInPicture?.requestWindow === 'function'
  );
}
