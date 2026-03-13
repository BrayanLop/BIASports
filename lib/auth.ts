import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

const facebookClientId = process.env.FACEBOOK_CLIENT_ID;
const facebookClientSecret = process.env.FACEBOOK_CLIENT_SECRET;

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
    ...(facebookClientId && facebookClientSecret
      ? [
          FacebookProvider({
            clientId: facebookClientId,
            clientSecret: facebookClientSecret,
            allowDangerousEmailAccountLinking,
            profile(profile) {
              return {
                id: profile.id,
                name: profile.name,
                email: profile.email,
                image: profile.picture?.data?.url,
                username: profile.email
                  ? profile.email
                      .split("@")[0]
                      .toLowerCase()
                      .replace(/[^a-z0-9_]/g, "_")
                  : `user_${profile.id}`,
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
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.username = (user as { username?: string }).username;
      }

      if (account?.provider !== "credentials" && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { id: true, username: true },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.username = dbUser.username;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session.user as { username?: string }).username = token.username as string;
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
