"use client";
import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { uploadPhoto } from "../../../actions";
import { sendPhotos } from "@/lib/shrink-photo";

/** One tap: pick one photo or several and they upload. No second button to find. */
export function PhotoUpload({ roomId }: { roomId: string }) {
  const [step, setStep] = useState<{ at: number; of: number } | null>(null);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const upload = async (files: File[]) => {
    setError("");
    const { error } = await sendPhotos(files, (f) => uploadPhoto(roomId, f), (at) => setStep({ at, of: files.length }));
    setStep(null);
    if (error) setError(error);
    if (input.current) input.current.value = "";
  };

  return (
    <>
      <label
        className={`press flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong p-3 text-center text-[0.86rem] font-medium transition-colors hover:bg-ink/[.03] focus-within:ring-2 focus-within:ring-ink ${step ? "pointer-events-none opacity-60" : ""}`}
      >
        {step ? <Loader2 size={20} className="animate-spin" /> : <ImagePlus size={20} />}
        {step ? (step.of > 1 ? `Uploading ${step.at} of ${step.of}` : "Uploading") : "Add photos"}
        <span className="text-[0.76rem] font-normal text-moss">JPG, PNG or WebP. Pick several at once.</span>
        <input
          ref={input}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => e.currentTarget.files?.length && upload([...e.currentTarget.files])}
        />
      </label>
      {error && (
        <p role="alert" className="col-span-full rounded-xl bg-ember/10 px-3.5 py-2.5 text-[0.88rem] text-ember ring-1 ring-ember/25">
          {error}
        </p>
      )}
    </>
  );
}
