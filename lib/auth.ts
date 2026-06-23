import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import type { UserRole } from '@prisma/client';
import { comparePassword } from '@/lib/password';
import { consumeImpersonationToken } from '@/lib/platform/impersonate';
import { prisma } from '@/lib/prisma';
import { loginSchema } from '@/lib/validations/platform';

type CompanyAuthUser = {
  kind: 'company';
  id: string;
  companyId: string;
  role: UserRole;
  impersonatedByPlatformAdminId?: string;
};

type PlatformAuthUser = {
  kind: 'platform';
  id: string;
  email: string;
};

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      id: 'company-credentials',
      name: 'Company',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async () => null,
    }),
    Credentials({
      id: 'platform-credentials',
      name: 'Platform',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials) => {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const { email, password } = parsed.data;
        const admin = await prisma.platformAdmin.findUnique({
          where: { email: email.toLowerCase().trim() },
        });

        if (!admin) {
          return null;
        }

        const isValid = await comparePassword(password, admin.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          kind: 'platform' as const,
          id: admin.id,
          email: admin.email,
        };
      },
    }),
    Credentials({
      id: 'impersonation',
      name: 'Impersonation',
      credentials: {
        token: { label: 'Token', type: 'text' },
      },
      authorize: async (credentials) => {
        const token = credentials?.token;
        if (typeof token !== 'string' || token.length === 0) {
          return null;
        }

        const data = consumeImpersonationToken(token);
        if (!data) {
          return null;
        }

        const user = await prisma.user.findFirst({
          where: {
            id: data.userId,
            companyId: data.companyId,
          },
          select: {
            id: true,
            companyId: true,
            role: true,
          },
        });

        if (!user) {
          return null;
        }

        return {
          kind: 'company' as const,
          id: user.id,
          companyId: user.companyId,
          role: user.role,
          impersonatedByPlatformAdminId: data.platformAdminId,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    jwt({ token, user }) {
      if (!user) {
        return token;
      }

      const authUser = user as CompanyAuthUser | PlatformAuthUser;
      token.kind = authUser.kind;

      if (authUser.kind === 'company') {
        token.userId = authUser.id;
        token.companyId = authUser.companyId;
        token.role = authUser.role;
        if (authUser.impersonatedByPlatformAdminId) {
          token.impersonatedByPlatformAdminId =
            authUser.impersonatedByPlatformAdminId;
        }
      } else {
        token.adminId = authUser.id;
        token.email = authUser.email;
      }

      return token;
    },
    session({ session, token }) {
      const {
        kind,
        userId,
        adminId,
        companyId,
        role,
        email,
        impersonatedByPlatformAdminId,
      } = token;

      if (kind === 'company' && userId && companyId && role) {
        session.kind = 'company';
        session.user = {
          ...session.user,
          id: userId,
          companyId,
          role,
          ...(impersonatedByPlatformAdminId
            ? { impersonatedByPlatformAdminId }
            : {}),
        };
      } else if (kind === 'platform' && adminId && email) {
        session.kind = 'platform';
        session.admin = {
          id: adminId,
          email,
        };
      }

      return session;
    },
  },
});
