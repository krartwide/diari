import { NextResponse } from "next/server";
import { isValidSyncCode, readSyncVault, writeSyncVault, type SyncPayload } from "@/lib/sync-server";

function codeFrom(request: Request) {
  const header = request.headers.get("x-diari-sync")?.trim() ?? "";
  if (header) return header;
  const url = new URL(request.url);
  return url.searchParams.get("code")?.trim() ?? "";
}

function corsHeaders(request: Request) {
  const origin = request.headers.get("origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, x-diari-sync",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(request: Request, body: unknown, init?: { status?: number }) {
  return NextResponse.json(body, { status: init?.status, headers: corsHeaders(request) });
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export async function GET(request: Request) {
  const code = codeFrom(request);
  if (!isValidSyncCode(code)) {
    return json(request, { error: "저장 코드가 필요합니다." }, { status: 400 });
  }
  const payload = await readSyncVault(code);
  if (!payload) {
    return json(request, { empty: true, payload: null });
  }
  return json(request, { empty: false, payload });
}

export async function PUT(request: Request) {
  const code = codeFrom(request);
  if (!isValidSyncCode(code)) {
    return json(request, { error: "저장 코드가 필요합니다." }, { status: 400 });
  }
  const body = (await request.json().catch(() => null)) as { payload?: SyncPayload } | null;
  if (!body?.payload || body.payload.version !== 1) {
    return json(request, { error: "동기화 내용이 올바르지 않습니다." }, { status: 400 });
  }
  try {
    const saved = await writeSyncVault(code, body.payload);
    return json(request, { ok: true, payload: saved });
  } catch (caught) {
    return json(
      request,
      { error: caught instanceof Error ? caught.message : "저장하지 못했습니다." },
      { status: 400 },
    );
  }
}
