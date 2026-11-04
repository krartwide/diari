import { prisma } from "@/lib/prisma";

export const SOLO_EMAIL = "solo@local.diari";
export const SOLO_NAME = "다이아리";

/** Single local owner used when login is disabled. */
export async function ensureSoloUser() {
  return prisma.user.upsert({
    where: { email: SOLO_EMAIL },
    create: {
      email: SOLO_EMAIL,
      name: SOLO_NAME,
      emailVerified: new Date(),
    },
    update: {
      name: SOLO_NAME,
    },
  });
}
