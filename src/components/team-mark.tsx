import { contrastText } from "@/lib/stats";

export function TeamMark({
  name,
  shortName,
  primary,
  secondary,
  logo,
  size = 56,
}: {
  name?: string;
  shortName: string;
  primary: string;
  secondary: string;
  logo?: string | null;
  size?: number;
}) {
  if (logo) {
    return (
      <>
        {/* User logos are local data URLs, so the image optimizer does not apply. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo}
          alt={name ? `${name} 엠블럼` : ""}
          width={size}
          height={size}
          className="rounded-full object-cover ring-2"
          style={{ width: size, height: size, boxShadow: `0 0 0 2px ${secondary}` }}
        />
      </>
    );
  }
  const letters = (shortName || name || "팀").slice(0, 3);
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={name ?? shortName}>
      <circle cx="32" cy="32" r="30" fill={primary} stroke={secondary} strokeWidth="3" />
      <circle cx="32" cy="32" r="23" fill="none" stroke={secondary} strokeWidth="1.2" opacity="0.85" />
      <path d="M32 12l3.2 7.4 8 .7-6 5.2 1.8 7.7L32 29.2 25 33l1.8-7.7-6-5.2 8-.7z" fill={secondary} opacity="0.9" />
      <text
        x="32"
        y="48"
        textAnchor="middle"
        fontSize={letters.length > 2 ? 11 : 13}
        fontWeight="700"
        fill={contrastText(primary)}
      >
        {letters}
      </text>
    </svg>
  );
}
