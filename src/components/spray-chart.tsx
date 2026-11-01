import type { BattedBall } from "@/lib/types";

export function SprayChart({ ball }: { ball: BattedBall }) {
  const rad = (ball.angle * Math.PI) / 180;
  const dist = Math.min(ball.distance, 140) * 1.45;
  const x = 160 + Math.sin(rad) * dist;
  const y = 248 - Math.cos(rad) * dist;
  return (
    <svg viewBox="0 0 320 280" className="w-full" role="img" aria-label="타구 방향">
      <rect width="320" height="280" rx="12" fill="#1b3a2c" />
      <path d="M160 248 L28 70 A150 150 0 0 1 292 70 Z" fill="#24563a" />
      <path d="M160 248 L70 150 A70 70 0 0 1 250 150 Z" fill="#c6a15a" opacity="0.85" />
      <path d="M160 248 L28 70" stroke="#f4efe2" strokeWidth="1.2" />
      <path d="M160 248 L292 70" stroke="#f4efe2" strokeWidth="1.2" />
      <path d="M92 214h36l-6 14h-24z" fill="#f4efe2" transform="translate(50 20)" />
      <line x1="160" y1="248" x2={x} y2={y} stroke="#f2d48a" strokeWidth="1.4" />
      <circle cx={x} cy={y} r="7" fill="#f4efe2" stroke="#c23b2e" strokeWidth="2" />
      <text x="16" y="24" fill="#f4efe2" fontSize="12">
        {ball.direction} · {ball.distance}m · {ball.ev}km
      </text>
      <text x="16" y="42" fill="#d9c7a2" fontSize="11">
        발사각 {ball.la}° · {ball.resultLabel}
      </text>
    </svg>
  );
}
