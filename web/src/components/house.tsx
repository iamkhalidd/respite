import type { BedState } from "@/lib/availability";

/**
 * The signature: the house itself, drawn as a line elevation.
 * One window per bed. Lit = open, dim glow = opening soon, dark = taken.
 * Window order matches the real house: ground floor Bed 1 & 2, upstairs Bed 3–6.
 */
const WINDOWS: { x: number; y: number; w: number; h: number }[] = [
  { x: 66, y: 214, w: 50, h: 58 }, // Bed 1 — Porch Room
  { x: 284, y: 214, w: 50, h: 58 }, // Bed 2 — Garden Room
  { x: 58, y: 128, w: 40, h: 48 }, // Bed 3 — Maple
  { x: 112, y: 128, w: 40, h: 48 }, // Bed 4 — Maple
  { x: 248, y: 128, w: 40, h: 48 }, // Bed 5 — Dogwood
  { x: 302, y: 128, w: 40, h: 48 }, // Bed 6 — Dogwood
];

export function House({
  states,
  animate = true,
  className = "",
  showLabels = false,
}: {
  states: BedState[];
  animate?: boolean;
  className?: string;
  showLabels?: boolean;
}) {
  const open = states.filter((s) => s === "open").length;
  return (
    <svg viewBox="0 0 400 330" className={className} role="img" aria-label={`Drawing of the house. ${open} of ${states.length} beds open.`}>
      <defs>
        <radialGradient id="rw-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--porch-glow)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="var(--porch)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="rw-pane" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--porch-glow)" />
          <stop offset="100%" stopColor="var(--porch)" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="var(--pine)" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
        <path d="M10 300 H390" strokeWidth="1.2" opacity="0.5" />
        <rect x="40" y="104" width="320" height="196" fill="var(--paper)" />
        {Array.from({ length: 11 }).map((_, i) => (
          <path key={i} d={`M40 ${118 + i * 17} H360`} strokeWidth="0.6" opacity="0.18" />
        ))}
        <path d="M24 108 L200 26 L376 108 Z" fill="var(--pine)" />
        <path d="M292 62 V36 H312 V72" fill="var(--pine)" />
        <path d="M176 104 V70 L200 52 L224 70 V104" fill="var(--paper)" />
        <rect x="190" y="74" width="20" height="22" fill="var(--pine)" opacity="0.85" />
        <path d="M150 196 L200 172 L250 196 Z" fill="var(--paper)" />
        <path d="M144 198 H256" strokeWidth="2.4" />
        <path d="M158 198 V292 M242 198 V292" strokeWidth="3" />
        <rect x="182" y="222" width="36" height="70" fill="var(--pine)" />
        <path d="M188 230 H212 M188 240 H212 M188 250 H212 M200 226 V256" stroke="var(--paper)" strokeWidth="0.9" opacity="0.6" />
        <circle cx="211" cy="262" r="1.6" fill="var(--porch)" stroke="none" />
        <path d="M168 292 H232 V298 H168 Z M160 298 H240" fill="var(--paper)" />
        {/* the porch lamp is always on */}
        <circle cx="200" cy="208" r="14" fill="url(#rw-glow)" stroke="none" className={animate ? "window-lit" : ""} />
        <circle cx="200" cy="208" r="2.6" fill="var(--porch)" stroke="none" />
        <path d="M44 300 q8 -26 26 -20 q10 -16 26 -2 q14 -8 18 22" fill="var(--moss)" opacity="0.35" stroke="none" />
        <path d="M282 300 q6 -22 22 -18 q10 -14 24 0 q14 -6 20 18" fill="var(--moss)" opacity="0.35" stroke="none" />

        {WINDOWS.map((w, i) => {
          const s = states[i] ?? "taken";
          const lit = s === "open";
          const soon = s === "soon";
          const delay = { animationDelay: `${600 + i * 180}ms` };
          return (
            <g key={i}>
              {lit && (
                <ellipse
                  cx={w.x + w.w / 2}
                  cy={w.y + w.h / 2}
                  rx={w.w * 0.95}
                  ry={w.h * 0.85}
                  fill="url(#rw-glow)"
                  stroke="none"
                  className={animate ? "window-lit" : ""}
                  style={animate ? delay : undefined}
                />
              )}
              <rect
                x={w.x}
                y={w.y}
                width={w.w}
                height={w.h}
                fill={lit ? "url(#rw-pane)" : soon ? "var(--porch)" : "var(--pine)"}
                fillOpacity={lit ? 1 : soon ? 0.35 : 0.88}
                className={lit && animate ? "window-lit" : ""}
                style={lit && animate ? delay : undefined}
              />
              <path
                d={`M${w.x + w.w / 2} ${w.y} V${w.y + w.h} M${w.x} ${w.y + w.h / 2} H${w.x + w.w}`}
                stroke={lit ? "var(--pine)" : "var(--paper)"}
                strokeWidth="1.1"
                opacity={lit ? 0.5 : 0.35}
              />
              <path d={`M${w.x - 4} ${w.y + w.h + 2} H${w.x + w.w + 4}`} strokeWidth="2" />
              {showLabels && (
                <text x={w.x + w.w / 2} y={w.y - 6} textAnchor="middle" fontSize="8" fill="var(--moss)" stroke="none" style={{ fontFamily: "var(--font-geist-mono)" }}>
                  {i + 1}
                </text>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}

/** Compact version: a row of tiny windows, used on cards and in the dashboard. */
export function WindowRow({ states, size = 10 }: { states: BedState[]; size?: number }) {
  return (
    <span className="inline-flex items-center gap-[3px]" aria-hidden>
      {states.map((s, i) => (
        <span
          key={i}
          className="rounded-[2px]"
          style={{
            width: size,
            height: size * 1.25,
            background:
              s === "open" ? "linear-gradient(var(--porch-glow), var(--porch))" : s === "soon" ? "rgb(227 166 58 / 0.35)" : "var(--pine)",
            boxShadow: s === "open" ? "0 0 8px 1px rgb(227 166 58 / 0.55)" : "none",
            opacity: s === "taken" ? 0.8 : 1,
          }}
        />
      ))}
    </span>
  );
}

/** The night drawing, static: used on dark panels in the dashboard and at the door (login). */
export function HouseNight({ states, className = "", labels = false }: { states: BedState[]; className?: string; labels?: boolean }) {
  const open = states.filter((s) => s === "open").length;
  return (
    <svg viewBox="0 0 400 310" className={className} role="img" aria-label={`The house at night. ${open} of ${states.length} windows lit for open beds.`}>
      <defs>
        <radialGradient id="hn-glow">
          <stop offset="0%" stopColor="#ffd98f" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#f0a53a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hn-pane" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe3a6" />
          <stop offset="100%" stopColor="#f0a53a" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="rgb(255 255 255 / .55)" strokeWidth="0.9" strokeLinejoin="round" strokeLinecap="round">
        <path d="M0 300 H400" stroke="rgb(255 255 255 / .18)" />
        <rect x="40" y="104" width="320" height="196" fill="#101311" />
        {Array.from({ length: 11 }).map((_, i) => (
          <path key={i} d={`M40 ${118 + i * 17} H360`} stroke="rgb(255 255 255 / .06)" />
        ))}
        <path d="M24 108 L200 26 L376 108 Z" fill="#0b0d0c" />
        <path d="M292 62 V36 H312 V72" fill="#0b0d0c" />
        <path d="M176 104 V70 L200 52 L224 70 V104" fill="#101311" />
        <path d="M150 196 L200 172 L250 196 Z" fill="#101311" />
        <path d="M144 198 H256" />
        <path d="M158 198 V292 M242 198 V292" />
        <rect x="182" y="222" width="36" height="70" fill="#0b0d0c" />
        <path d="M168 292 H232 V298 H168 Z" fill="#101311" />
        <circle cx="200" cy="208" r="26" fill="url(#hn-glow)" stroke="none" />
        <circle cx="200" cy="208" r="2.4" fill="#ffd98f" stroke="none" />
        {WINDOWS.map((w, i) => {
          const s = states[i] ?? "taken";
          const lit = s === "open";
          return (
            <g key={i}>
              <rect x={w.x} y={w.y} width={w.w} height={w.h} fill="#141815" />
              {lit && <ellipse cx={w.x + w.w / 2} cy={w.y + w.h / 2} rx={w.w * 1.05} ry={w.h * 0.95} fill="url(#hn-glow)" stroke="none" />}
              {s !== "taken" && <rect x={w.x} y={w.y} width={w.w} height={w.h} fill={lit ? "url(#hn-pane)" : "#f0a53a"} fillOpacity={lit ? 1 : 0.28} stroke="none" />}
              <path d={`M${w.x + w.w / 2} ${w.y} V${w.y + w.h} M${w.x} ${w.y + w.h / 2} H${w.x + w.w}`} stroke={lit ? "rgb(11 13 12 / .55)" : "rgb(255 255 255 / .22)"} strokeWidth="1" />
              <rect x={w.x} y={w.y} width={w.w} height={w.h} />
              {labels && (
                <text x={w.x + w.w / 2} y={w.y - 6} textAnchor="middle" fontSize="8" fill="rgb(255 255 255 / .45)" stroke="none" style={{ fontFamily: "var(--font-geist-mono)" }}>
                  {i + 1}
                </text>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
