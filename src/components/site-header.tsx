"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthMenu } from "@/components/auth-menu";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/teams", label: "구단" },
  { href: "/play", label: "경기" },
  { href: "/games", label: "기록" },
  { href: "/achievements", label: "업적" },
];

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header
      className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex h-12 w-full min-w-0 max-w-6xl items-center gap-2 px-3 sm:h-14 sm:gap-3 sm:px-4">
        <Link href="/" className="shrink-0 font-heading text-xl tracking-wide text-primary sm:text-2xl">
          다이아리
        </Link>
        <nav className="ml-auto hidden items-center gap-1 text-sm md:flex">
          {LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-full px-3 py-1.5 whitespace-nowrap text-muted-foreground hover:bg-muted hover:text-foreground",
                  active && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto md:ml-0">
          <AuthMenu compact />
        </div>
      </div>
    </header>
  );
}
