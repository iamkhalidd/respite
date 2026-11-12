"use client";
import { useRef } from "react";
import { btnDanger, btnPrimary, btnQuiet } from "./ui";
import { SubmitButton } from "./submit";

/**
 * A button that asks before it acts. Opens a sheet on phones and a centered
 * dialog on larger screens, so a slip of the thumb can't move someone out.
 */
export function ConfirmAction({
  action,
  label,
  title,
  body,
  confirmLabel,
  danger = false,
  className = btnQuiet,
}: {
  action: () => Promise<void>;
  label: React.ReactNode;
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  danger?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" className={className} onClick={() => ref.current?.showModal()}>
        {label}
      </button>
      <dialog
        ref={ref}
        onClick={(e) => e.target === ref.current && ref.current?.close()}
        className="mb-0 mt-auto w-full max-w-full rounded-t-3xl bg-paper p-0 text-ink shadow-[0_-20px_60px_-20px_rgb(11_13_12/.5)] backdrop:bg-night/55 backdrop:backdrop-blur-[2px] sm:m-auto sm:max-w-md sm:rounded-3xl"
      >
        <div className="p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:p-7">
          <h2 className="text-[1.25rem] font-semibold leading-tight tracking-[-0.03em]">{title}</h2>
          <div className="mt-2 text-[0.95rem] leading-relaxed text-moss">{body}</div>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className={`${btnQuiet} !h-12 sm:!h-10`} onClick={() => ref.current?.close()}>
              Cancel
            </button>
            <form action={action} className="contents">
              <SubmitButton className={`${danger ? btnDanger : btnPrimary} !h-12 sm:!h-10`}>{confirmLabel}</SubmitButton>
            </form>
          </div>
        </div>
      </dialog>
    </>
  );
}
