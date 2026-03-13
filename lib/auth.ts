import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

const allowDangerousEmailAccountLinking =
  process.env.ALLOW_DANGEROUS_EMAIL_ACCOUNT_LINKING !== "false";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost:
    process.env.AUTH_TRUST_HOST === "true" || process.env.NODE_ENV !== "production",
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  providers: [
    ...(googleClientId && googleClientSecret
      ? [
          GoogleProvider({
            clientId: googleClientId,
            clientSecret: googleClientSecret,
            allowDangerousEmailAccountLinking,
            profile(profile) {
              return {
                id: profile.sub,
                name: profile.name,
                email: profile.email,
                image: profile.picture,
                username: profile.email
                  .split("@")[0]
                  .toLowerCase()
                  .replace(/[^a-z0-9_]/g, "_"),
              };
            },
          }),
        ]
      : []),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.hashedPassword) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.hashedPassword
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          username: user.username,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, trigger }) {
      if (user) {
        token.id = user.id;
        token.username = (user as { username?: string }).username;
        token.name = user.name;
        token.picture = user.image;
      }

      if (account?.provider !== "credentials" && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { id: true, username: true, name: true, image: true },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.username = dbUser.username;
          token.name = dbUser.name;
          token.picture = dbUser.image;
        }
      }

      // Keep token profile fields in sync after edits (e.g. username change).
      // Throttle the DB lookup to reduce load.
      const now = Date.now();
      const lastSync = typeof (token as any).profileSyncAt === "number" ? (token as any).profileSyncAt : 0;
      const shouldSync = trigger === "update" || !lastSync || now - lastSync > 60_000;
      if (shouldSync && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { username: true, name: true, image: true },
        });
        if (dbUser) {
          token.username = dbUser.username;
          token.name = dbUser.name;
          token.picture = dbUser.image;
          (token as any).profileSyncAt = now;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session.user as { username?: string }).username = token.username as string;
        if (typeof token.name === "string") session.user.name = token.name;
        if (typeof token.picture === "string") session.user.image = token.picture;
      }
      return session;
    },
    async signIn({ user, account }) {
      if (account?.provider !== "credentials") {
        const email = user.email;
        if (!email) return false;

        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (!existingUser) {
          const baseUsername = email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "_");
          let username = baseUsername;
          let counter = 1;

          while (await prisma.user.findUnique({ where: { username } })) {
            username = `${baseUsername}${counter}`;
            counter++;
          }

          await prisma.user.create({
            data: {
              email,
              username,
              name: user.name,
              image: user.image,
            },
          });
        }
      }
      return true;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
