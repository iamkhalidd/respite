"use client";
import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, Loader2 } from "lucide-react";

/** Submit button that shows a spinner while saving and a brief check when done. */
export function SubmitButton({ children, className = "", done }: { children: React.ReactNode; className?: string; done?: string }) {
  const { pending } = useFormStatus();
  const [flash, setFlash] = useState(false);
  const was = useRef(false);
  useEffect(() => {
    if (was.current && !pending && done) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 1600);
      return () => clearTimeout(t);
    }
    was.current = pending;
  }, [pending, done]);
  return (
    <button disabled={pending} className={`${className} relative disabled:opacity-70`}>
      <span className="inline-flex items-center gap-1.5 transition-[filter,opacity] duration-200" style={{ filter: pending ? "blur(1px)" : "none" }}>
        {pending ? <Loader2 size={15} className="animate-spin" /> : flash ? <Check size={15} /> : null}
        {flash ? done : children}
      </span>
    </button>
  );
}
