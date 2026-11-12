"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Plus, RotateCcw, Trash2 } from "lucide-react";
import type { Chapter, FaqItem, HomeCopy, House, IncludedItem, SitePhoto } from "@/lib/types";
import { resetContent, saveContent, uploadSitePhoto, type FormState } from "../../actions";
import { shrinkPhoto } from "@/lib/shrink-photo";
import { Card, CardHead, btnPrimary, btnQuiet, input } from "../ui";

/* ───────── Shared pieces ───────── */

/** Holds one section while it's edited. Nothing reaches the site until Save. */
function useSection<T>(key: string, initial: T) {
  const [data, setData] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [state, setState] = useState<FormState>(null);
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(data) !== JSON.stringify(saved);

  // warn before leaving with unsaved words
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const save = () =>
    start(async () => {
      const r = await saveContent(key, data);
      setState(r);
      if (r?.ok) setSaved(data);
    });
  const reset = (defaults: T) =>
    start(async () => {
      const r = await resetContent(key);
      setState(r);
      if (r?.ok) {
        setData(defaults);
        setSaved(defaults);
      }
    });
  const set = (patch: Partial<T>) => {
    setState(null);
    setData((d) => ({ ...d, ...patch }));
  };
  return { data, set, save, reset, state, pending, dirty };
}

function Text({ label, value, onChange, max, rows, hint, optional }: { label: string; value: string; onChange: (v: string) => void; max: number; rows?: number; hint?: string; optional?: boolean }) {
  const near = value.length > max * 0.85;
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-[0.86rem] font-medium text-ink/75">
          {label}
          {optional && <span className="font-normal text-moss"> · optional</span>}
        </span>
        {near && <span className={`mono tabular text-[0.72rem] ${value.length > max ? "text-ember" : "text-moss"}`}>{value.length}/{max}</span>}
      </span>
      {rows ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className={`${input} h-auto py-2.5 leading-relaxed`} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} className={input} />
      )}
      {hint && <span className="mt-1.5 block text-[0.82rem] text-moss">{hint}</span>}
    </label>
  );
}

/** A picture on the site: shows what's there now, swaps it on upload, and keeps its words alongside. */
function PhotoSlot({ label, value, onChange, caption = true }: { label: string; value: SitePhoto; onChange: (p: SitePhoto) => void; caption?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const file = useRef<HTMLInputElement>(null);

  const upload = async (f: File) => {
    setBusy(true);
    setError("");
    const body = new FormData();
    body.set("photo", await shrinkPhoto(f));
    const r = await uploadSitePhoto(body);
    setBusy(false);
    if (r.src) onChange({ ...value, src: r.src });
    else setError(r.error ?? "The photo couldn't be uploaded.");
    if (file.current) file.current.value = "";
  };

  return (
    <div className="grid gap-4 rounded-xl bg-oat p-3 sm:grid-cols-[200px_minmax(0,1fr)] sm:p-4">
      <div>
        <p className="mb-1.5 text-[0.86rem] font-medium text-ink/75">{label}</p>
        <label className={`group relative block aspect-[4/3] cursor-pointer overflow-hidden rounded-lg bg-ink/[.06] ring-1 ring-line focus-within:ring-2 focus-within:ring-ink ${busy ? "pointer-events-none" : ""}`}>
          {value.src && <img src={value.src} alt="" className="h-full w-full object-cover" />}
          <span className={`absolute inset-0 flex items-center justify-center gap-1.5 bg-night/55 text-[0.86rem] font-medium text-white transition-opacity duration-200 ${busy ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"}`}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
            {busy ? "Uploading" : "Replace"}
          </span>
          <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </label>
        {/* phones have no hover, so the action is spelled out */}
        <button type="button" onClick={() => file.current?.click()} className={`${btnQuiet} mt-2 w-full sm:hidden`}>
          <ImagePlus size={15} /> Replace photo
        </button>
      </div>
      <div className="grid content-start gap-3">
        <Text label="Describe the photo" hint="Read aloud to people who can't see it." value={value.alt} onChange={(alt) => onChange({ ...value, alt })} max={200} optional />
        {caption && <Text label="Caption" value={value.caption} onChange={(c) => onChange({ ...value, caption: c })} max={160} optional />}
        {error && (
          <p role="alert" className="rounded-lg bg-ember/10 px-3 py-2 text-[0.86rem] text-ember ring-1 ring-ember/25">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

/** A list the owners can add to, reorder and trim. */
function Rows<T>({ items, onChange, blank, max, addLabel, noun, render }: { items: T[]; onChange: (v: T[]) => void; blank: T; max: number; addLabel: string; noun: string; render: (item: T, set: (v: T) => void, i: number) => React.ReactNode }) {
  const move = (i: number, by: number) => {
    const next = [...items];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    onChange(next);
  };
  const tool = "press grid h-9 w-9 place-items-center rounded-full text-ink/70 transition-colors hover:bg-ink/[.06] hover:text-ink disabled:pointer-events-none disabled:opacity-30";
  return (
    <div className="grid gap-3">
      {items.map((item, i) => (
        <div key={i} className="rounded-xl bg-oat p-3 sm:p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="mono tabular text-[0.72rem] uppercase text-moss">
              {noun} {i + 1}
            </span>
            <span className="flex items-center">
              <button type="button" aria-label={`Move ${noun.toLowerCase()} ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)} className={tool}>
                <ArrowUp size={15} />
              </button>
              <button type="button" aria-label={`Move ${noun.toLowerCase()} ${i + 1} down`} disabled={i === items.length - 1} onClick={() => move(i, 1)} className={tool}>
                <ArrowDown size={15} />
              </button>
              <button type="button" aria-label={`Remove ${noun.toLowerCase()} ${i + 1}`} onClick={() => onChange(items.filter((_, j) => j !== i))} className={`${tool} hover:!bg-ember/10 hover:!text-ember`}>
                <Trash2 size={15} />
              </button>
            </span>
          </div>
          <div className="grid gap-3">{render(item, (v) => onChange(items.map((x, j) => (j === i ? v : x))), i)}</div>
        </div>
      ))}
      {items.length < max && (
        <button type="button" onClick={() => onChange([...items, blank])} className={`${btnQuiet} justify-self-start`}>
          <Plus size={16} /> {addLabel}
        </button>
      )}
    </div>
  );
}

/** Stays in reach while scrolling a long page of words. */
function SaveBar({ s, onReset }: { s: { save: () => void; state: FormState; pending: boolean; dirty: boolean }; onReset: () => void }) {
  const confirmReset = () => {
    if (window.confirm("Put this section back to the words the site launched with? Your saved changes here will be replaced.")) onReset();
  };
  return (
    <div className="sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom)+0.75rem)] z-20 mt-6 md:bottom-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-night p-2 pl-4 text-white shadow-[0_18px_40px_-18px_rgb(0_0_0/.6)]">
        <p role="status" className={`min-w-0 flex-1 text-[0.88rem] ${s.state?.error ? "text-[#ff9b84]" : "text-white/70"}`}>
          {s.state?.error ?? (s.dirty ? "Unsaved changes" : s.state?.ok ?? "Everything is saved")}
        </p>
        <button type="button" onClick={confirmReset} disabled={s.pending} className="press inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-[0.86rem] text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50">
          <RotateCcw size={14} /> <span className="hidden sm:inline">Original words</span>
        </button>
        <button type="button" onClick={s.save} disabled={!s.dirty || s.pending} className={`${btnPrimary} !bg-white !text-ink hover:!bg-porch-glow disabled:opacity-50`}>
          {s.pending && <Loader2 size={15} className="animate-spin" />} Save
        </button>
      </div>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHead title={title} hint={hint} />
      <div className="grid gap-4 p-5 pt-4 sm:p-6 sm:pt-4">{children}</div>
    </Card>
  );
}

const pair = "grid gap-4 sm:grid-cols-2";

/* ───────── The editors ───────── */

export function HomeEditor({ initial, defaults }: { initial: HomeCopy; defaults: HomeCopy }) {
  const s = useSection("home", initial);
  const d = s.data;
  const photo = (k: keyof HomeCopy["photos"]) => (p: SitePhoto) => s.set({ photos: { ...d.photos, [k]: p } });
  return (
    <div className="grid gap-5">
      <Section title="Top of the page" hint="The big words over the picture of the house. The second line shows in grey.">
        <div className={pair}>
          <Text label="Headline, first line" value={d.heroLine1} onChange={(v) => s.set({ heroLine1: v })} max={60} />
          <Text label="Headline, second line" value={d.heroLine2} onChange={(v) => s.set({ heroLine2: v })} max={60} optional />
        </div>
        <Text label="Under the headline" value={d.heroText} onChange={(v) => s.set({ heroText: v })} max={400} rows={3} />
      </Section>

      <Section title="The house" hint="The sentence that lights up word by word as people scroll, then the wide photo under it.">
        <Text label="Statement" value={d.statement} onChange={(v) => s.set({ statement: v })} max={600} rows={4} />
        <PhotoSlot label="Wide photo" value={d.photos.kitchen} onChange={photo("kitchen")} />
      </Section>

      <Section title="What rent includes">
        <Text label="Heading" value={d.includedTitle} onChange={(v) => s.set({ includedTitle: v })} max={80} />
        <Text label="Under the heading" value={d.includedText} onChange={(v) => s.set({ includedText: v })} max={500} rows={3} />
        <PhotoSlot label="Left photo" value={d.photos.road} onChange={photo("road")} />
        <PhotoSlot label="Right photo" value={d.photos.porch} onChange={photo("porch")} />
        <Rows<IncludedItem>
          items={d.included}
          onChange={(included) => s.set({ included })}
          blank={{ label: "", title: "", body: "" }}
          max={12}
          noun="Item"
          addLabel="Add an item"
          render={(it, set) => (
            <>
              <div className={pair}>
                <Text label="Small label" value={it.label} onChange={(label) => set({ ...it, label })} max={40} />
                <Text label="Title" value={it.title} onChange={(title) => set({ ...it, title })} max={80} />
              </div>
              <Text label="Words" value={it.body} onChange={(body) => set({ ...it, body })} max={400} rows={2} />
            </>
          )}
        />
      </Section>

      <Section title="For professionals" hint="The dark section for case managers and discharge planners.">
        <div className={pair}>
          <Text label="Heading, first line" value={d.referralsLine1} onChange={(v) => s.set({ referralsLine1: v })} max={80} />
          <Text label="Heading, second line" value={d.referralsLine2} onChange={(v) => s.set({ referralsLine2: v })} max={120} optional />
        </div>
        <Text label="Under the heading" value={d.referralsText} onChange={(v) => s.set({ referralsText: v })} max={400} rows={3} />
        <PhotoSlot label="Photo (shows on wide screens)" value={d.photos.referral} onChange={photo("referral")} caption={false} />
      </Section>

      <Section title="Closing" hint="The last ask at the bottom of the page.">
        <div className={pair}>
          <Text label="Heading, first line" value={d.closingLine1} onChange={(v) => s.set({ closingLine1: v })} max={80} />
          <Text label="Heading, second line" value={d.closingLine2} onChange={(v) => s.set({ closingLine2: v })} max={80} optional />
        </div>
        <Text label="Under the heading" value={d.closingText} onChange={(v) => s.set({ closingText: v })} max={400} rows={3} />
      </Section>

      <SaveBar s={s} onReset={() => s.reset(defaults)} />
    </div>
  );
}

export function WhoEditor({ initial, defaults }: { initial: { chapters: Chapter[] }; defaults: { chapters: Chapter[] } }) {
  const s = useSection("who", initial);
  const setChapter = (i: number, c: Chapter) => s.set({ chapters: s.data.chapters.map((x, j) => (j === i ? c : x)) });
  return (
    <div className="grid gap-5">
      {s.data.chapters.map((c, i) => (
        <Section key={c.key} title={c.word || "Untitled"} hint="Shown as people scroll the Who lives here part of the home page.">
          <div className={pair}>
            <Text label="Who" value={c.word} onChange={(word) => setChapter(i, { ...c, word })} max={60} />
            <Text label="Finishing the sentence" value={c.line} onChange={(line) => setChapter(i, { ...c, line })} max={120} />
          </div>
          <Text label="Words" value={c.body} onChange={(body) => setChapter(i, { ...c, body })} max={600} rows={3} />
          <Text
            label="A good fit if, one per line"
            value={c.good.join("\n")}
            onChange={(v) => setChapter(i, { ...c, good: v.split("\n") })}
            max={600}
            rows={3}
            hint="Up to eight lines."
          />
          <Text label="Often referred by" value={c.referred} onChange={(referred) => setChapter(i, { ...c, referred })} max={300} optional />
          <PhotoSlot label="Photo" value={c.photo} onChange={(photo) => setChapter(i, { ...c, photo })} caption={false} />
        </Section>
      ))}
      <SaveBar s={s} onReset={() => s.reset(defaults)} />
    </div>
  );
}

export function FaqEditor({ initial, defaults }: { initial: { items: FaqItem[] }; defaults: { items: FaqItem[] } }) {
  const s = useSection("faq", initial);
  return (
    <div className="grid gap-5">
      <Section title="Questions" hint="Shown in this order under Good to know on the home page.">
        <Rows<FaqItem>
          items={s.data.items}
          onChange={(items) => s.set({ items })}
          blank={{ q: "", a: "" }}
          max={30}
          noun="Question"
          addLabel="Add a question"
          render={(it, set) => (
            <>
              <Text label="Question" value={it.q} onChange={(q) => set({ ...it, q })} max={200} />
              <Text label="Answer" value={it.a} onChange={(a) => set({ ...it, a })} max={1500} rows={3} />
            </>
          )}
        />
      </Section>
      <SaveBar s={s} onReset={() => s.reset(defaults)} />
    </div>
  );
}

type HouseFields = Omit<House, "phoneHref">;
export function HouseEditor({ initial, defaults }: { initial: HouseFields; defaults: HouseFields }) {
  const s = useSection<HouseFields>("house", initial);
  const d = s.data;
  return (
    <div className="grid gap-5">
      <Section title="Contact" hint="The phone number shows in the header, the footer, every Call button and the emails people get.">
        <div className={pair}>
          <Text label="Phone" value={d.phone} onChange={(phone) => s.set({ phone })} max={40} />
          <Text label="Town" value={d.town} onChange={(town) => s.set({ town })} max={80} hint="The short place name on each room page." />
        </div>
        <Text label="Address" value={d.address} onChange={(address) => s.set({ address })} max={160} hint="Under Visit in the footer." />
        <Text label="Tours" value={d.tourNote} onChange={(tourNote) => s.set({ tourNote })} max={160} optional />
      </Section>
      <Section title="Footer">
        <Text label="About the house" value={d.footerBlurb} onChange={(footerBlurb) => s.set({ footerBlurb })} max={300} rows={3} />
        <Text label="Closing line" value={d.footerTagline} onChange={(footerTagline) => s.set({ footerTagline })} max={120} optional />
      </Section>
      <SaveBar s={s} onReset={() => s.reset(defaults)} />
    </div>
  );
}
