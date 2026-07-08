import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import type { UserRole } from '@prisma/client';
import { BlockedCompanyError, BlockedUserError } from '@/lib/auth/authErrors';
import { writeEvent } from '@/lib/events';
import { comparePassword } from '@/lib/password';
import {
  consumeImpersonationToken,
  consumeRestoreToken,
} from '@/lib/platform/impersonate';
import { prisma } from '@/lib/prisma';
import { loginSchema as companyLoginSchema } from '@/lib/validations/auth';
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
      authorize: async (credentials) => {
        const parsed = companyLoginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase().trim() },
          include: { company: true },
        });

        if (!user) {
          return null;
        }

        const isValid = await comparePassword(password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        if (user.isBlocked) {
          throw new BlockedUserError();
        }
        if (user.company.isBlocked) {
          throw new BlockedCompanyError();
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });
        await writeEvent(user.companyId, 'LOGIN', { userId: user.id });

        return {
          kind: 'company' as const,
          id: user.id,
          companyId: user.companyId,
          role: user.role,
        };
      },
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
        const admin = await prisma.platformAdmin.findFirst({
          where: {
            email: email.toLowerCase().trim(),
            isActive: true,
            deletedAt: null,
          },
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
    Credentials({
      id: 'platform-restore',
      name: 'PlatformRestore',
      credentials: {
        token: { label: 'Token', type: 'text' },
      },
      authorize: async (credentials) => {
        const token = credentials?.token;
        if (typeof token !== 'string' || token.length === 0) {
          return null;
        }

        const platformAdminId = consumeRestoreToken(token);
        if (!platformAdminId) {
          return null;
        }

        const admin = await prisma.platformAdmin.findFirst({
          where: {
            id: platformAdminId,
            isActive: true,
            deletedAt: null,
          },
        });

        if (!admin) {
          return null;
        }

        return {
          kind: 'platform' as const,
          id: admin.id,
          email: admin.email,
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
