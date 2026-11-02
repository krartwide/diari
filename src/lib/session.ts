import { ensureSoloUser } from "@/lib/solo";

export async function requireUserId() {
  const user = await ensureSoloUser();
  return user.id;
}

export async function currentSession() {
  const user = await ensureSoloUser();
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      admin: true,
    },
  };
}

export async function requireUser() {
  const user = await ensureSoloUser();
  return {
    id: user.id,
    email: user.email ?? null,
    name: user.name ?? null,
    image: user.image ?? null,
    admin: true,
  };
}
