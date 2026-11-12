"use client";
import { useFormStatus } from "react-dom";
import { Loader2, Lock } from "lucide-react";

export function PayButton({ children, light = true }: { children: React.ReactNode; light?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className={`press inline-flex h-14 w-full items-center justify-center rounded-full text-[1.05rem] font-medium disabled:opacity-80 ${light ? "bg-porch text-ink hover:bg-porch-glow" : "bg-ink text-white hover:bg-[#2a2d2b]"}`}>
      <span className="inline-flex items-center gap-2 transition-[filter] duration-200" style={{ filter: pending ? "blur(1px)" : "none" }}>
        {pending ? <Loader2 size={17} className="animate-spin" /> : <Lock size={16} />}
        {pending ? "One moment" : children}
      </span>
    </button>
  );
}
