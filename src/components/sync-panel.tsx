"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSyncCode, lastSyncAt, setSyncCode, syncNow } from "@/lib/sync-client";

export function SyncPanel() {
  const [code, setCode] = useState("");
  const [draft, setDraft] = useState("");
  const [last, setLast] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const current = await getSyncCode();
      setCode(current);
      setDraft(current);
      setLast(await lastSyncAt());
    })();
  }, []);

  async function runSync() {
    setBusy(true);
    setMessage("");
    try {
      const result = await syncNow();
      setMessage(result.message);
      setLast(await lastSyncAt());
      setCode(await getSyncCode());
      setDraft(await getSyncCode());
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "동기화하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function adoptCode() {
    setBusy(true);
    setMessage("");
    try {
      const next = await setSyncCode(draft);
      setCode(next);
      const result = await syncNow();
      setMessage(result.message);
      setLast(await lastSyncAt());
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "코드를 적용하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setMessage("저장 코드를 복사했습니다. 다른 기기에 붙여 넣으세요.");
    } catch {
      setMessage("복사에 실패했습니다. 코드를 길게 눌러 복사해 주세요.");
    }
  }

  return (
    <section className="grid gap-3 rounded-2xl border border-border bg-card p-4">
      <div>
        <h2 className="text-lg font-semibold">기기 동기화</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          저장 코드를 다른 폰·PC에 넣으면 경기·팀·업적이 같은 클라우드 금고로 맞춰집니다. 코드를 아는 사람만 기록을 볼 수 있으니 공유에 주의하세요.
        </p>
      </div>
      <label className="grid gap-1 text-xs text-muted-foreground">
        저장 코드
        <Input value={draft} onChange={(event) => setDraft(event.target.value.trim())} spellCheck={false} className="font-mono text-sm" />
      </label>
      <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
        <Button type="button" className="h-11 sm:h-10" onClick={runSync} disabled={busy || !code}>
          {busy ? "동기화 중" : "지금 동기화"}
        </Button>
        <Button type="button" variant="secondary" className="h-11 sm:h-10" onClick={copyCode} disabled={!code}>
          코드 복사
        </Button>
        <Button type="button" variant="outline" className="h-11 sm:h-10" onClick={adoptCode} disabled={busy || draft === code}>
          이 코드로 연결
        </Button>
      </div>
      {last && (
        <p className="text-xs text-muted-foreground">
          마지막 동기화: {new Date(last).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} (Asia/Seoul)
        </p>
      )}
      {message && <p className="text-sm leading-6 text-muted-foreground">{message}</p>}
    </section>
  );
}
