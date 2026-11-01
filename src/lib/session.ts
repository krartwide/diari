import { auth } from "@/auth";

export async function requireUserId() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  return id;
}

export async function currentSession() {
  return auth();
}

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? null,
    name: session.user.name ?? null,
    image: session.user.image ?? null,
    admin: Boolean(session.user.admin),
  };
}
