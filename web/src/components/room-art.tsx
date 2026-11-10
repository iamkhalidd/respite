/* eslint-disable @next/next/no-img-element */

/**
 * Until the owner uploads real photos, each room is shown as light, not furniture:
 * afternoon sun falling through a four-pane window onto a plaster wall in the room's colour.
 * Quiet on purpose — never stock photos pretending to be the house.
 */
const TONES: Record<string, { wall: string; shade: string; floor: string }> = {
  sage: { wall: "#c9cbbd", shade: "#9fa392", floor: "#8d8574" },
  clay: { wall: "#d8c6b4", shade: "#b19a84", floor: "#8e7864" },
  oat: { wall: "#dcd6ca", shade: "#b7ae9e", floor: "#958a76" },
  dusk: { wall: "#c4c6c6", shade: "#9a9d9e", floor: "#7f7d77" },
};

// window light: [x offset, skew, width] for each variant
const LIGHT = [
  { x: 210, skew: -0.42, w: 120, h: 150, y: 46 },
  { x: 70, skew: 0.36, w: 104, h: 136, y: 58 },
  { x: 250, skew: -0.2, w: 90, h: 170, y: 30 },
];

export function RoomArt({ tone = "sage", variant = 0, className = "" }: { tone?: string; variant?: number; className?: string }) {
  const t = TONES[tone] ?? TONES.sage;
  const L = LIGHT[variant % LIGHT.length];
  const id = `ra-${tone}-${variant % LIGHT.length}`;
  const pw = (L.w - 8) / 2;
  const ph = (L.h - 8) / 2;
  return (
    <svg viewBox="0 0 400 320" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      <defs>
        <linearGradient id={`${id}-wall`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={t.wall} />
          <stop offset="100%" stopColor={t.shade} />
        </linearGradient>
        <linearGradient id={`${id}-sun`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff4dc" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#ffe2a8" stopOpacity="0.55" />
        </linearGradient>
        <filter id={`${id}-soft`} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
        <filter id={`${id}-grain`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.09 0" />
        </filter>
      </defs>
      <rect width="400" height="320" fill={`url(#${id}-wall)`} />
      <rect y="254" width="400" height="66" fill={t.floor} opacity="0.55" />
      <path d="M0 254 H400" stroke="#000" strokeOpacity="0.08" />
      {/* the patch of sun, four panes split by the mullion's shadow */}
      <g transform={`translate(${L.x} ${L.y}) skewX(${L.skew * 45})`} filter={`url(#${id}-soft)`} style={{ mixBlendMode: "screen" }}>
        {[0, 1].map((r) =>
          [0, 1].map((c) => (
            <rect key={`${r}${c}`} x={c * (pw + 8)} y={r * (ph + 8)} width={pw} height={ph} fill={`url(#${id}-sun)`} />
          )),
        )}
      </g>
      {/* the light continues onto the floor */}
      <path
        d={`M${L.x + 10} 254 l${L.w * 0.9} 0 l${L.skew > 0 ? 60 : -60} 66 l-${L.w * 1.1} 0 z`}
        fill="#fff1d2"
        opacity="0.28"
        filter={`url(#${id}-soft)`}
      />
      <rect width="400" height="320" filter={`url(#${id}-grain)`} />
    </svg>
  );
}

/** AI-generated stand-ins, replaced automatically once real photos are uploaded. */
const STAND_INS: Record<string, string> = {
  sage: "/images/room-porch.webp",
  clay: "/images/room-garden.webp",
  oat: "/images/room-maple.webp",
  dusk: "/images/room-dogwood.webp",
};
const SHARED_STAND_INS = ["/images/kitchen.webp", "/images/porch.webp"];

export function RoomImage({
  photos,
  tone,
  index = 0,
  alt,
  className = "",
}: {
  photos: string[];
  tone: string;
  index?: number;
  alt: string;
  className?: string;
}) {
  // the owner's photos always win; until they're uploaded, show labelled stand-ins
  const src = photos[index];
  if (src) return <img src={src} alt={alt} className={`h-full w-full object-cover ${className}`} />;
  const standIn = index === 0 ? STAND_INS[tone] : SHARED_STAND_INS[index - 1];
  if (standIn) return <img src={standIn} alt={alt} loading="lazy" decoding="async" className={`h-full w-full object-cover ${className}`} />;
  return <RoomArt tone={tone} variant={index} className={`h-full w-full ${className}`} />;
}
