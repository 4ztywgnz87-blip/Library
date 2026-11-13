import type { ReactNode } from 'react';

/**
 * A button that opens the camera (`camera`) or her photo library.
 * Wraps a hidden file input, so it works the same on iPhone, iPad and Mac.
 */
export function PhotoInput({
  camera,
  onFile,
  disabled,
  className,
  children,
}: {
  camera?: boolean;
  onFile: (file: File) => void;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`cursor-pointer ${disabled ? 'pointer-events-none opacity-60' : ''} ${className ?? ''}`}>
      {children}
      <input
        type="file"
        accept="image/*"
        {...(camera ? { capture: 'environment' as const } : {})}
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) onFile(file);
        }}
      />
    </label>
  );
}
