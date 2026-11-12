"use client";
import { useActionState, useRef } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { uploadPhoto } from "../../../actions";

/** One tap: pick a photo and it uploads. No second button to find. */
export function PhotoUpload({ roomId }: { roomId: string }) {
  const [state, action, pending] = useActionState(uploadPhoto.bind(null, roomId), null);
  const form = useRef<HTMLFormElement>(null);
  return (
    <form ref={form} action={action} className="contents">
      <label
        className={`press flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong p-3 text-center text-[0.86rem] font-medium transition-colors hover:bg-ink/[.03] focus-within:ring-2 focus-within:ring-ink ${pending ? "pointer-events-none opacity-60" : ""}`}
      >
        {pending ? <Loader2 size={20} className="animate-spin" /> : <ImagePlus size={20} />}
        {pending ? "Uploading" : "Add a photo"}
        <span className="text-[0.76rem] font-normal text-moss">JPG, PNG or WebP</span>
        <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => e.currentTarget.files?.length && form.current?.requestSubmit()} />
      </label>
      {state?.error && (
        <p role="alert" className="col-span-full rounded-xl bg-ember/10 px-3.5 py-2.5 text-[0.88rem] text-ember ring-1 ring-ember/25">
          {state.error}
        </p>
      )}
    </form>
  );
}
