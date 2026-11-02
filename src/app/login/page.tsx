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
  const [mode, setMode] = useState<"login" | "register">("login");
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("kekekim75@gmail.com");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    fetch("/api/login-options")
      .then((response) => response.json())
      .then((data: { google?: boolean; github?: boolean }) => {
        setGoogle(Boolean(data.google));
        setGithub(Boolean(data.github));
        setReady(true);
      })
      .catch(() => setReady(true));
  }, []);

  async function oauthSignIn(provider: "google" | "github") {
    setBusy(true);
    setError("");
    await signIn(provider, { callbackUrl });
  }

  async function finishSignIn() {
    const result = await signIn("site-login", {
      email: email.trim(),
      password,
      name: name.trim(),
      redirect: false,
      callbackUrl,
    });
    if (!result || result.error) {
      setError(
        mode === "register"
          ? "가입은 됐지만 자동 로그인에 실패했습니다. 같은 비밀번호로 다시 로그인해 주세요."
          : "이메일 또는 비밀번호가 올바르지 않습니다.",
      );
      setBusy(false);
      return;
    }
    const next = callbackUrl.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : "/play";
    window.location.assign(next);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setInfo("");

    try {
      if (mode === "register") {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim(),
            password,
            name: name.trim(),
          }),
        });
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        if (!response.ok) {
          setError(data.error || "가입에 실패했습니다.");
          setBusy(false);
          return;
        }
        setInfo("계정을 만들었습니다. 바로 로그인합니다.");
      }
      await finishSignIn();
    } catch {
      setError("요청이 실패했습니다. 잠시 후 다시 시도해 주세요.");
      setBusy(false);
    }
  }

  const hasOauth = google || github;

  return (
    <main className="mx-auto grid w-full min-w-0 max-w-lg gap-6 px-4 py-12">
      <div>
        <p className="text-xs tracking-[0.18em] text-primary">계정</p>
        <h1 className="font-heading text-4xl">{mode === "login" ? "로그인" : "가입"}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          GitHub 로그인 없이 이메일과 비밀번호로 바로 이용합니다. 운영자 이메일(
          kekekim75@gmail.com)로 들어오면 공개 팀을 고칠 수 있습니다.
        </p>
      </div>

      {error && <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">{error}</p>}
      {info && <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">{info}</p>}
      {!ready && <p className="text-sm text-muted-foreground">로그인 화면을 준비하는 중입니다.</p>}

      {ready && hasOauth && (
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

      {ready && (
        <form onSubmit={onSubmit} className="grid gap-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === "login" ? "default" : "secondary"}
              className="flex-1"
              onClick={() => {
                setMode("login");
                setError("");
                setInfo("");
              }}
              disabled={busy}
            >
              로그인
            </Button>
            <Button
              type="button"
              variant={mode === "register" ? "default" : "secondary"}
              className="flex-1"
              onClick={() => {
                setMode("register");
                setError("");
                setInfo("");
              }}
              disabled={busy}
            >
              가입
            </Button>
          </div>

          <label className="grid gap-1 text-xs">
            <span className="text-muted-foreground">이메일</span>
            <Input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="kekekim75@gmail.com"
              autoComplete="email"
            />
          </label>
          <label className="grid gap-1 text-xs">
            <span className="text-muted-foreground">비밀번호 (8자 이상)</span>
            <Input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="직접 정한 비밀번호"
              autoComplete={mode === "register" ? "new-password" : "current-password"}
            />
          </label>
          {mode === "register" && (
            <label className="grid gap-1 text-xs">
              <span className="text-muted-foreground">이름 (선택)</span>
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="다이아리" autoComplete="nickname" />
            </label>
          )}
          <Button type="submit" disabled={busy || !email.trim() || password.length < 8}>
            {busy ? "처리 중" : mode === "register" ? "가입하고 시작" : "로그인"}
          </Button>
          <p className="text-xs leading-5 text-muted-foreground">
            이미 `.env`의 `AUTH_SITE_PASSWORD`로 쓰던 계정이면 그 비밀번호로도 로그인됩니다. 새로 가입하면 본인 비밀번호가 저장됩니다.
          </p>
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
