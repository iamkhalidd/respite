"use client";
import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-[0.9rem] font-medium text-white transition-[background-color,transform] duration-150 hover:bg-[#2a2d2b] active:scale-[0.97]"
    >
      <Printer size={15} /> Print or save as PDF
    </button>
  );
}
