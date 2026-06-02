import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { Role } from "@prisma/client";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password required");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { department: true, company: true },
        });

        if (!user) {
          throw new Error("No user found with this email");
        }

        if (!user.active) {
          throw new Error("Your account has been deactivated");
        }

        if (user.reportingOnly) {
          throw new Error("This account is for reporting purposes only and cannot log in");
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isValidPassword) {
          throw new Error("Invalid password");
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          departmentId: user.departmentId,
          companyId: user.companyId,
          responsiblePersonId: user.responsiblePersonId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.departmentId = (user as any).departmentId;
        token.companyId = (user as any).companyId;
        token.responsiblePersonId = (user as any).responsiblePersonId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).departmentId = token.departmentId;
        (session.user as any).companyId = token.companyId;
        (session.user as any).responsiblePersonId = token.responsiblePersonId;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export function hasRole(userRole: Role, allowedRoles: Role[]): boolean {
  return allowedRoles.includes(userRole);
}

export function canEdit(userRole: Role): boolean {
  return hasRole(userRole, [Role.REPORTER, Role.SAFETY_OFFICER, Role.MANAGER, Role.ADMIN, Role.CONTRACTOR]);
}

export function canManage(userRole: Role): boolean {
  return hasRole(userRole, [Role.SAFETY_OFFICER, Role.MANAGER, Role.ADMIN]);
}

export function isAdmin(userRole: Role): boolean {
  return userRole === Role.ADMIN;
}
