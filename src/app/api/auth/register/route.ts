import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  let body: { email?: string; password?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const name = String(body.name ?? "").trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "이메일 형식을 확인해 주세요." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "비밀번호는 8자 이상이어야 합니다." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing?.passwordHash) {
    return NextResponse.json({ error: "이미 가입된 이메일입니다. 로그인하세요." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: {
          passwordHash,
          name: name || existing.name || email.split("@")[0] || "다이아리",
          emailVerified: existing.emailVerified ?? new Date(),
        },
      })
    : await prisma.user.create({
        data: {
          email,
          name: name || email.split("@")[0] || "다이아리",
          emailVerified: new Date(),
          passwordHash,
        },
      });

  return NextResponse.json({
    ok: true,
    email: user.email,
    name: user.name,
  });
}
