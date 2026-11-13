import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { Button } from './ui';
import { SleepyCat } from './SleepyCat';

/** A cosy "are you sure?" window instead of the plain browser pop-up */
export function ConfirmSheet({
  title,
  children,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return createPortal(
    <>
      <motion.div className="fixed inset-0 z-40 bg-ink/35 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onCancel} />
      <motion.div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="pb-safe fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md rounded-t-[1.75rem] bg-cream px-6 pt-5 pb-6 text-center shadow-2xl md:bottom-auto md:top-1/3 md:rounded-[1.75rem]"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        <SleepyCat className="mx-auto w-28" />
        <h2 id="confirm-title" className="mt-2 text-2xl font-semibold">
          {title}
        </h2>
        {children && <div className="mt-2 text-sm text-cocoa">{children}</div>}
        <div className="mt-6 flex gap-3">
          <Button variant="soft" className="flex-1" onClick={onCancel}>
            Keep it
          </Button>
          <Button className="flex-1" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </motion.div>
    </>,
    document.body,
  );
}
