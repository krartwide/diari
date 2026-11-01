"use client";

import { useEffect, useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function LoginForm() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/play";
  const [google, setGoogle] = useState(false);
  const [github, setGithub] = useState(false);
  const [local, setLocal] = useState(false);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("kekekim75@gmail.com");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/login-options")
      .then((response) => response.json())
      .then((data: { google?: boolean; github?: boolean; local?: boolean }) => {
        setGoogle(Boolean(data.google));
        setGithub(Boolean(data.github));
        setLocal(Boolean(data.local));
        setReady(true);
      })
      .catch(() => setReady(true));
  }, []);

  async function oauthSignIn(provider: "google" | "github") {
    setBusy(true);
    setError("");
    await signIn(provider, { callbackUrl });
  }

  async function localSignIn(event?: React.FormEvent) {
    event?.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await signIn("site-login", {
        email: email.trim(),
        password,
        name: name.trim(),
        redirect: false,
        callbackUrl,
      });
      if (!result || result.error) {
        setError("로그인하지 못했습니다. 이메일과 사이트 비밀번호를 확인해 주세요.");
        setBusy(false);
        return;
      }
      const next = callbackUrl.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : "/play";
      window.location.assign(next);
    } catch {
      setError("로그인 요청이 실패했습니다. 잠시 후 다시 시도해 주세요.");
      setBusy(false);
    }
  }

  const hasOauth = google || github;

  return (
    <main className="mx-auto grid w-full min-w-0 max-w-lg gap-6 px-4 py-12">
      <div>
        <p className="text-xs tracking-[0.18em] text-primary">계정</p>
        <h1 className="font-heading text-4xl">로그인</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          경기를 시작하려면 로그인이 필요합니다. Google Cloud가 없어도 GitHub 로그인이나 사이트 비밀번호로 들어올 수 있습니다. 운영자 이메일로 들어오면 공개 팀을 고칠 수 있습니다.
        </p>
      </div>

      {error && <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">{error}</p>}
      {!ready && <p className="text-sm text-muted-foreground">로그인 방법을 확인하는 중입니다.</p>}

      {ready && (
        <div className="grid gap-3">
          {google && (
            <Button type="button" className="h-11" onClick={() => oauthSignIn("google")} disabled={busy}>
              Google로 계속하기
            </Button>
          )}
          {github && (
            <Button type="button" variant={google ? "secondary" : "default"} className="h-11" onClick={() => oauthSignIn("github")} disabled={busy}>
              GitHub로 계속하기
            </Button>
          )}
        </div>
      )}

      {ready && local && (
        <form onSubmit={localSignIn} className="grid gap-3 rounded-2xl border border-border bg-card p-4">
          <div>
            <p className="text-sm font-medium">사이트 비밀번호로 로그인</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              이메일만으로는 안 됩니다. 서버 `.env`의 `AUTH_SITE_PASSWORD`가 필요합니다. 운영자는 `kekekim75@gmail.com`으로 들어오면 됩니다.
            </p>
          </div>
          <label className="grid gap-1 text-xs">
            <span className="text-muted-foreground">이메일</span>
            <Input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="kekekim75@gmail.com" />
          </label>
          <label className="grid gap-1 text-xs">
            <span className="text-muted-foreground">사이트 비밀번호</span>
            <Input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="AUTH_SITE_PASSWORD" autoComplete="current-password" />
          </label>
          <label className="grid gap-1 text-xs">
            <span className="text-muted-foreground">이름 (선택)</span>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="다이아리" />
          </label>
          <Button type="submit" disabled={busy || !email.trim() || !password}>
            {busy ? "로그인하는 중" : "이 계정으로 계속"}
          </Button>
        </form>
      )}

      {ready && !hasOauth && !local && (
        <div className="rounded-2xl border border-border bg-card p-4 text-sm leading-6 text-muted-foreground">
          로그인 방법이 아직 없습니다. `.env`에 `AUTH_SITE_PASSWORD`(8자 이상)를 넣거나, GitHub/Google OAuth 키를 설정한 뒤 서버를 다시 시작하세요.
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
