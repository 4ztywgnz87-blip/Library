import { CameraIcon } from './Icons';

/**
 * "Choose cover" for her own edition. Once one is chosen, it shows next to the button,
 * with a way back to the standard cover.
 */
export function CoverChoice({
  cover,
  onChoose,
  onReset,
}: {
  cover?: string;
  onChoose: () => void;
  onReset: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onChoose}
        className="inline-flex items-center gap-2 rounded-full bg-linen px-4 py-2.5 text-sm text-ink hover:bg-sand active:scale-[0.97]"
      >
        <CameraIcon width={18} height={18} />
        {cover ? 'Change cover' : 'Choose cover'}
      </button>
      {cover && (
        <div className="flex min-w-0 items-center gap-2">
          <img
            src={cover}
            alt="Your cover"
            className="h-12 w-8 shrink-0 rounded-sm object-cover shadow-[var(--shadow-book)]"
          />
          <button className="text-xs whitespace-nowrap text-cocoa underline" onClick={onReset}>
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
