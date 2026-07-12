import type { CSSProperties } from "react";

// Lucide-style stroke icons from the MedKey design handoff. currentColor + round caps.
const P: Record<string, string[]> = {
  globe: ["M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18|circle:12,12,9|M3 12h18"],
  arrow: ["M5 12h14M13 6l6 6-6 6"],
  chev: ["M9 6l6 6-6 6"],
  back: ["M19 12H5M11 6l-6 6 6 6"],
  clock: ["circle:12,12,9|M12 7v5l3 2"],
  check: ["M20 6 9 17l-5-5"],
  plus: ["M12 5v14M5 12h14"],
  book: ["M12 6.5C10 5 6.5 5 4 5v13c2.5 0 6 0 8 1.5 2-1.5 5.5-1.5 8-1.5V5c-2.5 0-6 0-8 1.5z|M12 6.5V20"],
  badge: ["M9 11l2 2 4-4|M21 12a9 9 0 1 1-6.2-8.5"],
  route: ["circle:6,6,2.5|circle:18,18,2.5|M8.5 6H15a3 3 0 0 1 3 3v6.5"],
  help: ["circle:12,12,9|M9.2 9.3a3 3 0 0 1 5.5 1.5c0 2-2.7 2.5-2.7 3.7|M12 17.5v.01"],
  layers: ["M12 3 3 8l9 5 9-5-9-5z|M3 13l9 5 9-5"],
  target: ["circle:12,12,8|circle:12,12,3|M12 4v2M12 18v2M4 12h2M18 12h2"],
  flask: ["M9 3h6M10 3v6.5l-4.6 8.2A2 2 0 0 0 7.2 21h9.6a2 2 0 0 0 1.8-3.3L14 9.5V3|M8 15h8"],
  bookmark: ["M6 3h12v18l-6-4-6 4z"],
  download: ["M12 3v12M8 11l4 4 4-4|M5 21h14"],
  expand: ["M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"],
  cell: ["circle:12,12,9|circle:12,11,3|circle:8,15,1.3|circle:16,14.5,1"],
  key: ["circle:8,14,4|M11 11 20 2M17 5l2 2M14 8l2 2"],
  info: ["circle:12,12,9|M12 8v.01M11 12h1v4h1"],
  refresh: ["M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5|M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"],
  send: ["M22 2 11 13M22 2l-7 20-4-9-9-4z"],
  shield: ["M12 3l7 3v6c0 4-3 7-7 8-4-1-7-4-7-8V6z|M9.5 12l2 2 3.5-4"],
  cap: ["M22 9 12 5 2 9l10 4 10-4z|M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"],
  atom: ["circle:12,12,3|M12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M16 16l2 2M6 18l2-2M16 8l2-2"],
  lamp: ["M12 3a7 7 0 0 1 4 12.7V18a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-2.3A7 7 0 0 1 12 3z|M9 21h6"],
};

function render(seg: string, i: number) {
  if (seg.startsWith("circle:")) {
    const [cx, cy, r] = seg.slice(7).split(",");
    return <circle key={i} cx={cx} cy={cy} r={r} />;
  }
  return <path key={i} d={seg} />;
}

export function Icon({
  name, size = 20, sw = 1.8, stroke = "currentColor", fill = "none", style,
}: { name: keyof typeof P | string; size?: number; sw?: number; stroke?: string; fill?: string; style?: CSSProperties }) {
  const segs = (P[name] ?? [""])[0].split("|");
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={sw}
      strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", ...style }}>
      {segs.map(render)}
    </svg>
  );
}
