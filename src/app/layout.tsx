import type { Metadata } from "next";
import { Black_Han_Sans, IBM_Plex_Sans_KR, Noto_Serif_KR } from "next/font/google";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const sans = IBM_Plex_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  preload: false,
  display: "swap",
});

const serif = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-scorebook",
  preload: false,
  display: "swap",
});

const display = Black_Han_Sans({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-mark",
  preload: false,
  display: "swap",
});

export const metadata: Metadata = {
  title: "다이아리",
  description: "팀을 만들고 공 하나까지 기록으로 남는 야구 경기를 치릅니다.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`dark ${sans.variable} ${serif.variable} ${display.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>
          <SiteHeader />
          <div className="flex-1">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
