import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

const googleReady = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
const allowDevLogin = process.env.ALLOW_DEV_LOGIN === "true" || !googleReady;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 60 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    ...(googleReady
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID!,
            clientSecret: process.env.AUTH_GOOGLE_SECRET!,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    ...(allowDevLogin
      ? [
          Credentials({
            id: "dev-login",
            name: "개발 로그인",
            credentials: {
              email: { label: "이메일", type: "email" },
              name: { label: "이름", type: "text" },
            },
            async authorize(credentials) {
              const emailRaw = String(credentials?.email ?? "").trim().toLowerCase();
              const nameRaw = String(credentials?.name ?? "").trim();
              if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) return null;
              const user = await prisma.user.upsert({
                where: { email: emailRaw },
                create: {
                  email: emailRaw,
                  name: nameRaw || emailRaw.split("@")[0] || "다이아리",
                  emailVerified: new Date(),
                },
                update: {
                  name: nameRaw || undefined,
                },
              });
              return { id: user.id, email: user.email, name: user.name, image: user.image };
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      if (user?.email) token.email = user.email;
      if (user?.name) token.name = user.name;
      if (user && "image" in user) token.picture = user.image;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        if (typeof token.email === "string") session.user.email = token.email;
        if (typeof token.name === "string") session.user.name = token.name;
        if (typeof token.picture === "string") session.user.image = token.picture;
      }
      return session;
    },
  },
});

export function googleAuthEnabled() {
  return googleReady;
}

export function devLoginEnabled() {
  return allowDevLogin;
}
