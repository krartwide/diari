"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function LoginForm() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/play";
  const [google, setGoogle] = useState(false);
  const [devLogin, setDevLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/login-options")
      .then((response) => response.json())
      .then((data: { google?: boolean; devLogin?: boolean }) => {
        setGoogle(Boolean(data.google));
        setDevLogin(Boolean(data.devLogin));
      })
      .catch(() => setDevLogin(true));
  }, []);

  async function googleSignIn() {
    setBusy(true);
    setError("");
    await signIn("google", { callbackUrl });
  }

  async function localSignIn(event?: React.FormEvent) {
    event?.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await signIn("dev-login", {
        email: email.trim(),
        name: name.trim(),
        redirect: false,
        callbackUrl,
      });
      if (!result || result.error) {
        setError("로그인하지 못했습니다. 이메일 형식을 확인해 주세요.");
        setBusy(false);
        return;
      }
      const next =
        callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
          ? callbackUrl
          : "/play";
      window.location.assign(next);
    } catch {
      setError("로그인 요청이 실패했습니다. 잠시 후 다시 시도해 주세요.");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto grid w-full min-w-0 max-w-lg gap-6 px-4 py-12">
      <div>
        <p className="text-xs tracking-[0.18em] text-primary">계정</p>
        <h1 className="font-heading text-4xl">로그인</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          경기를 시작하려면 로그인이 필요합니다. 한 번 로그인한 기기에서는 브라우저를 닫았다 열어도 같은 계정으로 이어집니다. 경기 기록과 업적은 계정마다 따로 저장됩니다.
        </p>
      </div>
      {error && <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">{error}</p>}
      {google && (
        <Button type="button" className="h-11" onClick={googleSignIn} disabled={busy}>
          Google로 계속하기
        </Button>
      )}
      {!google && (
        <p className="rounded-xl border border-border bg-card px-3 py-2 text-xs leading-5 text-muted-foreground">
          이 서버에는 아직 Google OAuth 키가 없습니다. 아래 개발 로그인으로 계정을 만들고, 배포 환경에 `AUTH_GOOGLE_ID`와 `AUTH_GOOGLE_SECRET`을 넣으면 Google 버튼이 켜집니다.
        </p>
      )}
      {devLogin && (
        <form onSubmit={localSignIn} className="grid gap-3 rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-medium">개발 로그인</p>
          <label className="grid gap-1 text-xs">
            <span className="text-muted-foreground">이메일</span>
            <Input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
          </label>
          <label className="grid gap-1 text-xs">
            <span className="text-muted-foreground">이름</span>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="다이아리" />
          </label>
          <Button type="button" disabled={busy || !email.trim()} onClick={() => localSignIn()}>
            {busy ? "로그인하는 중" : "이 계정으로 계속"}
          </Button>
        </form>
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
