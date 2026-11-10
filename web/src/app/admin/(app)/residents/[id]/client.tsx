"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="flex min-w-0 items-center gap-2">
      <a href={url} target="_blank" className="truncate text-[0.85rem] text-pine underline decoration-line-strong underline-offset-4">{url.replace(/^https?:\/\//, "")}</a>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="press grid h-7 w-7 shrink-0 place-items-center rounded-md text-ink/50 hover:bg-ink/[.05] hover:text-ink"
        aria-label="Copy pay link"
      >
        {copied ? <Check size={14} className="text-pine" /> : <Copy size={14} />}
      </button>
    </span>
  );
}

export function ConfirmButton({ children, className, message }: { children: React.ReactNode; className?: string; message: string }) {
  return (
    <button className={className} onClick={(e) => { if (!confirm(message)) e.preventDefault(); }}>
      {children}
    </button>
  );
}
