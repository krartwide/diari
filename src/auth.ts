import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isAdminEmail } from "@/lib/admin";

const googleReady = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
const githubReady = Boolean(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET);
const sitePassword = (process.env.AUTH_SITE_PASSWORD ?? "").trim();
const localLoginReady = true;

async function verifyPassword(password: string, passwordHash: string | null | undefined) {
  if (passwordHash) {
    return bcrypt.compare(password, passwordHash);
  }
  // Legacy shared site password (bootstrap / older installs)
  if (sitePassword.length >= 8 && password === sitePassword) {
    return true;
  }
  return false;
}

const useOauthAdapter = googleReady || githubReady;

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Prisma adapter is only needed for OAuth account linking. Credentials + JWT
  // stays adapter-free so sign-in cannot bounce on DB session writes.
  adapter: useOauthAdapter ? PrismaAdapter(prisma) : undefined,
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
    Credentials({
      id: "site-login",
      name: "이메일 로그인",
      credentials: {
        email: { label: "이메일", type: "email" },
        password: { label: "비밀번호", type: "password" },
        name: { label: "이름", type: "text" },
      },
      async authorize(credentials) {
        const emailRaw = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        const nameRaw = String(credentials?.name ?? "").trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) return null;
        if (password.length < 8) return null;

        let user = await prisma.user.findUnique({ where: { email: emailRaw } });

        if (!user) {
          // First login with shared site password creates the account.
          if (!(sitePassword.length >= 8 && password === sitePassword)) return null;
          const passwordHash = await bcrypt.hash(password, 10);
          user = await prisma.user.create({
            data: {
              email: emailRaw,
              name: nameRaw || emailRaw.split("@")[0] || "다이아리",
              emailVerified: new Date(),
              passwordHash,
            },
          });
        } else {
          const ok = await verifyPassword(password, user.passwordHash);
          if (!ok) return null;
          // Upgrade legacy shared-password accounts to a stored hash.
          if (!user.passwordHash && sitePassword.length >= 8 && password === sitePassword) {
            const passwordHash = await bcrypt.hash(password, 10);
            user = await prisma.user.update({
              where: { id: user.id },
              data: {
                passwordHash,
                name: nameRaw || user.name || undefined,
              },
            });
          } else if (nameRaw && nameRaw !== user.name) {
            user = await prisma.user.update({
              where: { id: user.id },
              data: { name: nameRaw },
            });
          }
        }

        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
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
