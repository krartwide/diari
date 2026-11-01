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
