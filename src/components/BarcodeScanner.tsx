import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { CloseIcon } from './Icons';

/** Full-screen camera that looks for a book barcode (ISBN) */
export function BarcodeScanner({ onResult, onClose }: { onResult: (isbn: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stop: (() => void) | undefined;
    let done = false;
    (async () => {
      try {
        // Loaded only when needed, so the app itself stays light
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
          import('@zxing/browser'),
          import('@zxing/library'),
        ]);
        const hints = new Map([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A]]]);
        const reader = new BrowserMultiFormatReader(hints);
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: 'environment' } },
          videoRef.current!,
          (result) => {
            const text = result?.getText();
            // Books use ISBN-13 barcodes starting with 978 or 979
            if (text && /^97[89]\d{10}$/.test(text) && !done) {
              done = true;
              navigator.vibrate?.(40);
              controls.stop();
              onResult(text);
            }
          },
        );
        stop = () => controls.stop();
        if (done) controls.stop();
      } catch {
        setError("Snug can't use the camera. Allow camera access in Settings → Safari → Camera.");
      }
    })();
    return () => {
      done = true;
      stop?.();
    };
  }, [onResult]);

  return createPortal(
    <motion.div
      className="fixed inset-0 z-50 flex flex-col bg-ink"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="pt-safe flex items-center justify-between p-4 text-cream">
        <p className="font-soft text-lg">Scan the barcode</p>
        <button onClick={onClose} className="rounded-full bg-white/10 p-2" aria-label="Close">
          <CloseIcon />
        </button>
      </div>
      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-36 w-72 rounded-3xl border-4 border-cream/80 shadow-[0_0_0_9999px_rgba(59,42,34,0.55)]" />
        </div>
        {error && <p className="absolute inset-x-6 bottom-10 rounded-2xl bg-cream p-4 text-center text-sm text-ink">{error}</p>}
      </div>
      <p className="pb-safe p-5 text-center text-sm text-cream/80">Hold the barcode on the back of the book inside the frame.</p>
    </motion.div>,
    document.body,
  );
}
