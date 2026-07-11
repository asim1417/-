import type { SVGProps } from "react";
const base = (p: SVGProps<SVGSVGElement>) => ({
  width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
  strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, ...p,
});
export const IconHome = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M3 10.5 12 4l9 6.5"/><path d="M5 9.5V20h14V9.5"/><path d="M9.5 20v-5h5v5"/></svg>);
export const IconCompass = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><circle cx="12" cy="12" r="8.5"/><path d="m15 9-2 4-4 2 2-4z"/></svg>);
export const IconKey = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><circle cx="8" cy="8" r="4"/><path d="m11 11 7 7"/><path d="m15 15 2-2"/><path d="m18 18 2-2"/></svg>);
export const IconQuiz = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><rect x="4" y="3.5" width="16" height="17" rx="2.5"/><path d="M8 9h8M8 13h8M8 17h5"/></svg>);
export const IconRobot = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><rect x="4.5" y="8" width="15" height="11" rx="3"/><path d="M12 8V4.5M9 13h.01M15 13h.01M9.5 16.5h5"/></svg>);
export const IconPulse = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M3 12h4l2-5 3 10 2-5h7"/></svg>);
export const IconShield = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M12 3 5 6v6c0 4 3 6.5 7 9 4-2.5 7-5 7-9V6z"/><path d="m9 12 2 2 4-4"/></svg>);
