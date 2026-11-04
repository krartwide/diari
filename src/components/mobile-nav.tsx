"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/teams", label: "구단" },
  { href: "/play", label: "경기" },
  { href: "/games", label: "기록" },
  { href: "/achievements", label: "업적" },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "max(0.35rem, env(safe-area-inset-bottom))" }}
      aria-label="주요 메뉴"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-4 gap-1 px-2 pt-1.5">
        {LINKS.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex min-h-11 flex-col items-center justify-center rounded-xl px-1 text-[11px] font-medium tracking-wide",
                active ? "bg-primary/15 text-primary" : "text-muted-foreground",
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
