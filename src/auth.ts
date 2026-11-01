import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { isAdminEmail } from "@/lib/admin";

const googleReady = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
const githubReady = Boolean(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET);
const sitePassword = (process.env.AUTH_SITE_PASSWORD ?? "").trim();
const localLoginReady = sitePassword.length >= 8;

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
    ...(githubReady
      ? [
          GitHub({
            clientId: process.env.AUTH_GITHUB_ID!,
            clientSecret: process.env.AUTH_GITHUB_SECRET!,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    ...(localLoginReady
      ? [
          Credentials({
            id: "site-login",
            name: "사이트 로그인",
            credentials: {
              email: { label: "이메일", type: "email" },
              password: { label: "사이트 비밀번호", type: "password" },
              name: { label: "이름", type: "text" },
            },
            async authorize(credentials) {
              const emailRaw = String(credentials?.email ?? "").trim().toLowerCase();
              const password = String(credentials?.password ?? "");
              const nameRaw = String(credentials?.name ?? "").trim();
              if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) return null;
              if (password !== sitePassword) return null;
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
      const email = typeof token.email === "string" ? token.email : null;
      token.admin = isAdminEmail(email);
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        if (typeof token.email === "string") session.user.email = token.email;
        if (typeof token.name === "string") session.user.name = token.name;
        if (typeof token.picture === "string") session.user.image = token.picture;
        session.user.admin = Boolean(token.admin);
      }
      return session;
    },
  },
});

export function googleAuthEnabled() {
  return googleReady;
}

export function githubAuthEnabled() {
  return githubReady;
}

export function localLoginEnabled() {
  return localLoginReady;
}
