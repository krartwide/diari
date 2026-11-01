"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";

function LoginForm() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/play";
  const [google, setGoogle] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/login-options")
      .then((response) => response.json())
      .then((data: { google?: boolean }) => setGoogle(Boolean(data.google)))
      .catch(() => setGoogle(false));
  }, []);

  async function googleSignIn() {
    setBusy(true);
    setError("");
    await signIn("google", { callbackUrl });
  }

  return (
    <main className="mx-auto grid w-full min-w-0 max-w-lg gap-6 px-4 py-12">
      <div>
        <p className="text-xs tracking-[0.18em] text-primary">계정</p>
        <h1 className="font-heading text-4xl">로그인</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          경기를 시작하려면 Google 계정으로 로그인하세요. 한 번 로그인한 기기에서는 브라우저를 닫았다 열어도 같은 계정으로 이어집니다. 경기 기록과 업적은 계정마다 따로 저장됩니다.
        </p>
      </div>
      {error && <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">{error}</p>}
      {google === null && <p className="text-sm text-muted-foreground">로그인 방법을 확인하는 중입니다.</p>}
      {google === true && (
        <Button type="button" className="h-11" onClick={googleSignIn} disabled={busy}>
          {busy ? "Google로 이동하는 중" : "Google로 계속하기"}
        </Button>
      )}
      {google === false && (
        <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 text-sm leading-6">
          <p className="font-medium">Google 로그인이 아직 준비되지 않았습니다</p>
          <p className="text-muted-foreground">
            서버 `.env`에 `AUTH_GOOGLE_ID`와 `AUTH_GOOGLE_SECRET`을 넣어야 합니다. Google Cloud Console에서 OAuth 클라이언트를 만든 뒤, 승인된 리디렉션 URI에 아래 주소를 추가하세요.
          </p>
          <code className="break-all rounded-lg bg-muted px-3 py-2 text-xs">
            http://127.0.0.1:43123/api/auth/callback/google
          </code>
          <p className="text-xs text-muted-foreground">
            배포 도메인을 쓰면 `https://당신의도메인/api/auth/callback/google`도 함께 등록하세요. 키를 넣은 뒤 서버를 다시 시작하면 Google 버튼이 나타납니다.
          </p>
        </div>
      )}
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="px-4 py-8 text-sm text-muted-foreground">로그인 화면을 준비하는 중입니다.</main>}>
      <LoginForm />
    </Suspense>
  );
}
