import type { PitchEvent } from "@/lib/types";

const CALL_COLOR: Record<string, string> = {
  ball: "#8d8474",
  called_strike: "#c9842a",
  swinging_strike: "#c23b2e",
  foul: "#2f7d4a",
  in_play: "#f7f1e4",
  hbp: "#d36a1e",
};

function px(x: number) {
  return 110 + x * 78;
}

function py(y: number) {
  return 36 + (1 - y) * 176;
}

export function StrikeZone({
  pitches,
  activeId,
  onSelect,
}: {
  pitches: PitchEvent[];
  activeId?: string;
  onSelect?: (pitch: PitchEvent) => void;
}) {
  return (
    <svg viewBox="0 0 220 250" className="w-full max-w-[280px]" role="img" aria-label="스트라이크 존">
      <rect x="8" y="8" width="204" height="234" rx="12" fill="#1b3a2c" />
      <rect x={px(-0.5)} y={py(0.74)} width={px(0.5) - px(-0.5)} height={py(0.28) - py(0.74)} fill="none" stroke="#f4efe2" strokeWidth="1.6" />
      <path d="M92 214h36l-6 14h-24z" fill="#f4efe2" />
      {pitches.map((pitch) => {
        const active = pitch.id === activeId;
        return (
          <g key={pitch.id} onClick={() => onSelect?.(pitch)} className={onSelect ? "cursor-pointer" : undefined}>
            <circle
              cx={px(pitch.x)}
              cy={py(pitch.y)}
              r={active ? 8 : 6}
              fill={CALL_COLOR[pitch.call] ?? "#ddd"}
              stroke={pitch.call === "in_play" ? "#c23b2e" : "#10241b"}
              strokeWidth={active ? 2.4 : 1}
            />
            <text x={px(pitch.x)} y={py(pitch.y) + 3} textAnchor="middle" fontSize="8" fill="#1b3a2c" fontWeight="700">
              {pitch.number}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
