"use client";
import { useFormStatus } from "react-dom";
import { Loader2, Lock } from "lucide-react";

export function PayButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="btn btn-primary press h-14 w-full justify-center text-[1.05rem] disabled:opacity-80">
      <span className="inline-flex items-center gap-2 transition-[filter] duration-200" style={{ filter: pending ? "blur(1px)" : "none" }}>
        {pending ? <Loader2 size={17} className="animate-spin" /> : <Lock size={16} />}
        {pending ? "Opening secure checkout…" : children}
      </span>
    </button>
  );
}
