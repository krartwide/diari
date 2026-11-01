"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { parseAvg, parseIp, parseRate2, parseSwar, displayInnings } from "@/lib/stats";

function formatRate(value: number, places: 2 | 3) {
  if (!value) return "";
  return value.toFixed(places);
}

export function RateField({
  label,
  value,
  onChange,
  kind,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  kind: "avg" | "rate" | "swar" | "ip";
}) {
  const places = kind === "avg" ? 3 : 2;
  const shown = (n: number) => (kind === "ip" ? (n ? displayInnings(n) : "") : formatRate(n, places));
  const [text, setText] = useState(shown(value));

  return (
    <label className="grid gap-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <Input
        inputMode="decimal"
        value={text}
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => setText(event.target.value)}
        onBlur={(event) => {
          const raw = event.currentTarget.value;
          const parsed =
            kind === "avg" ? parseAvg(raw) : kind === "swar" ? parseSwar(raw) : kind === "ip" ? parseIp(raw) : parseRate2(raw);
          if (parsed == null) {
            setText(shown(value));
            return;
          }
          onChange(parsed);
          setText(kind === "ip" ? displayInnings(parsed) : parsed.toFixed(places));
        }}
      />
    </label>
  );
}

export function CountField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <Input
        inputMode="numeric"
        defaultValue={String(value)}
        key={value}
        onFocus={(event) => event.currentTarget.select()}
        onBlur={(event) => {
          const raw = event.currentTarget.value.trim();
          if (raw === "" || raw === "-" || !/^-?\d+$/.test(raw)) {
            event.currentTarget.value = String(value);
            return;
          }
          onChange(Number(raw));
        }}
      />
    </label>
  );
}
