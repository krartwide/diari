import { NextResponse } from "next/server";
import { currentSession } from "@/lib/session";

export async function GET() {
  const session = await currentSession();
  if (!session?.user?.id) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({
    user: {
      id: session.user.id,
      name: session.user.name ?? null,
      email: session.user.email ?? null,
      image: session.user.image ?? null,
    },
  });
}
